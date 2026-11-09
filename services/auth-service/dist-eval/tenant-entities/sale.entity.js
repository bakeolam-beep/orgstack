var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, } from 'typeorm';
export var SaleStatus;
(function (SaleStatus) {
    SaleStatus["PENDING"] = "pending";
    SaleStatus["COMPLETED"] = "completed";
    SaleStatus["FAILED"] = "failed";
})(SaleStatus || (SaleStatus = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["UNPAID"] = "unpaid";
    PaymentStatus["PAID"] = "paid";
    PaymentStatus["REFUNDED"] = "refunded";
})(PaymentStatus || (PaymentStatus = {}));
let Sale = class Sale {
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], Sale.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 100, unique: true, nullable: false, name: 'saleReference' }),
    __metadata("design:type", String)
], Sale.prototype, "saleReference", void 0);
__decorate([
    Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.PENDING, nullable: false }),
    __metadata("design:type", String)
], Sale.prototype, "status", void 0);
__decorate([
    Column({ type: 'decimal', precision: 12, scale: 2, nullable: false, name: 'totalAmount' }),
    __metadata("design:type", Number)
], Sale.prototype, "totalAmount", void 0);
__decorate([
    Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.UNPAID, nullable: false, name: 'paymentStatus' }),
    __metadata("design:type", String)
], Sale.prototype, "paymentStatus", void 0);
__decorate([
    CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'createdAt' }),
    __metadata("design:type", Date)
], Sale.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', name: 'updatedAt' }),
    __metadata("design:type", Date)
], Sale.prototype, "updatedAt", void 0);
Sale = __decorate([
    Entity({ name: 'sales' })
], Sale);
export { Sale };
//# sourceMappingURL=sale.entity.js.map