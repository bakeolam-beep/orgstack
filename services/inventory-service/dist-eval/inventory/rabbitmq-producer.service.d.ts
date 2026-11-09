import { ClientProxy } from '@nestjs/microservices';
export interface LowStockEventPayload {
    eventId: string;
    eventType: 'LOW_STOCK';
    tenantId: string;
    productId: string;
    productName: string;
    currentQuantity: number;
    reorderLevel: number;
    timestamp: string;
}
export declare class RabbitmqProducerService {
    private readonly client;
    constructor(client: ClientProxy);
    publishLowStockEvent(tenantId: string, productId: string, productName: string, currentQuantity: number, reorderLevel: number): void;
}
