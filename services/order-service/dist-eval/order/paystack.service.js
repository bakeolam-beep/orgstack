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
let PaystackService = class PaystackService {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.baseUrl = 'https://api.paystack.co';
        const cfg = this.configService;
        this.secretKey = cfg?.get?.('PAYSTACK_SECRET_KEY') ?? process.env.PAYSTACK_SECRET_KEY ?? '';
    }
    async initializePayment(email, amountInKobo, saleReference) {
        const response = await firstValueFrom(this.httpService.post(`${this.baseUrl}/transaction/initialize`, { email, amount: amountInKobo, reference: saleReference }, {
            headers: {
                Authorization: `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json',
            },
        }).pipe(catchError((error) => {
            const message = error.response?.data?.message ?? error?.message ?? String(error);
            throw new Error(`Paystack initialization failed: ${message}`);
        })));
        const data = response.data;
        if (!data.status) {
            throw new Error(data.message || 'Paystack initialization failed');
        }
        return {
            authorizationUrl: data.data.authorization_url,
            reference: data.data.reference,
        };
    }
    async verifyPayment(reference) {
        try {
            const response = await firstValueFrom(this.httpService.get(`${this.baseUrl}/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                },
            }));
            const data = response.data;
            if (data.status && data.data?.status === 'success') {
                return { verified: true, amount: data.data.amount, reference: data.data.reference };
            }
            return { verified: false };
        }
        catch {
            return { verified: false };
        }
    }
};
PaystackService = __decorate([
    Injectable(),
    __param(0, Inject(HttpService)),
    __param(1, Inject(ConfigService)),
    __metadata("design:paramtypes", [HttpService,
        ConfigService])
], PaystackService);
export { PaystackService };
//# sourceMappingURL=paystack.service.js.map