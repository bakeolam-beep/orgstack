import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

export interface AuthenticatedTenantUser {
  userId: string;
  tenantId: string;
}

@Injectable()
export class TenantConnectionService {
  private readonly tenantIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/;

  constructor(private readonly dataSource: DataSource) {}

  validateTenantId(tenantId: unknown): string {
    if (typeof tenantId !== 'string' || !this.tenantIdPattern.test(tenantId)) {
      throw new Error('Invalid tenant ID');
    }
    return tenantId;
  }

  getTenantSchema(tenantId: unknown): string {
    return `tenant_${this.validateTenantId(tenantId)}`;
    }

  quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  async withTenantScope<T>(
    tenantId: unknown,
    operation: (queryRunner: QueryRunner, schema: string) => Promise<T>,
    options?: { includePlatformSchema?: boolean },
  ): Promise<T> {
    const schema = this.getTenantSchema(tenantId);
    const searchPath = options?.includePlatformSchema
      ? `${this.quoteIdentifier(schema)}, ${this.quoteIdentifier('platform')}, public`
      : `${this.quoteIdentifier(schema)}, public`;
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    try {
      await queryRunner.query('SET LOCAL search_path TO ' + searchPath);
      return await operation(queryRunner, schema);
    } finally {
      await queryRunner.release();
    }
  }

  async createTenantSchema(tenantId: unknown): Promise<void> {
    const schema = this.getTenantSchema(tenantId);
    const quotedSchema = this.quoteIdentifier(schema);
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema}`);
      await this.runTenantTableMigrations(queryRunner, quotedSchema);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async runTenantTableMigrations(
    _queryRunner: QueryRunner,
    _quotedSchema: string,
  ): Promise<void> {
    // Infrastructure scaffold: tenant table migrations are applied by higher-level modules/services.
  }
}
