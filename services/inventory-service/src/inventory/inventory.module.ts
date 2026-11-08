import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { Product } from './entities/product.entity.js';
import { StockMovement } from './entities/stock-movement.entity.js';
import { InventoryService } from './inventory.service.js';
import { InventoryController } from './inventory.controller.js';
import { RabbitmqProducerService } from './rabbitmq-producer.service.js';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, StockMovement]),
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672')],
            queue: 'low_stock_alerts',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    RabbitmqProducerService,
    {
      provide: TenantConnectionService,
      useFactory: (dataSource: DataSource) => new TenantConnectionService(dataSource),
      inject: [DataSource],
    },
  ],
  exports: [InventoryService],
})
export class InventoryModule {}