import { DataSource } from 'typeorm';
import { SaleStatus, PaymentStatus } from './entities/sale.entity.js';
import { SaleItem } from './entities/sale-item.entity.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
import { InventoryClientService } from './inventory-client.service.js';
import { PaystackService } from './paystack.service.js';
export declare class OrderService {
    private readonly dataSource;
    private readonly tenantConnectionService;
    private readonly inventoryClientService;
    private readonly paystackService;
    constructor(dataSource: DataSource, tenantConnectionService: TenantConnectionService, inventoryClientService: InventoryClientService, paystackService: PaystackService);
    createSale(tenantId: string, dto: CreateSaleDto, bearerToken: string): Promise<{
        saleId: string;
        saleReference: string;
        status: SaleStatus;
        totalAmount: number;
        paymentStatus: PaymentStatus;
        items: import("./dto/create-sale.dto.js").CreateSaleItemDto[];
    }>;
    initializePayment(tenantId: string, saleReference: string, userEmail: string): Promise<{
        authorizationUrl: any;
        reference: any;
    }>;
    verifyPayment(tenantId: string, dto: VerifyPaymentDto): Promise<{
        saleReference: string;
        paymentStatus: PaymentStatus;
        verified: boolean;
    }>;
    handlePaystackWebhook(payload: any, signature: string): Promise<{
        received: boolean;
    }>;
    private markPaymentPaidByReference;
    getSales(tenantId: string): Promise<Record<string, unknown>[]>;
    getSaleById(tenantId: string, saleId: string): Promise<{
        items: SaleItem[];
        id: string;
        saleReference: string;
        status: SaleStatus;
        totalAmount: number;
        paymentStatus: PaymentStatus;
        paystackReference: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getSalesSummary(tenantId: string): Promise<{
        totalSales: number;
        totalRevenue: number;
        pendingPayments: number;
    }>;
}
