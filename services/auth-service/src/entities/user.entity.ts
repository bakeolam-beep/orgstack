import { Column, CreateDateColumn, Entity, ForeignKey, JoinColumn, ManyToOne, PrimaryColumn, Unique } from 'typeorm';
import { Tenant } from './tenant.entity.js';

export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity({ schema: 'platform', name: 'users' })
@Unique(['email'])
export class User {
  @PrimaryColumn({ type: 'uuid', generated: true })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ForeignKey(() => Tenant)
  @JoinColumn({ name: 'tenantId', foreignKeyName: 'FK_users_tenant' })
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.MEMBER })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date | null;
}