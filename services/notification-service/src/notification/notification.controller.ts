import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../shared/auth/jwt-auth.guard.js';
import { NotificationService } from './notification.service.js';
import { MarkReadDto } from './dto/mark-read.dto.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(@Req() req: any): Promise<any[]> {
    const tenantId = req.user.tenantId;
    return this.notificationService.getNotifications(tenantId);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any): Promise<{ unreadCount: number }> {
    const tenantId = req.user.tenantId;
    return this.notificationService.getUnreadCount(tenantId);
  }

  @Patch('mark-read')
  async markAsRead(@Req() req: any, @Body() dto: MarkReadDto): Promise<{ updated: number }> {
    const tenantId = req.user.tenantId;
    return this.notificationService.markAsRead(tenantId, dto);
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Req() req: any): Promise<{ updated: number }> {
    const tenantId = req.user.tenantId;
    return this.notificationService.markAllAsRead(tenantId);
  }

  @Get(':id')
  async getNotificationById(@Req() req: any, @Param('id') id: string): Promise<any> {
    const tenantId = req.user.tenantId;
    const notification = await this.notificationService.getNotificationById(tenantId, id);
    if (!notification) {
      return { statusCode: 404, message: 'Notification not found' };
    }
    return notification;
  }
}