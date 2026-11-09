var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
let TenantConnectionService = class TenantConnectionService {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.tenantIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/;
    }
    validateTenantId(tenantId) {
        if (typeof tenantId !== 'string' || !this.tenantIdPattern.test(tenantId)) {
            throw new Error('Invalid tenant ID');
        }
        return tenantId;
    }
    getTenantSchema(tenantId) {
        return `tenant_${this.validateTenantId(tenantId)}`;
    }
    quoteIdentifier(identifier) {
        return `"${identifier.replace(/"/g, '""')}"`;
    }
    async withTenantScope(tenantId, operation, options) {
        const schema = this.getTenantSchema(tenantId);
        const searchPath = options?.includePlatformSchema
            ? `${this.quoteIdentifier(schema)}, ${this.quoteIdentifier('platform')}, public`
            : `${this.quoteIdentifier(schema)}, public`;
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
            await queryRunner.query(`SET search_path TO ${searchPath}`);
            return await operation(queryRunner, schema);
        }
        finally {
            await queryRunner.release();
        }
    }
    async createTenantSchema(tenantId, entities = []) {
        const schema = this.getTenantSchema(tenantId);
        const quotedSchema = this.quoteIdentifier(schema);
        const searchPath = `${quotedSchema}, public`;
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema}`);
            await queryRunner.query(`SET search_path TO ${searchPath}`);
            await this.runTenantTableMigrations(queryRunner, quotedSchema, entities);
            await queryRunner.commitTransaction();
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async ensureTenantTables(tenantId, entities = []) {
        const schema = this.getTenantSchema(tenantId);
        const quotedSchema = this.quoteIdentifier(schema);
        const searchPath = `${quotedSchema}, public`;
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema}`);
            await queryRunner.query(`SET search_path TO ${searchPath}`);
            await this.runTenantTableMigrations(queryRunner, quotedSchema, entities);
            await this.syncTableColumns(queryRunner, quotedSchema, entities);
            await queryRunner.commitTransaction();
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async runTenantTableMigrations(_queryRunner, _quotedSchema, entities) {
        for (const entity of entities) {
            const tableName = entity.tableName;
            if (!tableName)
                continue;
            const quotedTable = this.quoteIdentifier(tableName);
            const columns = [];
            const checkConstraints = [];
            for (const column of entity.columns) {
                let colType;
                let isUuidPrimary = false;
                let defaultValue = null;
                if (column.type === String)
                    colType = 'varchar';
                else if ((column.type === Number || column.type === 'uuid' || column.type === 'UUID') && column.isPrimary) {
                    colType = 'uuid';
                    isUuidPrimary = true;
                }
                else if (column.type === Number)
                    colType = 'integer';
                else if (column.type === Date)
                    colType = 'timestamp';
                else if (column.type === Boolean)
                    colType = 'boolean';
                else if (typeof column.type === 'string' && column.enum && Array.isArray(column.enum) && column.enum.length > 0) {
                    colType = 'varchar';
                    const enumValues = column.enum;
                    const enumValuesStr = enumValues.map(v => `'${v}'`).join(', ');
                    const constraintName = this.quoteIdentifier(`${tableName}_${column.propertyName}_check`);
                    checkConstraints.push(`CONSTRAINT ${constraintName} CHECK (${this.quoteIdentifier(column.propertyName)} IN (${enumValuesStr}))`);
                }
                else if (typeof column.type === 'string')
                    colType = column.type;
                else
                    colType = 'varchar';
                const columnMeta = column;
                if (columnMeta.createDate) {
                    defaultValue = 'DEFAULT CURRENT_TIMESTAMP';
                }
                else if (columnMeta.updateDate) {
                    defaultValue = 'DEFAULT CURRENT_TIMESTAMP';
                }
                else if (column.default !== undefined && column.default !== null) {
                    if (typeof column.default === 'function') {
                        defaultValue = `DEFAULT ${column.default()}`;
                    }
                    else if (typeof column.default === 'string') {
                        defaultValue = `DEFAULT '${String(column.default).replace(/'/g, "''")}'`;
                    }
                    else {
                        defaultValue = `DEFAULT ${column.default}`;
                    }
                }
                let colDef = `${this.quoteIdentifier(column.propertyName)} ${colType}`;
                if (column.isPrimary)
                    colDef += ' PRIMARY KEY';
                if (column.isGenerated) {
                    if (isUuidPrimary) {
                        colDef += ' DEFAULT gen_random_uuid()';
                    }
                    else {
                        colDef += ' GENERATED ALWAYS AS IDENTITY';
                    }
                }
                if (column.isUnique)
                    colDef += ' UNIQUE';
                if (column.isNullable)
                    colDef += ' NULL';
                else
                    colDef += ' NOT NULL';
                if (defaultValue)
                    colDef += ` ${defaultValue}`;
                columns.push(colDef);
            }
            const fkDefs = [];
            for (const rel of entity.relations) {
                if (rel.isManyToOne || rel.isOneToOne) {
                    const fkName = this.quoteIdentifier(`fk_${tableName}_${rel.propertyName}`);
                    const fkColName = rel.joinColumns[0]?.propertyName ?? `${rel.propertyName}Id`;
                    const fkCol = this.quoteIdentifier(fkColName);
                    const refEntity = rel.inverseEntityMetadata;
                    if (!refEntity)
                        continue;
                    const refTable = this.quoteIdentifier(refEntity.tableName);
                    const refCol = this.quoteIdentifier(rel.joinColumns[0]?.referencedColumn?.propertyName ?? 'id');
                    fkDefs.push(`CONSTRAINT ${fkName} FOREIGN KEY (${fkCol}) REFERENCES ${refTable}(${refCol}) ON DELETE ${rel.onDelete ?? 'CASCADE'}`);
                }
            }
            const allConstraints = [...columns, ...fkDefs, ...checkConstraints];
            const sql = `CREATE TABLE IF NOT EXISTS ${quotedTable} (${allConstraints.join(', ')})`;
            await _queryRunner.query(sql);
        }
    }
    async syncTableColumns(queryRunner, _quotedSchema, entities) {
        for (const entity of entities) {
            const tableName = entity.tableName;
            if (!tableName)
                continue;
            const quotedTable = this.quoteIdentifier(tableName);
            const existingColumnsResult = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = CURRENT_SCHEMA()
      `, [tableName]);
            const existingColumns = new Set(existingColumnsResult.map((row) => row.column_name));
            for (const column of entity.columns) {
                const columnName = column.propertyName;
                if (!existingColumns.has(columnName)) {
                    let colType;
                    if (column.type === String)
                        colType = 'varchar';
                    else if ((column.type === Number || column.type === 'uuid' || column.type === 'UUID') && column.isPrimary) {
                        colType = 'uuid';
                    }
                    else if (column.type === Number)
                        colType = 'integer';
                    else if (column.type === Date)
                        colType = 'timestamp';
                    else if (column.type === Boolean)
                        colType = 'boolean';
                    else if (typeof column.type === 'string' && column.enum && Array.isArray(column.enum) && column.enum.length > 0) {
                        colType = 'varchar';
                    }
                    else if (typeof column.type === 'string')
                        colType = column.type;
                    else
                        colType = 'varchar';
                    const quotedColumn = this.quoteIdentifier(columnName);
                    let alterSql = `ALTER TABLE ${quotedTable} ADD COLUMN ${quotedColumn} ${colType}`;
                    if (!column.isNullable) {
                        alterSql += ' NOT NULL';
                    }
                    if (column.default !== undefined && column.default !== null) {
                        if (typeof column.default === 'function') {
                            alterSql += ` DEFAULT ${column.default()}`;
                        }
                        else if (typeof column.default === 'string') {
                            alterSql += ` DEFAULT '${String(column.default).replace(/'/g, "''")}'`;
                        }
                        else {
                            alterSql += ` DEFAULT ${column.default}`;
                        }
                    }
                    else if (!column.isNullable) {
                        alterSql += ' DEFAULT \'\'';
                    }
                    await queryRunner.query(alterSql);
                }
            }
        }
    }
};
TenantConnectionService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [DataSource])
], TenantConnectionService);
export { TenantConnectionService };
//# sourceMappingURL=tenant-connection.service.js.map