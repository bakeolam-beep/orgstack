import { Sale } from './sale.entity.js';
export declare class SaleItem {
    id: string;
    saleId: string;
    sale: Sale;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    createdAt: Date;
}
