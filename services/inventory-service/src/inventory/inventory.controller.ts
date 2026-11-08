import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { InventoryService } from './inventory.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { StockMovementDto } from './dto/stock-movement.dto.js';
import { JwtAuthGuard } from '../shared/auth/jwt-auth.guard.js';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    tenantId: string;
    role: string;
  };
}

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Req() req: AuthenticatedRequest, @Body() dto: CreateProductDto) {
    const tenantId = req.user.tenantId;
    return this.inventoryService.createProduct(tenantId, dto);
  }

  @Get('products')
  async findAllProducts(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.inventoryService.findAllProducts(tenantId);
  }

  @Get('products/:id')
  async findOneProduct(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.inventoryService.findOneProduct(tenantId, id);
  }

  @Patch('products/:id')
  async updateProduct(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.inventoryService.updateProduct(tenantId, id, dto);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.OK)
  async deleteProduct(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.inventoryService.deleteProduct(tenantId, id);
  }

  @Post('stock-movements')
  @HttpCode(HttpStatus.CREATED)
  async recordStockMovement(@Req() req: AuthenticatedRequest, @Body() dto: StockMovementDto) {
    const tenantId = req.user.tenantId;
    return this.inventoryService.recordStockMovement(tenantId, dto);
  }

  @Get('stock-summary')
  async getStockSummary(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.inventoryService.getStockSummary(tenantId);
  }
}