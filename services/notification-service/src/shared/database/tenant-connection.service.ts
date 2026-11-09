import { Injectable } from '@nestjs/common';
import { DataSource, EntityMetadata, QueryRunner } from 'typeorm';

export interface AuthenticatedTenantUser {
  userId: string;
  tenantId: string;
}

interface ColumnMetadata {
  propertyName: string;
  databaseName?: string;
  type: unknown;
  length?: string | number;
  precision?: number | null;
  scale?: number | null;
  isPrimary: boolean;
  isGenerated: boolean;
  generationStrategy?: string;
  isUnique: boolean;
  isNullable: boolean;
  enum?: unknown[] | Record<string, unknown>;
  enumName?: string;
  createDate?: boolean;
  updateDate?: boolean;
  default?: unknown;
}

interface RelationMetadata {
  propertyName: string;
  isManyToOne: boolean;
  isOneToOne: boolean;
  joinColumns: Array<{ databaseName?: string; propertyName: string; referencedColumn?: { databaseName?: string; propertyName: string } }>;
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
      await queryRunner.query(`SET search_path TO ${searchPath}`);
      return await operation(queryRunner, schema);
    } finally {
      try {
        await queryRunner.query('RESET search_path');
      } catch {}
      await queryRunner.release();
    }
  }

  async createTenantSchema(tenantId: unknown, entities: EntityMetadata[] = []): Promise<void> {
    const schema = this.getTenantSchema(tenantId);
    const quotedSchema = this.quoteIdentifier(schema);
    const searchPath = `${quotedSchema}, public`;
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema}`);
      await queryRunner.query(`SET LOCAL search_path TO ${searchPath}`);
      await this.ensureTenantTablesInScope(queryRunner, quotedSchema, entities);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Compatible with: (tenantId, entities) OR (queryRunner, quotedSchema, entities)
  async ensureTenantTables(
    tenantIdOrQueryRunner: unknown,
    entitiesOrQuotedSchema: EntityMetadata[] | string = [],
    maybeEntities: EntityMetadata[] = [],
  ): Promise<void> {
    if (typeof tenantIdOrQueryRunner === 'string') {
      const tenantId = tenantIdOrQueryRunner;
      const entities = Array.isArray(entitiesOrQuotedSchema) ? entitiesOrQuotedSchema : maybeEntities;
      const schema = this.getTenantSchema(tenantId);
      const quotedSchema = this.quoteIdentifier(schema);
      const searchPath = `${quotedSchema}, public`;
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema}`);
        await queryRunner.query(`SET LOCAL search_path TO ${searchPath}`);
        await this.ensureTenantTablesInScope(queryRunner, quotedSchema, entities);
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
      return;
    }
    const queryRunner = tenantIdOrQueryRunner as QueryRunner;
    const quotedSchema = String(entitiesOrQuotedSchema);
    const entities = maybeEntities;
    await this.ensureTenantTablesInScope(queryRunner, quotedSchema, entities);
  }

  async runTenantTableMigrations(
    queryRunner: QueryRunner,
    quotedSchema: string,
    entities: EntityMetadata[],
  ): Promise<void> {
    await this.ensureTenantTablesInScope(queryRunner, quotedSchema, entities);
  }

  private async ensureTenantTablesInScope(
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
        const def = this.buildColumnDef(tableName, column);
        columns.push(def.colDef);
        if (def.checkConstraint) checkConstraints.push(def.checkConstraint);
      }

      const fkDefs: string[] = [];
      for (const rel of entity.relations as unknown as RelationMetadata[]) {
        if ((rel.isManyToOne || rel.isOneToOne) && rel.joinColumns?.length) {
          const fkName = this.quoteIdentifier(`fk_${tableName}_${rel.propertyName}`);
          const join = rel.joinColumns[0];
          const fkCol = this.quoteIdentifier(join.databaseName ?? join.propertyName ?? `${rel.propertyName}Id`);
          const refEntity = rel.inverseEntityMetadata;
          if (!refEntity) continue;
          const refTable = this.quoteIdentifier(refEntity.tableName);
          const refCol = this.quoteIdentifier(join.referencedColumn?.databaseName ?? join.referencedColumn?.propertyName ?? 'id');
          fkDefs.push(
            `CONSTRAINT ${fkName} FOREIGN KEY (${fkCol}) REFERENCES ${refTable}(${refCol}) ON DELETE ${rel.onDelete ?? 'CASCADE'}`,
          );
        }
      }

      const allConstraints = [...columns, ...fkDefs, ...checkConstraints];
      const sql = `CREATE TABLE IF NOT EXISTS ${quotedTable} (${allConstraints.join(', ')})`;
      await _queryRunner.query(sql);
    }

    await this.syncTableColumns(_queryRunner, _quotedSchema, entities);
  }

  private async syncTableColumns(
    queryRunner: QueryRunner,
    _quotedSchema: string,
    entities: EntityMetadata[],
  ): Promise<void> {
    for (const entity of entities) {
      const tableName = entity.tableName;
      if (!tableName) continue;
      const quotedTable = this.quoteIdentifier(tableName);

      const existingColumnsResult = await queryRunner.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = current_schema()`,
        [tableName],
      );
      const existingColumns = new Set<string>(existingColumnsResult.map((row: any) => row.column_name));

      for (const column of entity.columns as unknown as ColumnMetadata[]) {
        const columnName = column.databaseName ?? column.propertyName;
        if (existingColumns.has(columnName)) continue;
        const colType = this.resolveColumnType(column);
        const quotedColumn = this.quoteIdentifier(columnName);
        let alterSql = `ALTER TABLE ${quotedTable} ADD COLUMN IF NOT EXISTS ${quotedColumn} ${colType}`;
        if (!column.isNullable) {
          const def = this.defaultForColumn(column);
          if (def) alterSql += ` ${def}`;
          else if (colType === 'boolean') alterSql += ' DEFAULT false';
          else if (colType.includes('int') || colType.startsWith('numeric') || colType.startsWith('decimal')) alterSql += ' DEFAULT 0';
          else if (colType.includes('timestamp')) alterSql += ' DEFAULT CURRENT_TIMESTAMP';
          else alterSql += " DEFAULT ''";
        } else if (column.default !== undefined && column.default !== null) {
          const def = this.defaultForColumn(column);
          if (def) alterSql += ` ${def}`;
        }
        alterSql += column.isNullable ? ' NULL' : ' NOT NULL';
        await queryRunner.query(alterSql);
      }
    }
  }

  private buildColumnDef(tableName: string, column: ColumnMetadata): { colDef: string; checkConstraint?: string } {
    const columnName = column.databaseName ?? column.propertyName;
    const colType = this.resolveColumnType(column);
    let checkConstraint: string | undefined;

    if (column.enum && (Array.isArray(column.enum) ? column.enum.length > 0 : Object.keys(column.enum).length > 0)) {
      const enumValues = Array.isArray(column.enum) ? column.enum : Object.values(column.enum);
      const enumValuesStr = enumValues.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
      const constraintName = this.quoteIdentifier(`${tableName}_${columnName}_check`);
      checkConstraint = `CONSTRAINT ${constraintName} CHECK (${this.quoteIdentifier(columnName)} IN (${enumValuesStr}))`;
    }

    let colDef = `${this.quoteIdentifier(columnName)} ${colType}`;
    if (column.isPrimary) colDef += ' PRIMARY KEY';
    if (column.isGenerated) {
      const strategy = column.generationStrategy ?? ((colType === 'uuid') ? 'uuid' : 'increment');
      if (strategy === 'uuid' || colType === 'uuid') colDef += ' DEFAULT gen_random_uuid()';
      else colDef += ' GENERATED ALWAYS AS IDENTITY';
    }
    const defaultDef = this.defaultForColumn(column);
    if (defaultDef) colDef += ` ${defaultDef}`;
    colDef += column.isNullable ? ' NULL' : ' NOT NULL';
    return { colDef, checkConstraint };
  }

  private defaultForColumn(column: ColumnMetadata): string | null {
    if (column.createDate || column.updateDate) return 'DEFAULT CURRENT_TIMESTAMP';
    if (column.default === undefined || column.default === null) return null;
    if (typeof column.default === 'function') {
      try {
        const v = (column.default as () => unknown)();
        if (typeof v === 'string') {
          const upper = v.toUpperCase();
          if (upper.includes('CURRENT_TIMESTAMP') || upper.includes('NOW') || upper.includes('UUID')) return `DEFAULT ${v}`;
          return `DEFAULT '${v.replace(/'/g, "''")}'`;
        }
        return `DEFAULT ${String(v)}`;
      } catch {
        return null;
      }
    }
    if (typeof column.default === 'string') {
      const upper = column.default.toUpperCase();
      if (upper.includes('CURRENT_TIMESTAMP') || upper.includes('NOW') || upper.includes('UUID') || upper.startsWith('GEN_RANDOM_UUID')) return `DEFAULT ${column.default}`;
      return `DEFAULT '${column.default.replace(/'/g, "''")}'`;
    }
    if (typeof column.default === 'boolean') return `DEFAULT ${column.default}`;
    return `DEFAULT ${String(column.default)}`;
  }

  private resolveColumnType(column: ColumnMetadata): string {
    const t = column.type;
    if (t === String) return column.length ? `varchar(${column.length})` : 'varchar';
    if (t === Number) {
      if (column.isPrimary) return 'uuid';
      return 'integer';
    }
    if (t === Boolean) return 'boolean';
    if (t === Date) return 'timestamp';
    if (typeof t === 'string') {
      const s = t.toLowerCase();
      if (s === 'uuid') return 'uuid';
      if (s === 'int' || s === 'integer') return 'integer';
      if (s === 'float' || s === 'double' || s === 'real') return 'double precision';
      if (s === 'decimal' || s === 'numeric') {
        if (column.precision != null && column.scale != null) return `numeric(${column.precision},${column.scale})`;
        return 'numeric';
      }
      if (s === 'varchar' || s === 'character varying') return column.length ? `varchar(${column.length})` : 'varchar';
      if (s === 'text') return 'text';
      if (s === 'boolean' || s === 'bool') return 'boolean';
      if (s === 'timestamp' || s === 'datetime') return 'timestamp';
      if (s === 'timestamptz') return 'timestamptz';
      if (s === 'json') return 'json';
      if (s === 'jsonb') return 'jsonb';
      if (s === 'enum') return 'varchar';
      return t;
    }
    return 'varchar';
  }
}
