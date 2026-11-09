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
import { BadRequestException, Inject, Injectable, NotFoundException, } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity.js';
import { StockMovement } from './entities/stock-movement.entity.js';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
import { RabbitmqProducerService } from './rabbitmq-producer.service.js';
let InventoryService = class InventoryService {
    constructor(productRepository, stockMovementRepository, dataSource, tenantConnectionService, rabbitmqProducerService) {
        this.productRepository = productRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.dataSource = dataSource;
        this.tenantConnectionService = tenantConnectionService;
        this.rabbitmqProducerService = rabbitmqProducerService;
    }
    async getCurrentStock(queryRunner, productId) {
        const result = await queryRunner.query(`SELECT COALESCE(SUM("quantityChange"), 0) as total FROM "stock_movements" WHERE "productId" = $1`, [productId]);
        return parseInt(result[0]?.total ?? '0', 10);
    }
    async createProduct(tenantId, dto) {
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const product = this.productRepository.create(dto);
            return queryRunner.manager.save(product);
        });
    }
    async findAllProducts(tenantId) {
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const products = await queryRunner.manager.find(Product, {
                order: { name: 'ASC' },
            });
            const productsWithStock = [];
            for (const product of products) {
                const currentStock = await this.getCurrentStock(queryRunner, product.id);
                productsWithStock.push({ ...product, currentStock });
            }
            return productsWithStock;
        });
    }
    async findOneProduct(tenantId, productId) {
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
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
    async updateProduct(tenantId, productId, dto) {
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
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
    async deleteProduct(tenantId, productId) {
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const product = await queryRunner.manager.findOne(Product, {
                where: { id: productId },
            });
            if (!product) {
                throw new NotFoundException('Product not found');
            }
            const movementsExist = await queryRunner.query(`SELECT 1 FROM "stock_movements" WHERE "productId" = $1 LIMIT 1`, [productId]);
            if (movementsExist.length > 0) {
                throw new BadRequestException('Cannot delete product with stock history');
            }
            await queryRunner.manager.remove(product);
            return { deleted: true };
        });
    }
    async recordStockMovement(tenantId, dto) {
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const product = await queryRunner.manager.findOne(Product, {
                where: { id: dto.productId },
            });
            if (!product) {
                throw new NotFoundException('Product not found');
            }
            const currentStock = await this.getCurrentStock(queryRunner, dto.productId);
            let signedQuantityChange;
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
                type: dto.type,
                reference: dto.reference ?? null,
            });
            const savedMovement = await queryRunner.manager.save(movement);
            if (newStock <= product.reorderLevel) {
                this.rabbitmqProducerService.publishLowStockEvent(tenantId, product.id, product.name, newStock, product.reorderLevel);
            }
            return {
                productId: dto.productId,
                previousStock: currentStock,
                newStock,
                movementId: savedMovement.id,
            };
        });
    }
    async getStockSummary(tenantId) {
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const products = await queryRunner.manager.find(Product, {
                order: { name: 'ASC' },
            });
            const summary = [];
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
};
InventoryService = __decorate([
    Injectable(),
    __param(0, InjectRepository(Product)),
    __param(1, InjectRepository(StockMovement)),
    __param(2, InjectDataSource()),
    __param(3, Inject(TenantConnectionService)),
    __param(4, Inject(RabbitmqProducerService)),
    __metadata("design:paramtypes", [Repository,
        Repository,
        DataSource,
        TenantConnectionService,
        RabbitmqProducerService])
], InventoryService);
export { InventoryService };
//# sourceMappingURL=inventory.service.js.map