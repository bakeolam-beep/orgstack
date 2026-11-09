var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { ConflictException, Injectable, InternalServerErrorException, UnauthorizedException, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { Tenant, TenantStatus } from '../platform/entities/tenant.entity.js';
import { User, UserRole } from '../platform/entities/user.entity.js';
import { Product } from '../tenant-entities/product.entity.js';
import { StockMovement } from '../tenant-entities/stock-movement.entity.js';
import { Sale } from '../tenant-entities/sale.entity.js';
import { SaleItem } from '../tenant-entities/sale-item.entity.js';
import { Notification } from '../tenant-entities/notification.entity.js';
import { JwtService } from '@nestjs/jwt';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';
let AuthService = class AuthService {
    constructor(tenantRepository, userRepository, jwtService, configService, dataSource) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.configService = configService;
        this.dataSource = dataSource;
        const cfg = this.configService;
        this.bcryptSaltRounds = parseInt(cfg?.get?.('BCRYPT_SALT_ROUNDS') ?? process.env.BCRYPT_SALT_ROUNDS ?? '10', 10);
        this.tenantConnectionService = new TenantConnectionService(dataSource);
    }
    async register(dto) {
        const existingUser = await this.userRepository.findOne({
            where: { email: dto.adminEmail.toLowerCase() },
        });
        if (existingUser) {
            throw new ConflictException('Email already registered');
        }
        const tenantId = uuidv4();
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const tenant = this.tenantRepository.create({
                id: tenantId,
                name: dto.businessName,
                schemaName: `tenant_${tenantId}`,
                status: TenantStatus.ACTIVE,
            });
            await queryRunner.manager.save(tenant);
            const entities = [
                this.dataSource.getMetadata(Product),
                this.dataSource.getMetadata(StockMovement),
                this.dataSource.getMetadata(Sale),
                this.dataSource.getMetadata(SaleItem),
                this.dataSource.getMetadata(Notification),
            ];
            await this.tenantConnectionService.createTenantSchema(tenantId, entities);
            const passwordHash = await bcrypt.hash(dto.adminPassword, this.bcryptSaltRounds);
            const user = this.userRepository.create({
                id: uuidv4(),
                email: dto.adminEmail.toLowerCase(),
                passwordHash,
                tenantId,
                role: UserRole.ADMIN,
            });
            const savedUser = await queryRunner.manager.save(user);
            await queryRunner.commitTransaction();
            return {
                tenantId: savedUser.tenantId,
                userId: savedUser.id,
                email: savedUser.email,
            };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            console.error('Registration error:', error);
            throw new InternalServerErrorException('Registration failed');
        }
        finally {
            await queryRunner.release();
        }
    }
    async login(dto) {
        const user = await this.userRepository.findOne({
            where: { email: dto.email.toLowerCase() },
            relations: { tenant: true },
        });
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }
        if (user.tenant.status !== TenantStatus.ACTIVE) {
            throw new UnauthorizedException('Account suspended');
        }
        const payload = {
            userId: user.id,
            tenantId: user.tenantId,
            role: user.role,
        };
        const cfg = this.configService;
        const expiresIn = cfg?.get?.('JWT_EXPIRES_IN') ?? process.env.JWT_EXPIRES_IN ?? '1d';
        const accessToken = this.jwtService.sign(payload, { expiresIn });
        return {
            accessToken,
            tenantId: user.tenantId,
            role: user.role,
        };
    }
    async getProfile(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: { tenant: true },
        });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            tenantName: user.tenant.name,
        };
    }
};
AuthService = __decorate([
    Injectable(),
    __param(0, InjectRepository(Tenant)),
    __param(1, InjectRepository(User)),
    __metadata("design:paramtypes", [Repository,
        Repository,
        JwtService,
        ConfigService,
        DataSource])
], AuthService);
export { AuthService };
//# sourceMappingURL=auth.service.js.map