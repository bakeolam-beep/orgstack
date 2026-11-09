export declare class StockMovementDto {
    productId: string;
    quantity: number;
    type: 'in' | 'out' | 'adjustment';
    reference?: string;
}
