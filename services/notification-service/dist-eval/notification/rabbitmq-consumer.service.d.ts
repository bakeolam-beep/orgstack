import { OnModuleInit } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
export interface LowStockEventPayload {
    eventId: string;
    eventType: 'LOW_STOCK';
    tenantId: string;
    productId: string;
    productName: string;
    currentQuantity: number;
    reorderLevel: number;
    timestamp: string;
}
export declare class RabbitmqConsumerService implements OnModuleInit {
    private readonly dataSource;
    private readonly tenantConnectionService;
    private readonly logger;
    private readonly retryCounts;
    constructor(dataSource: DataSource, tenantConnectionService: TenantConnectionService);
    onModuleInit(): void;
    handleLowStockEvent(payload: any, context: RmqContext): Promise<void>;
}
