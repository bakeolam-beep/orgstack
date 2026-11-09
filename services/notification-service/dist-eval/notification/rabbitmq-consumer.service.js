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
var RabbitmqConsumerService_1;
import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx } from '@nestjs/microservices';
import { RmqContext } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
let RabbitmqConsumerService = RabbitmqConsumerService_1 = class RabbitmqConsumerService {
    constructor(dataSource, tenantConnectionService) {
        this.dataSource = dataSource;
        this.tenantConnectionService = tenantConnectionService;
        this.logger = new Logger(RabbitmqConsumerService_1.name);
        this.retryCounts = new Map();
        this.logger.log('RabbitmqConsumerService constructor called');
    }
    onModuleInit() {
        this.logger.log('RabbitmqConsumerService onModuleInit called');
    }
    async handleLowStockEvent(payload, context) {
        this.logger.log(`handleLowStockEvent called with payload: ${JSON.stringify(payload)}`);
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
            this.logger.warn(`Low stock event missing required fields: ${missingFields.join(', ')}. Event: ${JSON.stringify(payload)}`);
            const channel = context.getChannelRef();
            const originalMsg = context.getMessage();
            channel.ack(originalMsg);
            return;
        }
        if (payload.eventType !== 'LOW_STOCK') {
            this.logger.warn(`Received unexpected event type: ${payload.eventType}. Expected LOW_STOCK.`);
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
            this.logger.log(`Successfully processed low stock event ${eventId} for tenant ${tenantId}`);
            this.retryCounts.delete(eventId);
        }
        catch (error) {
            const retryCount = (this.retryCounts.get(eventId) || 0) + 1;
            this.retryCounts.set(eventId, retryCount);
            this.logger.error(`Failed to process low stock event ${eventId} for tenant ${tenantId} (attempt ${retryCount}/3): ${error}`);
            if (retryCount >= 3) {
                this.logger.error(`Low stock event ${eventId} has failed 3 times. Moving to dead-letter log. Payload: ${JSON.stringify(payload)}`);
                this.retryCounts.delete(eventId);
            }
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
    EventPattern('low_stock_alerts'),
    __param(0, Payload()),
    __param(1, Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, RmqContext]),
    __metadata("design:returntype", Promise)
], RabbitmqConsumerService.prototype, "handleLowStockEvent", null);
RabbitmqConsumerService = RabbitmqConsumerService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [DataSource,
        TenantConnectionService])
], RabbitmqConsumerService);
export { RabbitmqConsumerService };
//# sourceMappingURL=rabbitmq-consumer.service.js.map