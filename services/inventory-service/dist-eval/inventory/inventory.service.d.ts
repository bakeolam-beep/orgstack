import { DataSource, Repository } from 'typeorm';
import { Product } from './entities/product.entity.js';
import { StockMovement } from './entities/stock-movement.entity.js';
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
export declare class InventoryService {
    private readonly productRepository;
    private readonly stockMovementRepository;
    private readonly dataSource;
    private readonly tenantConnectionService;
    private readonly rabbitmqProducerService;
    constructor(productRepository: Repository<Product>, stockMovementRepository: Repository<StockMovement>, dataSource: DataSource, tenantConnectionService: TenantConnectionService, rabbitmqProducerService: RabbitmqProducerService);
    private getCurrentStock;
    createProduct(tenantId: string, dto: CreateProductDto): Promise<Product>;
    findAllProducts(tenantId: string): Promise<ProductWithStock[]>;
    findOneProduct(tenantId: string, productId: string): Promise<ProductWithStock>;
    updateProduct(tenantId: string, productId: string, dto: UpdateProductDto): Promise<Product>;
    deleteProduct(tenantId: string, productId: string): Promise<{
        deleted: true;
    }>;
    recordStockMovement(tenantId: string, dto: StockMovementDto): Promise<StockMovementResult>;
    getStockSummary(tenantId: string): Promise<StockSummaryItem[]>;
}
