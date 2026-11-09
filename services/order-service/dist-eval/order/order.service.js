var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException, } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import * as crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { Sale, SaleStatus, PaymentStatus } from './entities/sale.entity.js';
import { SaleItem } from './entities/sale-item.entity.js';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
import { InventoryClientService } from './inventory-client.service.js';
import { PaystackService } from './paystack.service.js';
let OrderService = class OrderService {
    constructor(dataSource, tenantConnectionService, inventoryClientService, paystackService) {
        this.dataSource = dataSource;
        this.tenantConnectionService = tenantConnectionService;
        this.inventoryClientService = inventoryClientService;
        this.paystackService = paystackService;
    }
    async createSale(tenantId, dto, bearerToken) {
        if (!dto.items || dto.items.length === 0) {
            throw new BadRequestException('Sale must contain at least one item');
        }
        const saleReference = `SALE-${uuidv4().replace(/-/g, '').slice(0, 8)}`;
        let totalAmount = 0;
        for (const item of dto.items) {
            totalAmount += item.quantity * item.unitPrice;
        }
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const sale = queryRunner.manager.create(Sale, {
                id: uuidv4(),
                saleReference,
                status: SaleStatus.PENDING,
                totalAmount,
                paymentStatus: PaymentStatus.UNPAID,
                paystackReference: null,
            });
            const savedSale = await queryRunner.manager.save(sale);
            const saleItems = dto.items.map((item) => queryRunner.manager.create(SaleItem, {
                id: uuidv4(),
                saleId: savedSale.id,
                productId: item.productId,
                productName: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
            }));
            await queryRunner.manager.save(saleItems);
            const deducted = [];
            for (const item of dto.items) {
                try {
                    await this.inventoryClientService.deductStock(tenantId, item.productId, item.quantity, saleReference, bearerToken);
                    deducted.push({ productId: item.productId, quantity: item.quantity });
                }
                catch (error) {
                    for (const d of deducted) {
                        try {
                            await this.inventoryClientService.restoreStock(tenantId, d.productId, d.quantity, saleReference, bearerToken);
                        }
                        catch { }
                    }
                    await queryRunner.manager.update(Sale, { id: savedSale.id }, { status: SaleStatus.FAILED });
                    throw new BadRequestException(`Stock deduction failed for product ${item.productId}: ${error.message}`);
                }
            }
            await queryRunner.manager.update(Sale, { id: savedSale.id }, { status: SaleStatus.COMPLETED });
            return {
                saleId: savedSale.id,
                saleReference,
                status: SaleStatus.COMPLETED,
                totalAmount,
                paymentStatus: PaymentStatus.UNPAID,
                items: dto.items,
            };
        });
    }
    async initializePayment(tenantId, saleReference, userEmail) {
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const sale = await queryRunner.manager.findOne(Sale, { where: { saleReference } });
            if (!sale) {
                throw new NotFoundException('Sale not found');
            }
            if (sale.status !== SaleStatus.COMPLETED) {
                throw new BadRequestException('Sale must be completed before payment');
            }
            if (sale.paymentStatus === PaymentStatus.PAID) {
                throw new BadRequestException('Sale already paid');
            }
            const amountInKobo = Math.round(Number(sale.totalAmount) * 100);
            const { authorizationUrl, reference } = await this.paystackService.initializePayment(userEmail, amountInKobo, saleReference);
            await queryRunner.manager.update(Sale, { id: sale.id }, { paystackReference: reference });
            return { authorizationUrl, reference };
        });
    }
    async verifyPayment(tenantId, dto) {
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const sale = await queryRunner.manager.findOne(Sale, { where: { paystackReference: dto.paystackReference } });
            if (!sale) {
                throw new NotFoundException('Sale not found');
            }
            const verified = await this.paystackService.verifyPayment(dto.paystackReference);
            if (verified.verified) {
                await queryRunner.manager.update(Sale, { id: sale.id }, { paymentStatus: PaymentStatus.PAID });
                return { saleReference: sale.saleReference, paymentStatus: PaymentStatus.PAID, verified: true };
            }
            return { saleReference: sale.saleReference, paymentStatus: PaymentStatus.UNPAID, verified: false };
        });
    }
    async handlePaystackWebhook(payload, signature) {
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
    async markPaymentPaidByReference(reference) {
        const ds = this.dataSource;
        if (!ds?.createQueryRunner)
            return;
        const queryRunner = ds.createQueryRunner();
        await queryRunner.connect();
        try {
            const tenants = await queryRunner.query(`SELECT schema_name FROM platform.tenants`);
            for (const { schema_name } of tenants) {
                const tenantId = String(schema_name).replace(/^tenant_/, '');
                try {
                    await this.tenantConnectionService.withTenantScope(tenantId, async (qr) => {
                        const sale = await qr.manager.findOne(Sale, { where: { paystackReference: reference } });
                        if (sale && sale.paymentStatus !== PaymentStatus.PAID) {
                            await qr.manager.update(Sale, { id: sale.id }, { paymentStatus: PaymentStatus.PAID });
                        }
                    });
                }
                catch { }
            }
        }
        finally {
            await queryRunner.release();
        }
    }
    async getSales(tenantId) {
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const sales = await queryRunner.manager.find(Sale, { order: { createdAt: 'DESC' } });
            const result = [];
            for (const sale of sales) {
                const items = await queryRunner.manager.find(SaleItem, { where: { saleId: sale.id } });
                result.push({ ...sale, items });
            }
            return result;
        });
    }
    async getSaleById(tenantId, saleId) {
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const sale = await queryRunner.manager.findOne(Sale, { where: { id: saleId } });
            if (!sale) {
                throw new NotFoundException('Sale not found');
            }
            const items = await queryRunner.manager.find(SaleItem, { where: { saleId } });
            return { ...sale, items };
        });
    }
    async getSalesSummary(tenantId) {
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const sales = await queryRunner.manager.find(Sale);
            const completedSales = sales.filter((s) => s.status === SaleStatus.COMPLETED);
            const paidSales = sales.filter((s) => s.paymentStatus === PaymentStatus.PAID);
            const totalRevenue = paidSales.reduce((sum, s) => sum + Number(s.totalAmount ?? 0), 0);
            return {
                totalSales: completedSales.length,
                totalRevenue,
                pendingPayments: completedSales.filter((s) => s.paymentStatus !== PaymentStatus.PAID).length,
            };
        });
    }
};
OrderService = __decorate([
    Injectable(),
    __param(0, InjectDataSource()),
    __param(1, Inject(TenantConnectionService)),
    __param(2, Inject(InventoryClientService)),
    __param(3, Inject(PaystackService)),
    __metadata("design:paramtypes", [DataSource,
        TenantConnectionService,
        InventoryClientService,
        PaystackService])
], OrderService);
export { OrderService };
//# sourceMappingURL=order.service.js.map