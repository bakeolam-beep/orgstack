import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { NotificationController } from './notification/notification.controller.js';
async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.enableCors();
    const rabbitmqUrl = configService.get('RABBITMQ_URL', 'amqp://orgstack_mq:orgstack_mq_pass@localhost:5672');
    app.connectMicroservice({
        transport: Transport.RMQ,
        options: {
            urls: [rabbitmqUrl],
            queue: 'low_stock_alerts',
            queueOptions: { durable: true },
            noAck: false,
        },
    });
    await app.startAllMicroservices();
    console.log('[NotificationService] Microservice started and listening on low_stock_alerts queue');
    const notificationController = app.get(NotificationController);
    const microservices = app.getMicroservices();
    if (microservices.length > 0) {
        const microserviceInstance = microservices[0];
        const server = microserviceInstance.serverInstance;
        if (server && server.messageHandlers) {
            const handler = (payload, context) => notificationController.handleLowStockEvent(payload, context);
            handler.isEventHandler = true;
            handler.extras = {};
            server.messageHandlers.set('low_stock_alerts', handler);
        }
        else if (microserviceInstance.messageHandlers) {
            const handler = (payload, context) => notificationController.handleLowStockEvent(payload, context);
            handler.isEventHandler = true;
            handler.extras = {};
            microserviceInstance.messageHandlers.set('low_stock_alerts', handler);
        }
    }
    await app.listen(process.env.NOTIFICATION_SERVICE_PORT ?? process.env.PORT ?? 3004);
}
await bootstrap();
//# sourceMappingURL=main.js.map