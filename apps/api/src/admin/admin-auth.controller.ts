import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminRole } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { AdminAuthGuard } from '../common/admin-auth.guard.js';
import { CurrentAdminUser, type RequestAdminUser } from '../common/current-admin.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminLoginDto } from './dto.js';
import { verifyPassword } from './admin-users.service.js';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: AdminLoginDto) {
    const expected =
      this.config.get<string>('ADMIN_TOKEN') ??
      process.env.ADMIN_TOKEN ??
      'local-admin-token';

    // Support both new (username/password) and legacy (adminName/token) fields
    const inputPassword = (body.password ?? body.token ?? '').trim();
    const inputUsername = (body.username ?? body.adminName ?? '').trim().toLowerCase();

    // 1. Check against registered AdminUser accounts
    if (inputUsername) {
      const user = await this.prisma.adminUser.findUnique({
        where: { username: inputUsername },
      });

      if (user) {
        if (!user.isActive) {
          throw new UnauthorizedException('Your account has been deactivated. Please contact the administrator.');
        }

        const matches = verifyPassword(inputPassword, user.passwordHash);
        if (matches) {
          const sessionToken = `session_${user.id}_${randomBytes(16).toString('hex')}`;
          await this.prisma.userSession.create({
            data: {
              userName: user.username,
              tokenHash: sessionToken,
              expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            },
          });

          return {
            success: true,
            token: sessionToken,
            adminName: user.name,
            role: user.role,
            userId: user.id,
            message: 'Authentication successful',
          };
        }
      }
    }

    // 2. Fallback check for Master Super Admin token
    if (inputPassword === expected && (!inputUsername || inputUsername === 'admin')) {
      return {
        success: true,
        token: expected,
        adminName: 'Super Admin',
        role: AdminRole.SUPER_ADMIN,
        userId: 'super_admin',
        message: 'Master Super Admin authentication successful',
      };
    }

    throw new UnauthorizedException('Invalid username or password. Please try again.');
  }

  @Get('verify')
  @UseGuards(AdminAuthGuard)
  verify(@CurrentAdminUser() user: RequestAdminUser) {
    return {
      authenticated: true,
      adminName: user.name,
      role: user.role,
      userId: user.id,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    return { success: true };
  }
}
