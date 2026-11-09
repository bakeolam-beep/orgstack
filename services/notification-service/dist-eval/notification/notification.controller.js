var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Patch, Param, Body, UseGuards, Req, } from '@nestjs/common';
import { EventPattern, Payload, Ctx } from '@nestjs/microservices';
import { RmqContext } from '@nestjs/microservices';
import { JwtAuthGuard } from '../shared/auth/jwt-auth.guard.js';
import { NotificationService } from './notification.service.js';
import { MarkReadDto } from './dto/mark-read.dto.js';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
import { DataSource } from 'typeorm';
let NotificationController = class NotificationController {
    constructor(notificationService, tenantConnectionService, dataSource) {
        this.notificationService = notificationService;
        this.tenantConnectionService = tenantConnectionService;
        this.dataSource = dataSource;
    }
    async getNotifications(req) {
        const tenantId = req.user.tenantId;
        return this.notificationService.getNotifications(tenantId);
    }
    async getUnreadCount(req) {
        const tenantId = req.user.tenantId;
        return this.notificationService.getUnreadCount(tenantId);
    }
    async markAsRead(req, dto) {
        const tenantId = req.user.tenantId;
        return this.notificationService.markAsRead(tenantId, dto);
    }
    async markAllAsRead(req) {
        const tenantId = req.user.tenantId;
        return this.notificationService.markAllAsRead(tenantId);
    }
    async getNotificationById(req, id) {
        const tenantId = req.user.tenantId;
        const notification = await this.notificationService.getNotificationById(tenantId, id);
        if (!notification) {
            return { statusCode: 404, message: 'Notification not found' };
        }
        return notification;
    }
    async handleLowStockEvent(payload, context) {
        const requiredFields = [
            'eventId',
            'eventType',
            'tenantId',
            'productId',
            'productName',
            'currentQuantity',
            'reorderLevel',
        ];
        const missingFields = requiredFields.filter((field) => payload[field] === undefined || payload[field] === null);
        if (missingFields.length > 0) {
            console.warn(`Low stock event missing required fields: ${missingFields.join(', ')}. Event: ${JSON.stringify(payload)}`);
            const channel = context.getChannelRef();
            const originalMsg = context.getMessage();
            channel.ack(originalMsg);
            return;
        }
        if (payload.eventType !== 'LOW_STOCK') {
            console.warn(`Received unexpected event type: ${payload.eventType}. Expected LOW_STOCK.`);
            const channel = context.getChannelRef();
            const originalMsg = context.getMessage();
            channel.ack(originalMsg);
            return;
        }
        const { eventId, tenantId, productId, productName, currentQuantity, reorderLevel } = payload;
        try {
            await this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner) => {
                const insertSql = `
          INSERT INTO "notifications" (type, title, message, metadata, "isRead", "createdAt")
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `;
                const message = `${productName} (SKU: ${productId}) has fallen to ${currentQuantity} units, which is at or below the reorder level of ${reorderLevel}.`;
                await queryRunner.query(insertSql, [
                    'LOW_STOCK',
                    'Low Stock Alert',
                    message,
                    JSON.stringify({ productId, productName, currentQuantity, reorderLevel }),
                    false,
                ]);
            });
            console.log(`Successfully processed low stock event ${eventId} for tenant ${tenantId}`);
        }
        catch (error) {
            console.error(`Failed to process low stock event ${eventId} for tenant ${tenantId}: ${error}`);
            throw error;
        }
        finally {
            const channel = context.getChannelRef();
            const originalMsg = context.getMessage();
            channel.ack(originalMsg);
        }
    }
};
__decorate([
    Get(),
    UseGuards(JwtAuthGuard),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getNotifications", null);
__decorate([
    Get('unread-count'),
    UseGuards(JwtAuthGuard),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getUnreadCount", null);
__decorate([
    Patch('mark-read'),
    UseGuards(JwtAuthGuard),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, MarkReadDto]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAsRead", null);
__decorate([
    Patch('mark-all-read'),
    UseGuards(JwtAuthGuard),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAllAsRead", null);
__decorate([
    Get(':id'),
    UseGuards(JwtAuthGuard),
    __param(0, Req()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getNotificationById", null);
__decorate([
    EventPattern('low_stock_alerts'),
    __param(0, Payload()),
    __param(1, Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, RmqContext]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "handleLowStockEvent", null);
NotificationController = __decorate([
    Controller('notifications'),
    __metadata("design:paramtypes", [NotificationService,
        TenantConnectionService,
        DataSource])
], NotificationController);
export { NotificationController };
//# sourceMappingURL=notification.controller.js.map