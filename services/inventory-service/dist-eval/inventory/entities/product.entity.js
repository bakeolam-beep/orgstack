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
let Product = class Product {
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], Product.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 255, nullable: false }),
    __metadata("design:type", String)
], Product.prototype, "name", void 0);
__decorate([
    Column({ type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], Product.prototype, "sku", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Product.prototype, "description", void 0);
__decorate([
    Column({ type: 'decimal', precision: 12, scale: 2, nullable: false }),
    __metadata("design:type", Number)
], Product.prototype, "unitPrice", void 0);
__decorate([
    Column({ type: 'int', default: 0, nullable: false, name: 'reorderLevel' }),
    __metadata("design:type", Number)
], Product.prototype, "reorderLevel", void 0);
__decorate([
    CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'createdAt' }),
    __metadata("design:type", Date)
], Product.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', name: 'updatedAt' }),
    __metadata("design:type", Date)
], Product.prototype, "updatedAt", void 0);
Product = __decorate([
    Entity({ name: 'products' })
], Product);
export { Product };
//# sourceMappingURL=product.entity.js.map