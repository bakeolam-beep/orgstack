import { DataSource, EntityMetadata, QueryRunner } from "typeorm";
export interface AuthenticatedTenantUser {
    userId: string;
    tenantId: string;
}
export declare class TenantConnectionService {
    private readonly dataSource;
    private readonly tenantIdPattern;
    constructor(dataSource: DataSource);
    validateTenantId(tenantId: unknown): string;
    getTenantSchema(tenantId: unknown): string;
    quoteIdentifier(identifier: string): string;
    withTenantScope<T>(tenantId: unknown, operation: (queryRunner: QueryRunner, schema: string) => Promise<T>, options?: {
        includePlatformSchema?: boolean;
    }): Promise<T>;
    createTenantSchema(tenantId: unknown, entities?: EntityMetadata[]): Promise<void>;
    runTenantTableMigrations(_queryRunner: QueryRunner, _quotedSchema: string, entities: EntityMetadata[]): Promise<void>;
}
