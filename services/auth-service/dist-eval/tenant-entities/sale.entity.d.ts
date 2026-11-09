export declare enum SaleStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare enum PaymentStatus {
    UNPAID = "unpaid",
    PAID = "paid",
    REFUNDED = "refunded"
}
export declare class Sale {
    id: string;
    saleReference: string;
    status: SaleStatus;
    totalAmount: number;
    paymentStatus: PaymentStatus;
    createdAt: Date;
    updatedAt: Date;
}
