var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { StockMovementDto } from './dto/stock-movement.dto.js';
import { JwtAuthGuard } from '../shared/auth/jwt-auth.guard.js';
let InventoryController = class InventoryController {
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    async createProduct(req, dto) {
        return this.inventoryService.createProduct(req.user.tenantId, dto);
    }
    async findAllProducts(req) {
        return this.inventoryService.findAllProducts(req.user.tenantId);
    }
    async findOneProduct(req, id) {
        return this.inventoryService.findOneProduct(req.user.tenantId, id);
    }
    async updateProduct(req, id, dto) {
        return this.inventoryService.updateProduct(req.user.tenantId, id, dto);
    }
    async deleteProduct(req, id) {
        return this.inventoryService.deleteProduct(req.user.tenantId, id);
    }
    async recordStockMovement(req, dto) {
        return this.inventoryService.recordStockMovement(req.user.tenantId, dto);
    }
    async getStockSummary(req) {
        return this.inventoryService.getStockSummary(req.user.tenantId);
    }
};
__decorate([
    Post('products'),
    HttpCode(HttpStatus.CREATED),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateProductDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "createProduct", null);
__decorate([
    Get('products'),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findAllProducts", null);
__decorate([
    Get('products/:id'),
    __param(0, Req()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "findOneProduct", null);
__decorate([
    Patch('products/:id'),
    __param(0, Req()),
    __param(1, Param('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, UpdateProductDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "updateProduct", null);
__decorate([
    Delete('products/:id'),
    HttpCode(HttpStatus.OK),
    __param(0, Req()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "deleteProduct", null);
__decorate([
    Post('stock-movements'),
    HttpCode(HttpStatus.CREATED),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, StockMovementDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "recordStockMovement", null);
__decorate([
    Get('stock-summary'),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getStockSummary", null);
InventoryController = __decorate([
    Controller('inventory'),
    UseGuards(JwtAuthGuard),
    __param(0, Inject(InventoryService)),
    __metadata("design:paramtypes", [InventoryService])
], InventoryController);
export { InventoryController };
//# sourceMappingURL=inventory.controller.js.map