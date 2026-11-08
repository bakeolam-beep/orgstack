"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantConnectionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let TenantConnectionService = class TenantConnectionService {
    dataSource;
    tenantIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/;
    constructor(dataSource) {
        this.dataSource = dataSource;
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
            await queryRunner.query(`SET LOCAL search_path TO ${searchPath}`);
            return await operation(queryRunner, schema);
        }
        finally {
            await queryRunner.release();
        }
    }
    async createTenantSchema(tenantId, entities = []) {
        const schema = this.getTenantSchema(tenantId);
        const quotedSchema = this.quoteIdentifier(schema);
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema}`);
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
    async runTenantTableMigrations(_queryRunner, _quotedSchema, entities) {
        for (const entity of entities) {
            const tableName = entity.tableName;
            if (!tableName)
                continue;
            const quotedTable = this.quoteIdentifier(tableName);
            const columns = [];
            for (const column of entity.columns) {
                let colType;
                if (column.type === String)
                    colType = 'varchar';
                else if (column.type === Number && column.isPrimary)
                    colType = 'uuid';
                else if (column.type === Number)
                    colType = 'integer';
                else if (column.type === Date)
                    colType = 'timestamp';
                else if (column.type === Boolean)
                    colType = 'boolean';
                else if (typeof column.type === 'string')
                    colType = column.type;
                else
                    colType = 'varchar';
                let colDef = `${this.quoteIdentifier(column.propertyName)} ${colType}`;
                if (column.isPrimary)
                    colDef += ' PRIMARY KEY';
                if (column.isGenerated)
                    colDef += ' GENERATED ALWAYS AS IDENTITY';
                if (column.isUnique)
                    colDef += ' UNIQUE';
                if (column.isNullable)
                    colDef += ' NULL';
                else
                    colDef += ' NOT NULL';
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
            const sql = `CREATE TABLE IF NOT EXISTS ${quotedTable} (${[...columns, ...fkDefs].join(', ')})`;
            await _queryRunner.query(sql);
        }
    }
};
exports.TenantConnectionService = TenantConnectionService;
exports.TenantConnectionService = TenantConnectionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], TenantConnectionService);
//# sourceMappingURL=tenant-connection.service.js.map