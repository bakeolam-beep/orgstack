import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

import { Tenant, TenantStatus } from '../platform/entities/tenant.entity.js';
import { User, UserRole } from '../platform/entities/user.entity.js';
import { Product } from '../tenant-entities/product.entity.js';
import { StockMovement } from '../tenant-entities/stock-movement.entity.js';
import { Sale } from '../tenant-entities/sale.entity.js';
import { SaleItem } from '../tenant-entities/sale-item.entity.js';
import { Notification } from '../tenant-entities/notification.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtService } from '@nestjs/jwt';
import { TenantConnectionService } from '../shared/database/tenant-connection.service.js';

export interface RegisterResult {
  tenantId: string;
  userId: string;
  email: string;
}

export interface LoginResult {
  accessToken: string;
  tenantId: string;
  role: UserRole;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  tenantName: string;
}

@Injectable()
export class AuthService {
  private readonly bcryptSaltRounds: number;
  private readonly tenantConnectionService: TenantConnectionService;

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.bcryptSaltRounds = parseInt(
      this.configService.get<string>('BCRYPT_SALT_ROUNDS', '10'),
      10,
    );
    this.tenantConnectionService = new TenantConnectionService(dataSource);
  }

  async register(dto: RegisterDto): Promise<RegisterResult> {
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
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Registration error:', error);
      throw new InternalServerErrorException('Registration failed');
    } finally {
      await queryRunner.release();
    }
  }

  async login(dto: LoginDto): Promise<LoginResult> {
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

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '1d');
    const accessToken = this.jwtService.sign(payload, { expiresIn } as any);

    return {
      accessToken,
      tenantId: user.tenantId,
      role: user.role,
    };
  }

  async getProfile(userId: string): Promise<UserProfile> {
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
}