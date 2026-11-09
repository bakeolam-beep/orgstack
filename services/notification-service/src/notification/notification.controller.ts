import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { EventPattern, Payload, Ctx } from '@nestjs/microservices';
import { RmqContext } from '@nestjs/microservices';
import { JwtAuthGuard } from '../shared/auth/jwt-auth.guard.js';
import { NotificationService } from './notification.service.js';
import { MarkReadDto } from './dto/mark-read.dto.js';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
import { DataSource, QueryRunner } from 'typeorm';

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

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getNotifications(@Req() req: any): Promise<any[]> {
    const tenantId = req.user.tenantId;
    return this.notificationService.getNotifications(tenantId);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(@Req() req: any): Promise<{ unreadCount: number }> {
    const tenantId = req.user.tenantId;
    return this.notificationService.getUnreadCount(tenantId);
  }

  @Patch('mark-read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(@Req() req: any, @Body() dto: MarkReadDto): Promise<{ updated: number }> {
    const tenantId = req.user.tenantId;
    return this.notificationService.markAsRead(tenantId, dto);
  }

  @Patch('mark-all-read')
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@Req() req: any): Promise<{ updated: number }> {
    const tenantId = req.user.tenantId;
    return this.notificationService.markAllAsRead(tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getNotificationById(@Req() req: any, @Param('id') id: string): Promise<any> {
    const tenantId = req.user.tenantId;
    const notification = await this.notificationService.getNotificationById(tenantId, id);
    if (!notification) {
      return { statusCode: 404, message: 'Notification not found' };
    }
    return notification;
  }

  @EventPattern('low_stock_alerts')
  async handleLowStockEvent(@Payload() payload: LowStockEventPayload, @Ctx() context: RmqContext): Promise<void> {
    const requiredFields: (keyof LowStockEventPayload)[] = [
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
      await this.tenantConnectionService.withTenantScope(tenantId, async (queryRunner: QueryRunner) => {
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
    } catch (error) {
      console.error(`Failed to process low stock event ${eventId} for tenant ${tenantId}: ${error}`);
      throw error;
    } finally {
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    }
  }
}