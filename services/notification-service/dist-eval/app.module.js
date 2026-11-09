var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'node:path';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { NotificationModule } from './notification/notification.module.js';
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        imports: [
            ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: join(process.cwd(), '../../.env'),
            }),
            TypeOrmModule.forRootAsync({
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (configService) => ({
                    type: 'postgres',
                    host: configService.get('POSTGRES_HOST', 'localhost'),
                    port: parseInt(configService.get('POSTGRES_PORT', '5432'), 10),
                    database: configService.get('POSTGRES_DB', 'orgstack_db'),
                    username: configService.get('POSTGRES_USER', 'orgstack_user'),
                    password: configService.get('POSTGRES_PASSWORD', 'orgstack_pass'),
                    autoLoadEntities: true,
                    synchronize: false,
                }),
            }),
            NotificationModule,
        ],
        controllers: [AppController],
        providers: [AppService],
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map