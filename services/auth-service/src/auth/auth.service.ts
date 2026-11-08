import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

import { Tenant, TenantStatus } from '../entities/tenant.entity.js';
import { User, UserRole } from '../entities/user.entity.js';
import { Product } from '../entities/product.entity.js';
import { StockMovement } from '../entities/stock-movement.entity.js';
import { Sale } from '../entities/sale.entity.js';
import { SaleItem } from '../entities/sale-item.entity.js';
import { Notification } from '../entities/notification.entity.js';
import { RegisterDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { TenantConnectionService } from '../../../../database/tenant-connection.service.js';

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
    const tenantId = uuidv4();
    const schemaName = `tenant_${tenantId}`;

    const tenant = this.tenantRepository.create({
      id: tenantId,
      name: dto.businessName,
      schemaName,
      status: TenantStatus.ACTIVE,
    });

    await this.tenantRepository.save(tenant);

    try {
      const entities = [
        this.dataSource.getMetadata(Product),
        this.dataSource.getMetadata(StockMovement),
        this.dataSource.getMetadata(Sale),
        this.dataSource.getMetadata(SaleItem),
        this.dataSource.getMetadata(Notification),
      ];
      await this.tenantConnectionService.createTenantSchema(tenantId, entities);
    } catch (error) {
      await this.tenantRepository.remove(tenant);
      throw error;
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, this.bcryptSaltRounds);

    const user = this.userRepository.create({
      id: uuidv4(),
      email: dto.email.toLowerCase(),
      passwordHash,
      tenantId,
      role: UserRole.ADMIN,
    });

    const savedUser = await this.userRepository.save(user);

    return {
      tenantId: savedUser.tenantId,
      userId: savedUser.id,
      email: savedUser.email,
    };
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
      relations: { tenant: true },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new Error('Invalid credentials');
    }

    if (user.tenant.status !== TenantStatus.ACTIVE) {
      throw new Error('Account suspended');
    }

    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '1d');
    const accessToken = this.jwtService.sign(payload, { expiresIn });

    return {
      accessToken,
      tenantId: user.tenantId,
      role: user.role,
    };
  }

  async getProfile(userId: string, tenantId: string): Promise<UserProfile> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { tenant: true },
    });

    if (!user || user.tenantId !== tenantId) {
      throw new Error('User not found');
    }

    return {
      email: user.email,
      role: user.role,
      tenantName: user.tenant.name,
    };
  }
}