import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { DatabaseInitService } from './database-init.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const dbInit = app.get(DatabaseInitService);
  await dbInit.initialize();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  await app.listen(process.env.AUTH_SERVICE_PORT ?? process.env.PORT ?? 3001);
}
await bootstrap();