import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, Unique } from 'typeorm';
import { SaleItem } from './sale-item.entity.js';

export enum SaleStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

@Entity({ schema: 'tenant', name: 'sales' })
@Unique(['saleReference'])
export class Sale {
  @PrimaryColumn({ type: 'uuid', generated: true })
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  saleReference: string;

  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.PENDING })
  status: SaleStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date | null;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true, onDelete: 'CASCADE' })
  items: SaleItem[];
}