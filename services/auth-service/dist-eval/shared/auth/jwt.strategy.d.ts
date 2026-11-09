import { Strategy } from 'passport-jwt';
export interface JwtPayload {
    userId: string;
    tenantId: string;
    [key: string]: unknown;
}
export interface AuthenticatedRequestUser {
    userId: string;
    tenantId: string;
}
declare const JwtStrategy_base: new (options: import("passport-jwt").StrategyOptions) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    constructor();
    validate(payload: JwtPayload): AuthenticatedRequestUser;
}
export {};
