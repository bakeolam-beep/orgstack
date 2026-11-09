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
import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { JwtAuthGuard } from '../shared/auth/jwt-auth.guard.js';
let OrderController = class OrderController {
    constructor(orderService) {
        this.orderService = orderService;
    }
    async createSale(req, dto) {
        const bearerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
        return this.orderService.createSale(req.user.tenantId, dto, bearerToken);
    }
    async initializePayment(req, saleReference, userEmail) {
        const email = userEmail ?? req.user.email ?? '';
        if (!email)
            throw new BadRequestException('Email is required to initialize payment');
        return this.orderService.initializePayment(req.user.tenantId, saleReference, email);
    }
    async verifyPayment(req, dto) {
        return this.orderService.verifyPayment(req.user.tenantId, dto);
    }
    async handleWebhook(req) {
        const signature = req.headers['x-paystack-signature'];
        const raw = req.rawBody;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(Buffer.from(raw).toString());
        return this.orderService.handlePaystackWebhook(parsed, signature ?? '');
    }
    async getSales(req) {
        return this.orderService.getSales(req.user.tenantId);
    }
    async getSalesSummary(req) {
        return this.orderService.getSalesSummary(req.user.tenantId);
    }
    async getSaleById(req, id) {
        return this.orderService.getSaleById(req.user.tenantId, id);
    }
};
__decorate([
    Post(),
    UseGuards(JwtAuthGuard),
    HttpCode(HttpStatus.CREATED),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateSaleDto]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "createSale", null);
__decorate([
    Post(':saleReference/pay'),
    UseGuards(JwtAuthGuard),
    HttpCode(HttpStatus.OK),
    __param(0, Req()),
    __param(1, Param('saleReference')),
    __param(2, Body('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "initializePayment", null);
__decorate([
    Post('verify-payment'),
    UseGuards(JwtAuthGuard),
    HttpCode(HttpStatus.OK),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, VerifyPaymentDto]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "verifyPayment", null);
__decorate([
    Post('webhook'),
    HttpCode(HttpStatus.OK),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "handleWebhook", null);
__decorate([
    Get(),
    UseGuards(JwtAuthGuard),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getSales", null);
__decorate([
    Get('summary'),
    UseGuards(JwtAuthGuard),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getSalesSummary", null);
__decorate([
    Get(':id'),
    UseGuards(JwtAuthGuard),
    __param(0, Req()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OrderController.prototype, "getSaleById", null);
OrderController = __decorate([
    Controller('orders'),
    __param(0, Inject(OrderService)),
    __metadata("design:paramtypes", [OrderService])
], OrderController);
export { OrderController };
//# sourceMappingURL=order.controller.js.map