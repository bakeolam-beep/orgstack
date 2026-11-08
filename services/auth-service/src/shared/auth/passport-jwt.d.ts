declare module 'passport-jwt' {
  import { Strategy } from 'passport-strategy';
  
  export interface StrategyOptions {
    jwtFromRequest: (req: unknown) => string | null;
    secretOrKey: string | Buffer;
    ignoreExpiration?: boolean;
    issuer?: string;
    audience?: string | string[];
    algorithms?: string[];
    passReqToCallback?: boolean;
  }
  
  export class ExtractJwt {
    static fromAuthHeaderAsBearerToken(): (req: unknown) => string | null;
    static fromHeader(headerName: string): (req: unknown) => string | null;
    static fromBodyField(fieldName: string): (req: unknown) => string | null;
    static fromUrlQueryParameter(paramName: string): (req: unknown) => string | null;
    static fromAuthHeaderWithScheme(authScheme: string): (req: unknown) => string | null;
    static fromExtractors(extractors: Array<(req: unknown) => string | null>): (req: unknown) => string | null;
  }
  
  export class Strategy extends Strategy {
    constructor(options: StrategyOptions, verify: (payload: unknown, done: (error: Error | null, user?: unknown, info?: unknown) => void) => void);
    name: string;
    authenticate(req: unknown, options?: unknown): void;
  }
}