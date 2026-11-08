import { Column, CreateDateColumn, Entity, ForeignKey, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Product } from './product.entity.js';
import { Sale } from './sale.entity.js';

@Entity({ schema: 'tenant', name: 'sale_items' })
export class SaleItem {
  @PrimaryColumn({ type: 'uuid', generated: true })
  id: string;

  @Column({ type: 'uuid' })
  saleId: string;

  @ForeignKey(() => Sale)
  @JoinColumn({ name: 'saleId', foreignKeyName: 'FK_sale_items_sale' })
  @ManyToOne(() => Sale, { onDelete: 'CASCADE' })
  sale: Sale;

  @Column({ type: 'uuid' })
  productId: string;

  @ForeignKey(() => Product)
  @JoinColumn({ name: 'productId', foreignKeyName: 'FK_sale_items_product' })
  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  product: Product;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @CreateDateColumn()
  createdAt: Date;
}