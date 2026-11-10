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
  tenantId: string;
  productId: string;
  name: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  timestamp?: string;
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
      'tenantId',
      'productId',
      'name',
      'sku',
      'currentStock',
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

    const { tenantId, productId, name, sku, currentStock, reorderLevel } = payload;

    try {
      await this.notificationService.createNotification(
        tenantId,
        'LOW_STOCK',
        'Low Stock Alert',
        `${name} (SKU: ${sku}) has fallen to ${currentStock} units, which is at or below the reorder level of ${reorderLevel}.`,
        { productId, productName: name, currentStock, reorderLevel },
      );

      console.log(`Successfully processed low stock event for tenant ${tenantId}, product ${productId}`);
    } catch (error) {
      console.error(`Failed to process low stock event for tenant ${tenantId}, product ${productId}: ${error}`);
      throw error;
    } finally {
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
    }
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async toggleRead(@Req() req: any, @Param('id') id: string, @Body() dto: { isRead: boolean }): Promise<{ updated: number }> {
    const tenantId = req.user.tenantId;
    return this.notificationService.toggleRead(tenantId, id, dto.isRead);
  }
}