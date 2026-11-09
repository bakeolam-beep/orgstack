import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';

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

  // Debug: List registered message handlers
  const microservice = app.get('MicroserviceOptions')?.['microservice'] || app.getMicroservices?.()[0];
  if (microservice) {
    console.log('[NotificationService] Registered message handlers:', Object.keys(microservice.messageHandlers || {}));
  }

  await app.listen(process.env.NOTIFICATION_SERVICE_PORT ?? process.env.PORT ?? 3004);
}
await bootstrap();