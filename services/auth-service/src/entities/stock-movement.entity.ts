import { Column, CreateDateColumn, Entity, ForeignKey, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Product } from './product.entity.js';

export enum StockMovementType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment',
}

@Entity({ schema: 'tenant', name: 'stock_movements' })
export class StockMovement {
  @PrimaryColumn({ type: 'uuid', generated: true })
  id: string;

  @Column({ type: 'uuid' })
  productId: string;

  @ForeignKey(() => Product)
  @JoinColumn({ name: 'productId', foreignKeyName: 'FK_stock_movements_product' })
  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  product: Product;

  @Column({ type: 'int' })
  quantityChange: number;

  @Column({ type: 'enum', enum: StockMovementType })
  type: StockMovementType;

  @Column({ type: 'varchar', length: 128, nullable: true })
  reference: string | null;

  @CreateDateColumn()
  createdAt: Date;
}