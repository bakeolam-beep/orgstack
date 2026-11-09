var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, } from 'typeorm';
import { Sale } from './sale.entity.js';
let SaleItem = class SaleItem {
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], SaleItem.prototype, "id", void 0);
__decorate([
    Column({ type: 'uuid', nullable: false, name: 'saleId' }),
    __metadata("design:type", String)
], SaleItem.prototype, "saleId", void 0);
__decorate([
    ManyToOne(() => Sale),
    JoinColumn({ name: 'saleId' }),
    __metadata("design:type", Sale)
], SaleItem.prototype, "sale", void 0);
__decorate([
    Column({ type: 'uuid', nullable: false, name: 'productId' }),
    __metadata("design:type", String)
], SaleItem.prototype, "productId", void 0);
__decorate([
    Column({ type: 'varchar', length: 255, nullable: false, name: 'productName' }),
    __metadata("design:type", String)
], SaleItem.prototype, "productName", void 0);
__decorate([
    Column({ type: 'int', nullable: false }),
    __metadata("design:type", Number)
], SaleItem.prototype, "quantity", void 0);
__decorate([
    Column({ type: 'decimal', precision: 12, scale: 2, nullable: false, name: 'unitPrice' }),
    __metadata("design:type", Number)
], SaleItem.prototype, "unitPrice", void 0);
__decorate([
    CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'createdAt' }),
    __metadata("design:type", Date)
], SaleItem.prototype, "createdAt", void 0);
SaleItem = __decorate([
    Entity({ name: 'sale_items' })
], SaleItem);
export { SaleItem };
//# sourceMappingURL=sale-item.entity.js.map