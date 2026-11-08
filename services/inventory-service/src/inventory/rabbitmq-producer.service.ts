import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
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
export class RabbitmqProducerService implements OnModuleInit, OnModuleDestroy {
  private client: ClientProxy;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'low_stock_alerts',
        queueOptions: { durable: true },
      },
    });
  }

  onModuleDestroy() {
    this.client.close();
  }

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