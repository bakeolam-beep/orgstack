import { Request } from 'express';
import { OrderService } from './order.service.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
interface AuthenticatedRequest extends Request {
    user: {
        userId: string;
        tenantId: string;
        role: string;
        email?: string;
    };
    rawBody?: Buffer | string;
}
export declare class OrderController {
    private readonly orderService;
    constructor(orderService: OrderService);
    createSale(req: AuthenticatedRequest, dto: CreateSaleDto): Promise<{
        saleId: string;
        saleReference: string;
        status: import("./entities/sale.entity.js").SaleStatus;
        totalAmount: number;
        paymentStatus: import("./entities/sale.entity.js").PaymentStatus;
        items: import("./dto/create-sale.dto.js").CreateSaleItemDto[];
    }>;
    initializePayment(req: AuthenticatedRequest, saleReference: string, userEmail?: string): Promise<{
        authorizationUrl: any;
        reference: any;
    }>;
    verifyPayment(req: AuthenticatedRequest, dto: VerifyPaymentDto): Promise<{
        saleReference: string;
        paymentStatus: import("./entities/sale.entity.js").PaymentStatus;
        verified: boolean;
    }>;
    handleWebhook(req: AuthenticatedRequest): Promise<{
        received: boolean;
    }>;
    getSales(req: AuthenticatedRequest): Promise<Record<string, unknown>[]>;
    getSalesSummary(req: AuthenticatedRequest): Promise<{
        totalSales: number;
        totalRevenue: number;
        pendingPayments: number;
    }>;
    getSaleById(req: AuthenticatedRequest, id: string): Promise<{
        items: import("./entities/sale-item.entity.js").SaleItem[];
        id: string;
        saleReference: string;
        status: import("./entities/sale.entity.js").SaleStatus;
        totalAmount: number;
        paymentStatus: import("./entities/sale.entity.js").PaymentStatus;
        paystackReference: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
