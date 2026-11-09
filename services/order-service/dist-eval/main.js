import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import * as express from 'express';
async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bodyParser: false });
    app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.enableCors();
    await app.listen(process.env.ORDER_SERVICE_PORT ?? process.env.PORT ?? 3003);
}
await bootstrap();
//# sourceMappingURL=main.js.map