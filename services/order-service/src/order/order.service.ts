import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import * as crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';

import { Sale, SaleStatus, PaymentStatus } from './entities/sale.entity.js';
import { SaleItem } from './entities/sale-item.entity.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
import { InventoryClientService } from './inventory-client.service.js';
import { PaystackService } from './paystack.service.js';

@Injectable()
export class OrderService {
  private readonly ensuredTenants = new Set<string>();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(TenantConnectionService)
    private readonly tenantConnectionService: TenantConnectionService,
    @Inject(InventoryClientService)
    private readonly inventoryClientService: InventoryClientService,
    @Inject(PaystackService)
    private readonly paystackService: PaystackService,
  ) {}

  private async ensureTenantSchema(tenantId: string): Promise<void> {
    if (this.ensuredTenants.has(tenantId)) return;
    const entities = [this.dataSource.getMetadata(Sale), this.dataSource.getMetadata(SaleItem)];
    await this.tenantConnectionService.ensureTenantTables(tenantId, entities);
    this.ensuredTenants.add(tenantId);
  }

  private async withScope<T>(tenantId: string, operation: (queryRunner: import("typeorm").QueryRunner) => Promise<T>): Promise<T> {
    await this.ensureTenantSchema(tenantId);
    return this.tenantConnectionService.withTenantScope(tenantId, operation);
  }

  async createSale(tenantId: string, dto: CreateSaleDto, bearerToken: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Sale must contain at least one item');
    }

    const saleReference = `SALE-${uuidv4().replace(/-/g, '').slice(0, 8)}`;
    let totalAmount = 0;
    for (const item of dto.items) {
      totalAmount += item.quantity * item.unitPrice;
    }

    return this.withScope(tenantId, async (queryRunner: import("typeorm").QueryRunner) => {
      const sale = queryRunner.manager.create(Sale, {
        id: uuidv4(),
        saleReference,
        status: SaleStatus.PENDING,
        totalAmount,
        paymentStatus: PaymentStatus.UNPAID,
        paystackReference: null,
      });
      const savedSale = await queryRunner.manager.save(sale);

      const saleItems = dto.items.map((item) =>
        queryRunner.manager.create(SaleItem, {
          id: uuidv4(),
          saleId: savedSale.id,
          productId: item.productId,
          productName: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }),
      );
      await queryRunner.manager.save(saleItems);

      const deducted: Array<{ productId: string; quantity: number }> = [];
      for (const item of dto.items) {
        try {
          await this.inventoryClientService.deductStock(
            tenantId,
            item.productId,
            item.quantity,
            saleReference,
            bearerToken,
          );
          deducted.push({ productId: item.productId, quantity: item.quantity });
        } catch (error) {
          for (const d of deducted) {
            try {
              await this.inventoryClientService.restoreStock(
                tenantId,
                d.productId,
                d.quantity,
                saleReference,
                bearerToken,
              );
            } catch {}
          }
          await queryRunner.manager.update(Sale, { id: savedSale.id }, { status: SaleStatus.FAILED });
          throw new BadRequestException(`Stock deduction failed for product ${item.productId}: ${(error as Error).message}`);
        }
      }

      await queryRunner.manager.update(Sale, { id: savedSale.id }, { status: SaleStatus.PENDING });

      return {
        saleId: savedSale.id,
        saleReference,
        status: SaleStatus.PENDING,
        totalAmount,
        paymentStatus: PaymentStatus.UNPAID,
        items: dto.items,
      };
    });
  }

  async initializePayment(tenantId: string, saleReference: string, userEmail: string) {
    return this.withScope(tenantId, async (queryRunner: import("typeorm").QueryRunner) => {
      const sale = await queryRunner.manager.findOne(Sale, { where: { saleReference } });
      if (!sale) {
        throw new NotFoundException('Sale not found');
      }
      if (sale.status !== SaleStatus.PENDING && sale.status !== SaleStatus.COMPLETED) {
        throw new BadRequestException('Sale must be pending or completed before payment');
      }
      if (sale.paymentStatus === PaymentStatus.PAID) {
        throw new BadRequestException('Sale already paid');
      }

      const amountInKobo = Math.round(Number(sale.totalAmount) * 100);
      const { authorizationUrl, reference } = await this.paystackService.initializePayment(
        userEmail,
        amountInKobo,
        saleReference,
      );

      await queryRunner.manager.update(Sale, { id: sale.id }, { paystackReference: reference });

      return { authorizationUrl, reference };
    });
  }

  async verifyPayment(tenantId: string, dto: VerifyPaymentDto) {
    return this.withScope(tenantId, async (queryRunner: import("typeorm").QueryRunner) => {
      const sale = await queryRunner.manager.findOne(Sale, { where: { paystackReference: dto.paystackReference } });
      if (!sale) {
        throw new NotFoundException('Sale not found');
      }

      const verified = await this.paystackService.verifyPayment(dto.paystackReference);
      if (verified.verified) {
        await queryRunner.manager.update(Sale, { id: sale.id }, { status: SaleStatus.COMPLETED, paymentStatus: PaymentStatus.PAID });
        return { saleReference: sale.saleReference, paymentStatus: PaymentStatus.PAID, verified: true };
      }
      await queryRunner.manager.update(Sale, { id: sale.id }, { status: SaleStatus.FAILED, paymentStatus: PaymentStatus.UNPAID });
      return { saleReference: sale.saleReference, paymentStatus: PaymentStatus.UNPAID, verified: false };
    });
  }

  async handlePaystackWebhook(payload: any, signature: string) {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      throw new InternalServerErrorException('PAYSTACK_SECRET_KEY is not configured');
    }

    const expected = crypto.createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');
    if (expected !== signature) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    if (payload.event === 'charge.success') {
      const reference = payload.data?.reference;
      if (reference) {
        await this.markPaymentPaidByReference(reference);
      }
    }

    return { received: true };
  }

  private async markPaymentPaidByReference(reference: string) {
    const ds = this.dataSource;
    if (!ds?.createQueryRunner) return;
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    try {
      const tenants = await queryRunner.query(`SELECT schema_name FROM platform.tenants`);
      for (const { schema_name } of tenants) {
        const tenantId = String(schema_name).replace(/^tenant_/, '');
        try {
          await this.withScope(tenantId, async (qr: import("typeorm").QueryRunner) => {
            const sale = await qr.manager.findOne(Sale, { where: { paystackReference: reference } });
            if (sale && sale.paymentStatus !== PaymentStatus.PAID) {
              await qr.manager.update(Sale, { id: sale.id }, { status: SaleStatus.COMPLETED, paymentStatus: PaymentStatus.PAID });
            }
          });
        } catch {}
      }
    } finally {
      await queryRunner.release();
    }
  }

  async getSales(tenantId: string) {
    return this.withScope(tenantId, async (queryRunner: import("typeorm").QueryRunner) => {
      const sales = await queryRunner.manager.find(Sale, { order: { createdAt: 'DESC' } });
      const result: Array<Record<string, unknown>> = [];
      for (const sale of sales) {
        const items = await queryRunner.manager.find(SaleItem, { where: { saleId: sale.id } });
        result.push({ ...sale, items });
      }
      return result;
    });
  }

  async getSaleById(tenantId: string, saleId: string) {
    return this.withScope(tenantId, async (queryRunner: import("typeorm").QueryRunner) => {
      const sale = await queryRunner.manager.findOne(Sale, { where: { id: saleId } });
      if (!sale) {
        throw new NotFoundException('Sale not found');
      }
      const items = await queryRunner.manager.find(SaleItem, { where: { saleId } });
      return { ...sale, items };
    });
  }

  async getSalesSummary(tenantId: string) {
    return this.withScope(tenantId, async (queryRunner: import("typeorm").QueryRunner) => {
      const sales = await queryRunner.manager.find(Sale);
      const paidSales = sales.filter((s: Sale) => s.paymentStatus === PaymentStatus.PAID);
      const pendingSales = sales.filter((s: Sale) => s.status === SaleStatus.PENDING);
      const totalRevenue = paidSales.reduce((sum: number, s: Sale) => sum + Number(s.totalAmount ?? 0), 0);
      return {
        totalSales: paidSales.length,
        totalRevenue,
        pendingPayments: pendingSales.length,
      };
    });
  }
}
