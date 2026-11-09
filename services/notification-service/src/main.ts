import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { NotificationController } from './notification/notification.controller.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const rabbitmqUrl = configService.get<string>('RABBITMQ_URL', 'amqp://orgstack_mq:orgstack_mq_pass@localhost:5672');
  app.connectMicroservice<MicroserviceOptions>({
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

  // Manually register the event handler in the microservice's message handlers
  // In hybrid apps, handlers from the main app are not auto-registered in the microservice
  const notificationController = app.get(NotificationController);
  const microservices = app.getMicroservices();
  if (microservices.length > 0) {
    const microserviceInstance = microservices[0] as any;
    // The actual RMQ server is in serverInstance
    const server = microserviceInstance.serverInstance;
    if (server && server.messageHandlers) {
      console.log('[NotificationService] messageHandlers before registration:', server.messageHandlers);
      // The server expects the handler to be a function directly, not an object
      const handler = (payload: any, context: any) => notificationController.handleLowStockEvent(payload, context);
      // Mark as event handler like the original
      (handler as any).isEventHandler = true;
      (handler as any).extras = {};
      server.messageHandlers.set('low_stock_alerts', handler);
      console.log('[NotificationService] messageHandlers after registration:', server.messageHandlers);
      console.log('[NotificationService] Manually registered low_stock_alerts handler on serverInstance');
    } else if (microserviceInstance.messageHandlers) {
      const handler = (payload: any, context: any) => notificationController.handleLowStockEvent(payload, context);
      (handler as any).isEventHandler = true;
      (handler as any).extras = {};
      microserviceInstance.messageHandlers.set('low_stock_alerts', handler);
      console.log('[NotificationService] Manually registered low_stock_alerts handler on microserviceInstance');
    } else {
      console.log('[NotificationService] Could not find messageHandlers on serverInstance or microserviceInstance');
      if (server) {
        console.log('[NotificationService] serverInstance keys:', Object.keys(server));
      }
    }
  } else {
    console.log('[NotificationService] No microservices found');
  }

  await app.listen(process.env.NOTIFICATION_SERVICE_PORT ?? process.env.PORT ?? 3004);
}
await bootstrap();