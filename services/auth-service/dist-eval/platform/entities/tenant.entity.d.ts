export declare enum TenantStatus {
    ACTIVE = "active",
    SUSPENDED = "suspended"
}
export declare class Tenant {
    id: string;
    name: string;
    schemaName: string;
    status: TenantStatus;
    createdAt: Date;
    updatedAt: Date;
}
