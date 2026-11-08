import { Injectable } from '@nestjs/common';
import { DataSource, EntityMetadata, QueryRunner } from 'typeorm';

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
      await queryRunner.query(`SET LOCAL search_path TO ${searchPath}`);
      return await operation(queryRunner, schema);
    } finally {
      await queryRunner.release();
    }
  }

  async createTenantSchema(
    tenantId: unknown,
    entities: EntityMetadata[] = [],
  ): Promise<void> {
    const schema = this.getTenantSchema(tenantId);
    const quotedSchema = this.quoteIdentifier(schema);
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema}`);
      await this.runTenantTableMigrations(queryRunner, quotedSchema, entities);
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
    entities: EntityMetadata[],
  ): Promise<void> {
    for (const entity of entities) {
      const tableName = entity.tableName;
      if (!tableName) continue;
      const quotedTable = this.quoteIdentifier(tableName);
      const columns: string[] = [];
      for (const column of entity.columns) {
        let colType: string;
        if (column.type === String) colType = 'varchar';
        else if (column.type === Number && column.primary) colType = 'uuid';
        else if (column.type === Number) colType = 'integer';
        else if (column.type === Date) colType = 'timestamp';
        else if (column.type === Boolean) colType = 'boolean';
        else if (typeof column.type === 'string') colType = column.type;
        else colType = 'varchar';

        let colDef = `${this.quoteIdentifier(column.propertyName)} ${colType}`;
        if (column.primary) colDef += ' PRIMARY KEY';
        if (column.isGenerated) colDef += ' GENERATED ALWAYS AS IDENTITY';
        if (column.unique) colDef += ' UNIQUE';
        if (column.isNullable) colDef += ' NULL';
        else colDef += ' NOT NULL';
        columns.push(colDef);
      }

      const fkDefs: string[] = [];
      for (const rel of entity.relations) {
        if (rel.foreignTableSchema !== 'tenant') continue;
        const fkName = this.quoteIdentifier(`fk_${tableName}_${rel.propertyName}`);
        const fkCol = this.quoteIdentifier(rel.joinColumns[0] ?? rel.propertyName + 'Id');
        const refTable = this.quoteIdentifier(rel.foreignTableName);
        const refCol = this.quoteIdentifier(rel.joinColumns[0] ?? 'id');
        fkDefs.push(
          `CONSTRAINT ${fkName} FOREIGN KEY (${fkCol}) REFERENCES ${refTable}(${refCol}) ON DELETE ${rel.onDelete ?? 'CASCADE'}`,
        );
      }

      const sql =
        `CREATE TABLE IF NOT EXISTS ${quotedTable} (${[...columns, ...fkDefs].join(', ')})`;
      await _queryRunner.query(sql);
    }
  }
}