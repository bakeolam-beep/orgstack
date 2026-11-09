var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
let OrderModule = class OrderModule {
};
OrderModule = __decorate([
    Module({
        imports: [
            TypeOrmModule.forFeature([Sale, SaleItem]),
            PassportModule.register({ defaultStrategy: 'jwt' }),
            JwtModule.registerAsync({
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: configService.get('JWT_EXPIRES_IN', '1d'),
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
                useFactory: (dataSource) => new TenantConnectionService(dataSource),
                inject: [DataSource],
            },
        ],
        exports: [OrderService],
    })
], OrderModule);
export { OrderModule };
//# sourceMappingURL=order.module.js.map