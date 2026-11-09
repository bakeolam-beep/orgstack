var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsArray, IsNumber, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
export class CreateSaleItemDto {
}
__decorate([
    IsUUID(),
    __metadata("design:type", String)
], CreateSaleItemDto.prototype, "productId", void 0);
__decorate([
    IsNumber(),
    Min(1),
    __metadata("design:type", Number)
], CreateSaleItemDto.prototype, "quantity", void 0);
__decorate([
    IsNumber(),
    __metadata("design:type", Number)
], CreateSaleItemDto.prototype, "unitPrice", void 0);
export class CreateSaleDto {
}
__decorate([
    IsArray(),
    ValidateNested({ each: true }),
    Type(() => CreateSaleItemDto),
    __metadata("design:type", Array)
], CreateSaleDto.prototype, "items", void 0);
//# sourceMappingURL=create-sale.dto.js.map