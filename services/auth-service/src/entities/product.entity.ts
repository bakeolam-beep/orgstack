import { Column, CreateDateColumn, Entity, ForeignKey, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'tenant', name: 'products' })
export class Product {
  @PrimaryColumn({ type: 'uuid', generated: true })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  sku: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: 'int', default: 0 })
  reorderLevel: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date | null;
}