import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';

export interface LowStockEventPayload {
  eventId: string;
  eventType: 'LOW_STOCK';
  tenantId: string;
  productId: string;
  name: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  timestamp: string;
}

@Injectable()
export class RabbitmqProducerService {
  constructor(@Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy) {}

  publishLowStockEvent(
    tenantId: string,
    productId: string,
    productName: string,
    sku: string,
    currentStock: number,
    reorderLevel: number,
  ): void {
    const payload: LowStockEventPayload = {
      eventId: uuidv4(),
      eventType: 'LOW_STOCK',
      tenantId,
      productId,
      name: productName,
      sku,
      currentStock,
      reorderLevel,
      timestamp: new Date().toISOString(),
    };

    this.client.emit('low_stock_alerts', payload);
  }
}