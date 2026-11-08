import { IsUUID, IsNumber, IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';

export class StockMovementDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsEnum(['in', 'out', 'adjustment'])
  type: 'in' | 'out' | 'adjustment';

  @IsString()
  @IsOptional()
  reference?: string;
}