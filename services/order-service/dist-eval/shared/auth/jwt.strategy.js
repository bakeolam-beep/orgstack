var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
let JwtStrategy = class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined');
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }
    validate(payload) {
        if (typeof payload?.userId !== 'string' ||
            payload.userId.length === 0 ||
            typeof payload?.tenantId !== 'string' ||
            payload.tenantId.length === 0) {
            throw new UnauthorizedException('Invalid token payload');
        }
        return {
            userId: payload.userId,
            tenantId: payload.tenantId,
        };
    }
};
JwtStrategy = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [])
], JwtStrategy);
export { JwtStrategy };
//# sourceMappingURL=jwt.strategy.js.map