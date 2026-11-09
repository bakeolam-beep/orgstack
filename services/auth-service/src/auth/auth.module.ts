import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Tenant } from '../platform/entities/tenant.entity.js';
import { User } from '../platform/entities/user.entity.js';
import { Product } from '../tenant-entities/product.entity.js';
import { StockMovement } from '../tenant-entities/stock-movement.entity.js';
import { Sale } from '../tenant-entities/sale.entity.js';
import { SaleItem } from '../tenant-entities/sale-item.entity.js';
import { Notification } from '../tenant-entities/notification.entity.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from '../shared/auth/jwt.strategy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User, Product, StockMovement, Sale, SaleItem, Notification]),
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
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}