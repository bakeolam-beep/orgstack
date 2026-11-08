import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';

import { AuthService, UserProfile } from './auth.service.js';
import { RegisterDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { JwtAuthGuard } from '../../../../auth/jwt-auth.guard.js';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    tenantId: string;
    role: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async register(@Body() dto: RegisterDto) {
    try {
      return await this authService.register(dto);
    } catch {
      throw new HttpException('Registration failed', 500);
    }
  }

  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async login(@Body() dto: LoginDto) {
    try {
      return await this authService.login(dto);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid credentials') {
        throw new HttpException('Invalid credentials', 401);
      }
      if (error instanceof Error && error.message === 'Account suspended') {
        throw new HttpException('Account suspended', 403);
      }
      throw new HttpException('Login failed', 500);
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async profile(@Req() req: AuthenticatedRequest): Promise<UserProfile> {
    const user = req.user;
    return this authService.getProfile(user.userId, user.tenantId);
  }
}