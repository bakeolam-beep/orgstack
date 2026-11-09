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
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
let RabbitmqProducerService = class RabbitmqProducerService {
    constructor(client) {
        this.client = client;
    }
    publishLowStockEvent(tenantId, productId, productName, currentQuantity, reorderLevel) {
        const payload = {
            eventId: uuidv4(),
            eventType: 'LOW_STOCK',
            tenantId,
            productId,
            productName,
            currentQuantity,
            reorderLevel,
            timestamp: new Date().toISOString(),
        };
        this.client.emit('low_stock_alerts', payload);
    }
};
RabbitmqProducerService = __decorate([
    Injectable(),
    __param(0, Inject('RABBITMQ_SERVICE')),
    __metadata("design:paramtypes", [ClientProxy])
], RabbitmqProducerService);
export { RabbitmqProducerService };
//# sourceMappingURL=rabbitmq-producer.service.js.map