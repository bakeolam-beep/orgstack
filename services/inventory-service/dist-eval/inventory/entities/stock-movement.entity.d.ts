import { Product } from './product.entity.js';
export declare enum StockMovementType {
    IN = "in",
    OUT = "out",
    ADJUSTMENT = "adjustment"
}
export declare class StockMovement {
    id: string;
    productId: string;
    product: Product;
    quantityChange: number;
    type: StockMovementType;
    reference: string | null;
    createdAt: Date;
}
