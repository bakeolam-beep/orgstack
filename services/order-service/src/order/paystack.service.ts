import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AxiosError } from 'axios';

@Injectable()
export class PaystackService {
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY', '');
  }

  async initializePayment(email: string, amountInKobo: number, saleReference: string) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/transaction/initialize`,
        { email, amount: amountInKobo, reference: saleReference },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      ).pipe(
        catchError((error: AxiosError) => {
          const message = (error.response?.data as any)?.message ?? (error as any)?.message ?? String(error);
          throw new Error(`Paystack initialization failed: ${message}`);
        }),
      ),
    );

    const data = response.data;
    if (!data.status) {
      throw new Error(data.message || 'Paystack initialization failed');
    }
    return {
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    };
  }

  async verifyPayment(reference: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/transaction/verify/${reference}`, {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }),
      );
      const data = response.data;
      if (data.status && data.data?.status === 'success') {
        return { verified: true, amount: data.data.amount, reference: data.data.reference };
      }
      return { verified: false };
    } catch {
      return { verified: false };
    }
  }
}
