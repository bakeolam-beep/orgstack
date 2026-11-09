import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource, QueryRunner, EntityMetadata } from 'typeorm';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
import { MarkReadDto } from './dto/mark-read.dto.js';
import { Notification } from './entities/notification.entity.js';

export interface NotificationResult {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: Date;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private notificationMetadata: EntityMetadata;

  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {
    this.notificationMetadata = this.dataSource.getMetadata(Notification);
  }

  async onModuleInit() {
    // Ensure notification table exists for all tenants on startup
  }

  async ensureTenantSchema(tenantId: string): Promise<void> {
    console.log('[NotificationService] ensureTenantSchema called for tenant:', tenantId);
    try {
      await this.tenantConnectionService.createTenantSchema(tenantId, [this.notificationMetadata]);
      console.log('[NotificationService] Tenant schema created for:', tenantId);
    } catch (error) {
      console.error('[NotificationService] Failed to create tenant schema for', tenantId, ':', error);
    }
  }

  async getNotifications(tenantId: string): Promise<NotificationResult[]> {
    console.log('[NotificationService] getNotifications called for tenant:', tenantId);
    await this.ensureTenantSchema(tenantId);
    return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner: QueryRunner) => {
      console.log('[NotificationService] Executing query for notifications');
      try {
        const result = await queryRunner.query(
          `SELECT id, type, title, message, metadata, "isRead", "createdAt" FROM "notifications" ORDER BY "createdAt" DESC`,
        );
        console.log('[NotificationService] Query result:', result);
        return result as NotificationResult[];
      } catch (error) {
        console.error('[NotificationService] Query error:', error);
        throw error;
      }
    });
  }

  async getUnreadCount(tenantId: string): Promise<{ unreadCount: number }> {
    await this.ensureTenantSchema(tenantId);
    return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner: QueryRunner) => {
      const result = await queryRunner.query(
        `SELECT COUNT(*) as count FROM "notifications" WHERE "isRead" = false`,
      );
      return { unreadCount: parseInt(result[0]?.count || '0', 10) };
    });
  }

  async markAsRead(tenantId: string, dto: MarkReadDto): Promise<{ updated: number }> {
    if (dto.notificationIds.length === 0) {
      return { updated: 0 };
    }

    await this.ensureTenantSchema(tenantId);
    return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner: QueryRunner) => {
      const placeholders = dto.notificationIds.map((_, i) => `$${i + 1}`).join(', ');
      const result = await queryRunner.query(
        `UPDATE "notifications" SET "isRead" = true WHERE id IN (${placeholders})`,
        dto.notificationIds,
      );
      return { updated: result?.rowCount || 0 };
    });
  }

  async markAllAsRead(tenantId: string): Promise<{ updated: number }> {
    await this.ensureTenantSchema(tenantId);
    return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner: QueryRunner) => {
      const result = await queryRunner.query(
        `UPDATE "notifications" SET "isRead" = true WHERE "isRead" = false`,
      );
      return { updated: result?.rowCount || 0 };
    });
  }

  async createNotification(
    tenantId: string,
    type: string,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<NotificationResult> {
    await this.ensureTenantSchema(tenantId);
    return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner: QueryRunner) => {
      const result = await queryRunner.query(
        `INSERT INTO "notifications" (type, title, message, metadata, "isRead", "createdAt")
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING id, type, title, message, metadata, "isRead", "createdAt"`,
        [type, title, message, metadata ? JSON.stringify(metadata) : null, false],
      );
      return result[0] as NotificationResult;
    });
  }

  async getNotificationById(tenantId: string, id: string): Promise<NotificationResult | null> {
    await this.ensureTenantSchema(tenantId);
    return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner: QueryRunner) => {
      const result = await queryRunner.query(
        `SELECT id, type, title, message, metadata, "isRead", "createdAt" FROM "notifications" WHERE id = $1`,
        [id],
      );
      return (result[0] as NotificationResult) || null;
    });
  }
}