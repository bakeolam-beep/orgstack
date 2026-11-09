import { Injectable } from '@nestjs/common';
import { DataSource, EntityMetadata, QueryRunner } from 'typeorm';

export interface AuthenticatedTenantUser {
  userId: string;
  tenantId: string;
}

interface ColumnMetadata {
  propertyName: string;
  type: unknown;
  isPrimary: boolean;
  isGenerated: boolean;
  isUnique: boolean;
  isNullable: boolean;
  enum?: unknown[];
}

interface RelationMetadata {
  propertyName: string;
  isManyToOne: boolean;
  isOneToOne: boolean;
  joinColumns: Array<{ propertyName: string; referencedColumn?: { propertyName: string } }>;
  inverseEntityMetadata?: { tableName: string };
  onDelete?: string;
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
      const checkConstraints: string[] = [];

      for (const column of entity.columns as unknown as ColumnMetadata[]) {
        let colType: string;
        let isUuidPrimary = false;
        if (column.type === String) colType = 'varchar';
        else if ((column.type === Number || column.type === 'uuid' || column.type === 'UUID') && column.isPrimary) {
          colType = 'uuid';
          isUuidPrimary = true;
        }
        else if (column.type === Number) colType = 'integer';
        else if (column.type === Date) colType = 'timestamp';
        else if (column.type === Boolean) colType = 'boolean';
        else if (typeof column.type === 'string' && column.enum && Array.isArray(column.enum) && column.enum.length > 0) {
          // Handle enum columns - use varchar with check constraint
          colType = 'varchar';
          const enumValues = column.enum as string[];
          const enumValuesStr = enumValues.map(v => `'${v}'`).join(', ');
          const constraintName = this.quoteIdentifier(`${tableName}_${column.propertyName}_check`);
          checkConstraints.push(
            `CONSTRAINT ${constraintName} CHECK (${this.quoteIdentifier(column.propertyName)} IN (${enumValuesStr}))`
          );
        }
        else if (typeof column.type === 'string') colType = column.type;
        else colType = 'varchar';

        let colDef = `${this.quoteIdentifier(column.propertyName)} ${colType}`;
        if (column.isPrimary) colDef += ' PRIMARY KEY';
        if (column.isGenerated) {
          if (isUuidPrimary) {
            colDef += ' DEFAULT gen_random_uuid()';
          } else {
            colDef += ' GENERATED ALWAYS AS IDENTITY';
          }
        }
        if (column.isUnique) colDef += ' UNIQUE';
        if (column.isNullable) colDef += ' NULL';
        else colDef += ' NOT NULL';
        columns.push(colDef);
      }

      const fkDefs: string[] = [];
      for (const rel of entity.relations as unknown as RelationMetadata[]) {
        if (rel.isManyToOne || rel.isOneToOne) {
          const fkName = this.quoteIdentifier(`fk_${tableName}_${rel.propertyName}`);
          const fkColName = rel.joinColumns[0]?.propertyName ?? `${rel.propertyName}Id`;
          const fkCol = this.quoteIdentifier(fkColName);
          const refEntity = rel.inverseEntityMetadata;
          if (!refEntity) continue;
          const refTable = this.quoteIdentifier(refEntity.tableName);
          const refCol = this.quoteIdentifier(rel.joinColumns[0]?.referencedColumn?.propertyName ?? 'id');
          fkDefs.push(
            `CONSTRAINT ${fkName} FOREIGN KEY (${fkCol}) REFERENCES ${refTable}(${refCol}) ON DELETE ${rel.onDelete ?? 'CASCADE'}`,
          );
        }
      }

      const allConstraints = [...columns, ...fkDefs, ...checkConstraints];
      const sql = `CREATE TABLE IF NOT EXISTS ${quotedTable} (${allConstraints.join(', ')})`;
      await _queryRunner.query(sql);
    }
  }
}