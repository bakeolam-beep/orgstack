import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sale } from './sale.entity.js';

@Entity({ name: 'sale_items' })
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, name: 'saleId' })
  saleId: string;

  @ManyToOne(() => Sale)
  @JoinColumn({ name: 'saleId' })
  sale: Sale;

  @Column({ type: 'uuid', nullable: false, name: 'productId' })
  productId: string;

  @Column({ type: 'varchar', length: 255, nullable: false, name: 'productName' })
  productName: string;

  @Column({ type: 'int', nullable: false })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false, name: 'unitPrice' })
  unitPrice: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'createdAt' })
  createdAt: Date;
}
