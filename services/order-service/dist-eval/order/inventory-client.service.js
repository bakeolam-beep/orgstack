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
import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
let InventoryClientService = class InventoryClientService {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        const cfg = this.configService;
        this.inventoryBaseUrl =
            cfg?.get?.('INVENTORY_SERVICE_URL') ?? process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3002';
    }
    async deductStock(tenantId, productId, quantity, saleReference, bearerToken) {
        const response = await firstValueFrom(this.httpService.post(`${this.inventoryBaseUrl}/inventory/stock-movements`, { productId, quantity, type: 'out', reference: saleReference }, {
            headers: {
                Authorization: `Bearer ${bearerToken}`,
                'Content-Type': 'application/json',
            },
        }).pipe(catchError((error) => {
            const status = error.response?.status;
            const message = error.response?.data?.message ?? error?.message ?? String(error);
            throw new Error(`Inventory service returned ${status}: ${message}`);
        })));
        return response.data;
    }
    async restoreStock(tenantId, productId, quantity, saleReference, bearerToken) {
        const response = await firstValueFrom(this.httpService.post(`${this.inventoryBaseUrl}/inventory/stock-movements`, { productId, quantity, type: 'in', reference: `COMPENSATE-${saleReference}` }, {
            headers: {
                Authorization: `Bearer ${bearerToken}`,
                'Content-Type': 'application/json',
            },
        }).pipe(catchError((error) => {
            const status = error.response?.status;
            const message = error.response?.data?.message ?? error?.message ?? String(error);
            throw new Error(`Inventory service returned ${status}: ${message}`);
        })));
        return response.data;
    }
};
InventoryClientService = __decorate([
    Injectable(),
    __param(0, Inject(HttpService)),
    __param(1, Inject(ConfigService)),
    __metadata("design:paramtypes", [HttpService,
        ConfigService])
], InventoryClientService);
export { InventoryClientService };
//# sourceMappingURL=inventory-client.service.js.map