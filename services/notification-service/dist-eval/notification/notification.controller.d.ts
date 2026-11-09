import { RmqContext } from '@nestjs/microservices';
import { NotificationService } from './notification.service.js';
import { MarkReadDto } from './dto/mark-read.dto.js';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
import { DataSource } from 'typeorm';
interface LowStockEventPayload {
    eventId: string;
    eventType: 'LOW_STOCK';
    tenantId: string;
    productId: string;
    productName: string;
    currentQuantity: number;
    reorderLevel: number;
    timestamp: string;
}
export declare class NotificationController {
    private readonly notificationService;
    private readonly tenantConnectionService;
    private readonly dataSource;
    constructor(notificationService: NotificationService, tenantConnectionService: TenantConnectionService, dataSource: DataSource);
    getNotifications(req: any): Promise<any[]>;
    getUnreadCount(req: any): Promise<{
        unreadCount: number;
    }>;
    markAsRead(req: any, dto: MarkReadDto): Promise<{
        updated: number;
    }>;
    markAllAsRead(req: any): Promise<{
        updated: number;
    }>;
    getNotificationById(req: any, id: string): Promise<any>;
    handleLowStockEvent(payload: LowStockEventPayload, context: RmqContext): Promise<void>;
}
export {};
