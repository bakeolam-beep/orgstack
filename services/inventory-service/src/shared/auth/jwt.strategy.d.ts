export interface JwtPayload {
    userId: string;
    tenantId: string;
    [key: string]: unknown;
}
export interface AuthenticatedRequestUser {
    userId: string;
    tenantId: string;
}
declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor();
    validate(payload: JwtPayload): AuthenticatedRequestUser;
}
export {};
