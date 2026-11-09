var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
import { Notification } from './entities/notification.entity.js';
let NotificationService = class NotificationService {
    constructor(dataSource, tenantConnectionService) {
        this.dataSource = dataSource;
        this.tenantConnectionService = tenantConnectionService;
        this.notificationMetadata = null;
    }
    getMetadataSafe() {
        if (this.notificationMetadata)
            return this.notificationMetadata;
        try {
            this.notificationMetadata = this.dataSource?.getMetadata?.(Notification) ?? null;
        }
        catch {
            this.notificationMetadata = null;
        }
        return this.notificationMetadata;
    }
    async onModuleInit() { }
    async ensureTenantSchema(tenantId) {
        const meta = this.getMetadataSafe();
        if (!meta)
            return;
        try {
            await this.tenantConnectionService.ensureTenantTables(tenantId, [meta]);
        }
        catch (error) {
            console.error(`[NotificationService] Failed to ensure tenant schema for ${tenantId}:`, error);
        }
    }
    async getNotifications(tenantId) {
        await this.ensureTenantSchema(tenantId);
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const result = await queryRunner.query(`SELECT id, type, title, message, metadata, "isRead", "createdAt" FROM "notifications" ORDER BY "createdAt" DESC`);
            return result;
        });
    }
    async getUnreadCount(tenantId) {
        await this.ensureTenantSchema(tenantId);
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const result = await queryRunner.query(`SELECT COUNT(*) as count FROM "notifications" WHERE "isRead" = false`);
            return { unreadCount: parseInt(result[0]?.count || '0', 10) };
        });
    }
    async markAsRead(tenantId, dto) {
        if (dto.notificationIds.length === 0) {
            return { updated: 0 };
        }
        await this.ensureTenantSchema(tenantId);
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const placeholders = dto.notificationIds.map((_, i) => `$${i + 1}`).join(', ');
            const result = await queryRunner.query(`UPDATE "notifications" SET "isRead" = true WHERE id IN (${placeholders})`, dto.notificationIds);
            return { updated: result?.rowCount || result?.[1] || 0 };
        });
    }
    async markAllAsRead(tenantId) {
        await this.ensureTenantSchema(tenantId);
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const result = await queryRunner.query(`UPDATE "notifications" SET "isRead" = true WHERE "isRead" = false`);
            return { updated: result?.rowCount || result?.[1] || 0 };
        });
    }
    async createNotification(tenantId, type, title, message, metadata) {
        await this.ensureTenantSchema(tenantId);
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const result = await queryRunner.query(`INSERT INTO "notifications" (type, title, message, metadata, "isRead", "createdAt")
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING id, type, title, message, metadata, "isRead", "createdAt"`, [type, title, message, metadata ? JSON.stringify(metadata) : null, false]);
            return result[0];
        });
    }
    async getNotificationById(tenantId, id) {
        await this.ensureTenantSchema(tenantId);
        return this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
            const result = await queryRunner.query(`SELECT id, type, title, message, metadata, "isRead", "createdAt" FROM "notifications" WHERE id = $1`, [id]);
            return result[0] || null;
        });
    }
};
NotificationService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [DataSource,
        TenantConnectionService])
], NotificationService);
export { NotificationService };
//# sourceMappingURL=notification.service.js.map