import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { InventoryService } from './inventory.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { StockMovementDto } from './dto/stock-movement.dto.js';
import { JwtAuthGuard } from '../shared/auth/jwt-auth.guard.js';

interface AuthenticatedRequest extends Request {
  user: { userId: string; tenantId: string; role: string };
}

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(@Inject(InventoryService) private readonly inventoryService: InventoryService) {}

  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Req() req: AuthenticatedRequest, @Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(req.user.tenantId, dto);
  }

  @Get('products')
  async findAllProducts(@Req() req: AuthenticatedRequest) {
    return this.inventoryService.findAllProducts(req.user.tenantId);
  }

  @Get('products/:id')
  async findOneProduct(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.inventoryService.findOneProduct(req.user.tenantId, id);
  }

  @Patch('products/:id')
  async updateProduct(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.inventoryService.updateProduct(req.user.tenantId, id, dto);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.OK)
  async deleteProduct(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.inventoryService.deleteProduct(req.user.tenantId, id);
  }

  @Post('stock-movements')
  @HttpCode(HttpStatus.CREATED)
  async recordStockMovement(@Req() req: AuthenticatedRequest, @Body() dto: StockMovementDto) {
    return this.inventoryService.recordStockMovement(req.user.tenantId, dto);
  }

  @Get('stock-summary')
  async getStockSummary(@Req() req: AuthenticatedRequest) {
    return this.inventoryService.getStockSummary(req.user.tenantId);
  }
}
