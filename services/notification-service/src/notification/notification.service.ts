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
  private notificationMetadata: EntityMetadata | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  private getMetadataSafe(): EntityMetadata | null {
    if (this.notificationMetadata) return this.notificationMetadata;
    try {
      this.notificationMetadata = this.dataSource?.getMetadata?.(Notification) ?? null;
    } catch {
      this.notificationMetadata = null;
    }
    return this.notificationMetadata;
  }

  async onModuleInit() {}

  async ensureTenantSchema(tenantId: string): Promise<void> {
    const meta = this.getMetadataSafe();
    if (!meta) return;
    try {
      await this.tenantConnectionService.ensureTenantTables(tenantId, [meta]);
    } catch (error) {
      console.error(`[NotificationService] Failed to ensure tenant schema for ${tenantId}:`, error);
    }
  }

  async getNotifications(tenantId: string): Promise<NotificationResult[]> {
    await this.ensureTenantSchema(tenantId);
    return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner: QueryRunner) => {
      const result = await queryRunner.query(
        `SELECT id, type, title, message, metadata, "isRead", "createdAt" FROM "notifications" ORDER BY "createdAt" DESC`,
      );
      return result as NotificationResult[];
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
      return { updated: result?.rowCount || result?.[1] || 0 };
    });
  }

  async markAllAsRead(tenantId: string): Promise<{ updated: number }> {
    await this.ensureTenantSchema(tenantId);
    return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner: QueryRunner) => {
      const result = await queryRunner.query(
        `UPDATE "notifications" SET "isRead" = true WHERE "isRead" = false`,
      );
      return { updated: result?.rowCount || result?.[1] || 0 };
    });
  }

  async toggleRead(tenantId: string, id: string, isRead: boolean): Promise<{ updated: number }> {
    await this.ensureTenantSchema(tenantId);
    return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner: QueryRunner) => {
      const result = await queryRunner.query(
        `UPDATE "notifications" SET "isRead" = $1 WHERE id = $2`,
        [isRead, id],
      );
      return { updated: result?.rowCount || result?.[1] || 0 };
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
