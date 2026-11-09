import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';

import { Sale, SaleItem } from './entities/index.js';
import { OrderService } from './order.service.js';
import { OrderController } from './order.controller.js';
import { InventoryClientService } from './inventory-client.service.js';
import { PaystackService } from './paystack.service.js';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
import { JwtStrategy } from '../shared/auth/jwt.strategy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d'),
        },
      }),
    }),
    HttpModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    InventoryClientService,
    PaystackService,
    JwtStrategy,
    {
      provide: TenantConnectionService,
      useFactory: (dataSource: DataSource) => new TenantConnectionService(dataSource),
      inject: [DataSource],
    },
  ],
  exports: [OrderService],
})
export class OrderModule {}
