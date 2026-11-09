import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import { Product } from './entities/product.entity.js';
import { StockMovement, StockMovementType } from './entities/stock-movement.entity.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { StockMovementDto } from './dto/stock-movement.dto.js';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
import { RabbitmqProducerService } from './rabbitmq-producer.service.js';

export interface ProductWithStock extends Product {
  currentStock: number;
}

export interface StockSummaryItem {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  isLowStock: boolean;
}

export interface StockMovementResult {
  productId: string;
  previousStock: number;
  newStock: number;
  movementId: string;
}

@Injectable()
export class InventoryService {
  private readonly ensuredTenants = new Set<string>();

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(TenantConnectionService)
    private readonly tenantConnectionService: TenantConnectionService,
    @Inject(RabbitmqProducerService)
    private readonly rabbitmqProducerService: RabbitmqProducerService,
  ) {}

  private async ensureTenantSchema(tenantId: string): Promise<void> {
    if (this.ensuredTenants.has(tenantId)) return;
    const entities = [
      this.dataSource.getMetadata(Product),
      this.dataSource.getMetadata(StockMovement),
    ];
    await this.tenantConnectionService.ensureTenantTables(tenantId, entities);
    this.ensuredTenants.add(tenantId);
  }

  private async withScope<T>(tenantId: string, operation: (queryRunner: QueryRunner) => Promise<T>): Promise<T> {
    await this.ensureTenantSchema(tenantId);
    return this.tenantConnectionService.withTenantScope(tenantId, operation);
  }

  private async getCurrentStock(queryRunner: QueryRunner, productId: string): Promise<number> {
    const result = await queryRunner.query(
      `SELECT COALESCE(SUM("quantityChange"), 0) as total FROM "stock_movements" WHERE "productId" = $1`,
      [productId],
    );
    return parseInt(result[0]?.total ?? '0', 10);
  }

  async createProduct(tenantId: string, dto: CreateProductDto): Promise<Product> {
    return this.withScope(tenantId, async (queryRunner) => {
      const product = this.productRepository.create(dto);
      return queryRunner.manager.save(product);
    });
  }

  async findAllProducts(tenantId: string): Promise<ProductWithStock[]> {
    return this.withScope(tenantId, async (queryRunner) => {
      const products = await queryRunner.manager.find(Product, {
        order: { name: 'ASC' },
      });

      const productsWithStock: ProductWithStock[] = [];
      for (const product of products) {
        const currentStock = await this.getCurrentStock(queryRunner, product.id);
        productsWithStock.push({ ...product, currentStock });
      }

      return productsWithStock;
    });
  }

  async findOneProduct(tenantId: string, productId: string): Promise<ProductWithStock> {
    return this.withScope(tenantId, async (queryRunner) => {
      const product = await queryRunner.manager.findOne(Product, {
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const currentStock = await this.getCurrentStock(queryRunner, productId);
      return { ...product, currentStock };
    });
  }

  async updateProduct(tenantId: string, productId: string, dto: UpdateProductDto): Promise<Product> {
    return this.withScope(tenantId, async (queryRunner) => {
      const product = await queryRunner.manager.findOne(Product, {
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      Object.assign(product, dto);
      return queryRunner.manager.save(product);
    });
  }

  async deleteProduct(tenantId: string, productId: string): Promise<{ deleted: true }> {
    return this.withScope(tenantId, async (queryRunner) => {
      const product = await queryRunner.manager.findOne(Product, {
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const movementsExist = await queryRunner.query(
        `SELECT 1 FROM "stock_movements" WHERE "productId" = $1 LIMIT 1`,
        [productId],
      );

      if (movementsExist.length > 0) {
        throw new BadRequestException('Cannot delete product with stock history');
      }

      await queryRunner.manager.remove(product);
      return { deleted: true };
    });
  }

  async recordStockMovement(tenantId: string, dto: StockMovementDto): Promise<StockMovementResult> {
    return this.withScope(tenantId, async (queryRunner) => {
      const product = await queryRunner.manager.findOne(Product, {
        where: { id: dto.productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const currentStock = await this.getCurrentStock(queryRunner, dto.productId);

      let signedQuantityChange: number;
      switch (dto.type) {
        case 'in':
          signedQuantityChange = dto.quantity;
          break;
        case 'out':
          signedQuantityChange = -dto.quantity;
          break;
        case 'adjustment':
          signedQuantityChange = dto.quantity;
          break;
        default:
          throw new BadRequestException('Invalid stock movement type');
      }

      const newStock = currentStock + signedQuantityChange;

      if (newStock < 0) {
        throw new BadRequestException('Insufficient stock');
      }

      const movement = this.stockMovementRepository.create({
        productId: dto.productId,
        quantityChange: signedQuantityChange,
        type: dto.type as StockMovementType,
        reference: dto.reference ?? null,
      });

      const savedMovement = await queryRunner.manager.save(movement) as StockMovement;

      if (newStock <= product.reorderLevel) {
        this.rabbitmqProducerService.publishLowStockEvent(
          tenantId,
          product.id,
          product.name,
          newStock,
          product.reorderLevel,
        );
      }

      return {
        productId: dto.productId,
        previousStock: currentStock,
        newStock,
        movementId: savedMovement.id,
      };
    });
  }

  async getStockSummary(tenantId: string): Promise<StockSummaryItem[]> {
    return this.withScope(tenantId, async (queryRunner) => {
      const products = await queryRunner.manager.find(Product, {
        order: { name: 'ASC' },
      });

      const summary: StockSummaryItem[] = [];
      for (const product of products) {
        const currentStock = await this.getCurrentStock(queryRunner, product.id);
        summary.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          currentStock,
          reorderLevel: product.reorderLevel,
          isLowStock: currentStock <= product.reorderLevel,
        });
      }

      return summary;
    });
  }
}
