import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AxiosError } from 'axios';

@Injectable()
export class InventoryClientService {
  private readonly inventoryBaseUrl: string;

  constructor(
    @Inject(HttpService) private readonly httpService: HttpService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const cfg = this.configService as ConfigService | undefined;
    this.inventoryBaseUrl =
      cfg?.get?.('INVENTORY_SERVICE_URL') ?? process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3002';
  }

  async deductStock(tenantId: string, productId: string, quantity: number, saleReference: string, bearerToken: string) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.inventoryBaseUrl}/inventory/stock-movements`,
        { productId, quantity, type: 'out', reference: saleReference },
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
          },
        },
      ).pipe(
        catchError((error: AxiosError) => {
          const status = error.response?.status;
          const message = (error.response?.data as any)?.message ?? (error as any)?.message ?? String(error);
          throw new Error(`Inventory service returned ${status}: ${message}`);
        }),
      ),
    );
    return response.data;
  }

  async restoreStock(tenantId: string, productId: string, quantity: number, saleReference: string, bearerToken: string) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.inventoryBaseUrl}/inventory/stock-movements`,
        { productId, quantity, type: 'in', reference: `COMPENSATE-${saleReference}` },
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
          },
        },
      ).pipe(
        catchError((error: AxiosError) => {
          const status = error.response?.status;
          const message = (error.response?.data as any)?.message ?? (error as any)?.message ?? String(error);
          throw new Error(`Inventory service returned ${status}: ${message}`);
        }),
      ),
    );
    return response.data;
  }
}
