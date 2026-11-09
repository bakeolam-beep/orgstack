var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
let InventoryModule = class InventoryModule {
};
InventoryModule = __decorate([
    Module({
        imports: [
            TypeOrmModule.forFeature([Product, StockMovement]),
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
            ClientsModule.registerAsync([
                {
                    name: 'RABBITMQ_SERVICE',
                    imports: [ConfigModule],
                    inject: [ConfigService],
                    useFactory: (configService) => ({
                        transport: Transport.RMQ,
                        options: {
                            urls: [configService.get('RABBITMQ_URL', 'amqp://localhost:5672')],
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
                useFactory: (dataSource) => new TenantConnectionService(dataSource),
                inject: [DataSource],
            },
        ],
        exports: [InventoryService],
    })
], InventoryModule);
export { InventoryModule };
//# sourceMappingURL=inventory.module.js.map