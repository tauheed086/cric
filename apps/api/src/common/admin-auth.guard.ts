import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req.headers['x-admin-token'];
    const expected =
      this.config?.get<string>('ADMIN_TOKEN') ??
      process.env.ADMIN_TOKEN ??
      'local-admin-token';

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    // 1. Check master Super Admin token
    if (token === expected) {
      req.user = {
        id: 'super_admin',
        username: 'admin',
        name: req.headers['x-admin-name'] ?? 'Super Admin',
        role: AdminRole.SUPER_ADMIN,
      };
      return true;
    }

    // 2. Check session token in database
    if (typeof token === 'string' && token.startsWith('session_')) {
      const session = await this.prisma.userSession.findFirst({
        where: {
          tokenHash: token,
          expiresAt: { gt: new Date() },
        },
      });

      if (session) {
        const user = await this.prisma.adminUser.findUnique({
          where: { username: session.userName },
        });

        if (user && user.isActive) {
          req.user = {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
          };
          return true;
        }
      }
    }

    throw new UnauthorizedException('Invalid admin token or session expired');
  }
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user || req.user.role !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Super Admin privilege required to perform this action',
      );
    }
    return true;
  }
}
