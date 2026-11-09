import { Request } from 'express';
import { AuthService, UserProfile } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
interface AuthenticatedRequest extends Request {
    user: {
        userId: string;
        tenantId: string;
        role: string;
    };
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<import("./auth.service.js").RegisterResult>;
    login(dto: LoginDto): Promise<import("./auth.service.js").LoginResult>;
    profile(req: AuthenticatedRequest): Promise<UserProfile>;
}
export {};
