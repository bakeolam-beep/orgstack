export declare enum StockMovementType {
    IN = "in",
    OUT = "out",
    ADJUSTMENT = "adjustment"
}
export declare class StockMovement {
    id: string;
    productId: string;
    quantityChange: number;
    type: StockMovementType;
    reference: string | null;
    createdAt: Date;
}
