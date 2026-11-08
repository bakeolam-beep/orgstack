import { Column, CreateDateColumn, Entity, PrimaryColumn, Unique } from 'typeorm';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

@Entity({ schema: 'platform', name: 'tenants' })
@Unique(['schemaName'])
export class Tenant {
  @PrimaryColumn({ type: 'uuid', generated: true })
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 128, unique: true })
  schemaName: string;

  @Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.ACTIVE })
  status: TenantStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date | null;
}