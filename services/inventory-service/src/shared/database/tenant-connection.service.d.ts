export interface AuthenticatedTenantUser { userId: string; tenantId: string; }
export declare class TenantConnectionService {
  constructor(dataSource: any);
  validateTenantId(tenantId: unknown): string;
  getTenantSchema(tenantId: unknown): string;
  quoteIdentifier(identifier: string): string;
  withTenantScope<T>(tenantId: unknown, operation: (queryRunner: any, schema: string) => Promise<T>, options?: { includePlatformSchema?: boolean }): Promise<T>;
  createTenantSchema(tenantId: unknown, entities?: any[]): Promise<void>;
  ensureTenantTables(queryRunner: any, quotedSchema: string, entities: any[]): Promise<void>;
  runTenantTableMigrations(queryRunner: any, quotedSchema: string, entities: any[]): Promise<void>;
}
