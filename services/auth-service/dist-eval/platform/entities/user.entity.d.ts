import { Tenant } from './tenant.entity.js';
export declare enum UserRole {
    ADMIN = "admin",
    MEMBER = "member"
}
export declare class User {
    id: string;
    email: string;
    passwordHash: string;
    tenantId: string;
    tenant: Tenant;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}
