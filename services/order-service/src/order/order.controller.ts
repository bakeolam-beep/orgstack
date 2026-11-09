import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { OrderService } from './order.service.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { JwtAuthGuard } from '../shared/auth/jwt-auth.guard.js';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    tenantId: string;
    role: string;
    email?: string;
  };
  rawBody?: Buffer | string;
}

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createSale(@Req() req: AuthenticatedRequest, @Body() dto: CreateSaleDto) {
    const tenantId = req.user.tenantId;
    const bearerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
    return this.orderService.createSale(tenantId, dto, bearerToken);
  }

  @Post(':saleReference/pay')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async initializePayment(
    @Req() req: AuthenticatedRequest,
    @Param('saleReference') saleReference: string,
    @Body('email') userEmail?: string,
  ) {
    const tenantId = req.user.tenantId;
    const email = userEmail ?? req.user.email ?? '';
    if (!email) {
      throw new BadRequestException('Email is required to initialize payment');
    }
    return this.orderService.initializePayment(tenantId, saleReference, email);
  }

  @Post('verify-payment')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Req() req: AuthenticatedRequest, @Body() dto: VerifyPaymentDto) {
    const tenantId = req.user.tenantId;
    return this.orderService.verifyPayment(tenantId, dto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() req: AuthenticatedRequest) {
    const signature = req.headers['x-paystack-signature'] as string;
    const raw = req.rawBody;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(Buffer.from(raw as Buffer).toString());
    return this.orderService.handlePaystackWebhook(parsed, signature ?? '');
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getSales(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.orderService.getSales(tenantId);
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  async getSalesSummary(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.orderService.getSalesSummary(tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getSaleById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.orderService.getSaleById(tenantId, id);
  }
}
