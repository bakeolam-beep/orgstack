import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { DataSource, QueryRunner } from 'typeorm';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';

export interface LowStockEventPayload {
  eventId: string;
  eventType: 'LOW_STOCK';
  tenantId: string;
  productId: string;
  productName: string;
  currentQuantity: number;
  reorderLevel: number;
  timestamp: string;
}

@Injectable()
export class RabbitmqConsumerService {
  private readonly logger = new Logger(RabbitmqConsumerService.name);
  private readonly retryCounts = new Map<string, number>();

  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  @EventPattern('low_stock_alerts')
  async handleLowStockEvent(@Payload() payload: any): Promise<void> {
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
      this.logger.warn(
        `Low stock event missing required fields: ${missingFields.join(', ')}. Event: ${JSON.stringify(payload)}`,
      );
      return;
    }

    if (payload.eventType !== 'LOW_STOCK') {
      this.logger.warn(`Received unexpected event type: ${payload.eventType}. Expected LOW_STOCK.`);
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

      this.logger.log(`Successfully processed low stock event ${eventId} for tenant ${tenantId}`);
      this.retryCounts.delete(eventId);
    } catch (error) {
      const retryCount = (this.retryCounts.get(eventId) || 0) + 1;
      this.retryCounts.set(eventId, retryCount);

      this.logger.error(
        `Failed to process low stock event ${eventId} for tenant ${tenantId} (attempt ${retryCount}/3): ${error}`,
      );

      if (retryCount >= 3) {
        this.logger.error(
          `Low stock event ${eventId} has failed 3 times. Moving to dead-letter log. Payload: ${JSON.stringify(payload)}`,
        );
        this.retryCounts.delete(eventId);
        return;
      }

      throw error;
    }
  }
}