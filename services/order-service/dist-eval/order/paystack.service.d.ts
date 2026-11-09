import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export declare class PaystackService {
    private readonly httpService;
    private readonly configService;
    private readonly secretKey;
    private readonly baseUrl;
    constructor(httpService: HttpService, configService: ConfigService);
    initializePayment(email: string, amountInKobo: number, saleReference: string): Promise<{
        authorizationUrl: any;
        reference: any;
    }>;
    verifyPayment(reference: string): Promise<{
        verified: boolean;
        amount: any;
        reference: any;
    } | {
        verified: boolean;
        amount?: undefined;
        reference?: undefined;
    }>;
}
