import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SaleStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

@Entity({ name: 'sales' })
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false, name: 'saleReference' })
  saleReference: string;

  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.FAILED, nullable: false })
  status: SaleStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false })
  totalAmount: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.UNPAID, nullable: false, name: 'paymentStatus' })
  paymentStatus: PaymentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'paystackReference' })
  paystackReference: string | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', name: 'updatedAt' })
  updatedAt: Date;
}
