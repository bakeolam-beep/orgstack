import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';

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
export class RabbitmqProducerService {
  constructor(@Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy) {}

  publishLowStockEvent(
    tenantId: string,
    productId: string,
    productName: string,
    currentQuantity: number,
    reorderLevel: number,
  ): void {
    const payload: LowStockEventPayload = {
      eventId: uuidv4(),
      eventType: 'LOW_STOCK',
      tenantId,
      productId,
      productName,
      currentQuantity,
      reorderLevel,
      timestamp: new Date().toISOString(),
    };

    this.client.emit('low_stock_alerts', payload);
  }
}