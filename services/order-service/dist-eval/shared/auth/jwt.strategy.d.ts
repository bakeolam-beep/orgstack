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
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    constructor();
    validate(payload: JwtPayload): AuthenticatedRequestUser;
}
export {};
