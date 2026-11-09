import { ConfigService } from '@nestjs/config';
import { Repository, DataSource } from 'typeorm';
import { Tenant } from '../platform/entities/tenant.entity.js';
import { User, UserRole } from '../platform/entities/user.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtService } from '@nestjs/jwt';
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
export declare class AuthService {
    private readonly tenantRepository;
    private readonly userRepository;
    private readonly jwtService;
    private readonly configService;
    private readonly dataSource;
    private readonly bcryptSaltRounds;
    private readonly tenantConnectionService;
    constructor(tenantRepository: Repository<Tenant>, userRepository: Repository<User>, jwtService: JwtService, configService: ConfigService, dataSource: DataSource);
    register(dto: RegisterDto): Promise<RegisterResult>;
    login(dto: LoginDto): Promise<LoginResult>;
    getProfile(userId: string): Promise<UserProfile>;
}
