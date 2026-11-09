import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { Product } from './entities/product.entity.js';
import { StockMovement } from './entities/stock-movement.entity.js';
import { InventoryService } from './inventory.service.js';
import { InventoryController } from './inventory.controller.js';
import { RabbitmqProducerService } from './rabbitmq-producer.service.js';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
import { JwtStrategy } from '../shared/auth/jwt.strategy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, StockMovement]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d') as unknown as number,
        },
      }),
    }),
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
    JwtStrategy,
    {
      provide: TenantConnectionService,
      useFactory: (dataSource: DataSource) => new TenantConnectionService(dataSource),
      inject: [DataSource],
    },
  ],
  exports: [InventoryService],
})
export class InventoryModule {}