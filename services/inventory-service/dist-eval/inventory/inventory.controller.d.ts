import { Request } from 'express';
import { InventoryService } from './inventory.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { StockMovementDto } from './dto/stock-movement.dto.js';
interface AuthenticatedRequest extends Request {
    user: {
        userId: string;
        tenantId: string;
        role: string;
    };
}
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    createProduct(req: AuthenticatedRequest, dto: CreateProductDto): Promise<import("./entities/product.entity.js").Product>;
    findAllProducts(req: AuthenticatedRequest): Promise<import("./inventory.service.js").ProductWithStock[]>;
    findOneProduct(req: AuthenticatedRequest, id: string): Promise<import("./inventory.service.js").ProductWithStock>;
    updateProduct(req: AuthenticatedRequest, id: string, dto: UpdateProductDto): Promise<import("./entities/product.entity.js").Product>;
    deleteProduct(req: AuthenticatedRequest, id: string): Promise<{
        deleted: true;
    }>;
    recordStockMovement(req: AuthenticatedRequest, dto: StockMovementDto): Promise<import("./inventory.service.js").StockMovementResult>;
    getStockSummary(req: AuthenticatedRequest): Promise<import("./inventory.service.js").StockSummaryItem[]>;
}
export {};
