import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export declare class InventoryClientService {
    private readonly httpService;
    private readonly configService;
    private readonly inventoryBaseUrl;
    constructor(httpService: HttpService, configService: ConfigService);
    deductStock(tenantId: string, productId: string, quantity: number, saleReference: string, bearerToken: string): Promise<any>;
    restoreStock(tenantId: string, productId: string, quantity: number, saleReference: string, bearerToken: string): Promise<any>;
}
