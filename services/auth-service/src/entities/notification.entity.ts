import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export enum NotificationType {
  STOCK_LOW = 'stock_low',
  SALE_COMPLETED = 'sale_completed',
  SALE_FAILED = 'sale_failed',
  SYSTEM = 'system',
}

@Entity({ schema: 'tenant', name: 'notifications' })
export class Notification {
  @PrimaryColumn({ type: 'uuid', generated: true })
  id: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}