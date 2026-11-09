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
import { Product } from './product.entity.js';
export var StockMovementType;
(function (StockMovementType) {
    StockMovementType["IN"] = "in";
    StockMovementType["OUT"] = "out";
    StockMovementType["ADJUSTMENT"] = "adjustment";
})(StockMovementType || (StockMovementType = {}));
let StockMovement = class StockMovement {
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], StockMovement.prototype, "id", void 0);
__decorate([
    Column({ type: 'uuid', nullable: false, name: 'productId' }),
    __metadata("design:type", String)
], StockMovement.prototype, "productId", void 0);
__decorate([
    ManyToOne(() => Product),
    JoinColumn({ name: 'productId' }),
    __metadata("design:type", Product)
], StockMovement.prototype, "product", void 0);
__decorate([
    Column({ type: 'int', nullable: false, name: 'quantityChange' }),
    __metadata("design:type", Number)
], StockMovement.prototype, "quantityChange", void 0);
__decorate([
    Column({ type: 'enum', enum: StockMovementType, nullable: false }),
    __metadata("design:type", String)
], StockMovement.prototype, "type", void 0);
__decorate([
    Column({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], StockMovement.prototype, "reference", void 0);
__decorate([
    CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'createdAt' }),
    __metadata("design:type", Date)
], StockMovement.prototype, "createdAt", void 0);
StockMovement = __decorate([
    Entity({ name: 'stock_movements' })
], StockMovement);
export { StockMovement };
//# sourceMappingURL=stock-movement.entity.js.map