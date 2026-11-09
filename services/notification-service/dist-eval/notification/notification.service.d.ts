import { OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
import { MarkReadDto } from './dto/mark-read.dto.js';
export interface NotificationResult {
    id: string;
    type: string;
    title: string;
    message: string;
    metadata: Record<string, unknown> | null;
    isRead: boolean;
    createdAt: Date;
}
export declare class NotificationService implements OnModuleInit {
    private readonly dataSource;
    private readonly tenantConnectionService;
    private notificationMetadata;
    constructor(dataSource: DataSource, tenantConnectionService: TenantConnectionService);
    private getMetadataSafe;
    onModuleInit(): Promise<void>;
    ensureTenantSchema(tenantId: string): Promise<void>;
    getNotifications(tenantId: string): Promise<NotificationResult[]>;
    getUnreadCount(tenantId: string): Promise<{
        unreadCount: number;
    }>;
    markAsRead(tenantId: string, dto: MarkReadDto): Promise<{
        updated: number;
    }>;
    markAllAsRead(tenantId: string): Promise<{
        updated: number;
    }>;
    createNotification(tenantId: string, type: string, title: string, message: string, metadata?: Record<string, unknown>): Promise<NotificationResult>;
    getNotificationById(tenantId: string, id: string): Promise<NotificationResult | null>;
}
