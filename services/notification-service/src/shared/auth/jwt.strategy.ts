import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  [key: string]: unknown;
}

export interface AuthenticatedRequestUser {
  userId: string;
  tenantId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() as (req: unknown) => string | null,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedRequestUser {
    console.log('[JwtStrategy] validate called with payload:', payload);
    if (
      typeof payload?.userId !== 'string' ||
      payload.userId.length === 0 ||
      typeof payload?.tenantId !== 'string' ||
      payload.tenantId.length === 0
    ) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      userId: payload.userId,
      tenantId: payload.tenantId,
    };
  }
}