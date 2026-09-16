import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminRole, Prisma } from '@prisma/client';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, combined: string): boolean {
  try {
    const [salt, storedHash] = combined.split(':');
    if (!salt || !storedHash) return false;
    const hash = scryptSync(password, salt, 64).toString('hex');
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

export interface CreateAdminUserDto {
  username: string;
  password: string;
  name: string;
  role?: AdminRole;
}

export interface UpdateAdminUserDto {
  name?: string;
  password?: string;
  isActive?: boolean;
}

@Injectable()
export class AdminUsersService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultSuperAdmin();
  }

  async ensureDefaultSuperAdmin() {
    try {
      const defaultToken =
        this.config.get<string>('ADMIN_TOKEN') ??
        process.env.ADMIN_TOKEN ??
        'local-admin-token';

      const existingSuperAdmin = await this.prisma.adminUser.findFirst({
        where: { role: AdminRole.SUPER_ADMIN },
      });

      if (!existingSuperAdmin) {
        await this.prisma.adminUser.create({
          data: {
            username: 'admin',
            name: 'Super Admin',
            role: AdminRole.SUPER_ADMIN,
            passwordHash: hashPassword(defaultToken),
            isActive: true,
          },
        });
      }
    } catch {
      // Ignore if table not yet migrated during initial boot
    }
  }

  async listUsers() {
    const users = await this.prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { tournaments: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      tournamentsCount: u._count.tournaments,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async createUser(dto: CreateAdminUserDto) {
    const trimmedUsername = dto.username.trim().toLowerCase();
    const trimmedName = dto.name.trim();

    if (!trimmedUsername || !trimmedName || !dto.password) {
      throw new BadRequestException('Username, full name, and password are required');
    }

    if (dto.password.length < 4) {
      throw new BadRequestException('Password must be at least 4 characters long');
    }

    const existing = await this.prisma.adminUser.findUnique({
      where: { username: trimmedUsername },
    });

    if (existing) {
      throw new ConflictException(`Username "${trimmedUsername}" is already taken`);
    }

    const created = await this.prisma.adminUser.create({
      data: {
        username: trimmedUsername,
        name: trimmedName,
        passwordHash: hashPassword(dto.password),
        role: dto.role ?? AdminRole.SCORER,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      ...created,
      tournamentsCount: 0,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async updateUser(id: string, dto: UpdateAdminUserDto) {
    const user = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: Prisma.AdminUserUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.isActive !== undefined) {
      if (user.role === AdminRole.SUPER_ADMIN && !dto.isActive) {
        throw new BadRequestException('Cannot deactivate the Super Admin account');
      }
      data.isActive = dto.isActive;
    }
    if (dto.password) {
      if (dto.password.length < 4) {
        throw new BadRequestException('Password must be at least 4 characters long');
      }
      data.passwordHash = hashPassword(dto.password);
    }

    const updated = await this.prisma.adminUser.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { tournaments: true },
        },
      },
    });

    return {
      id: updated.id,
      username: updated.username,
      name: updated.name,
      role: updated.role,
      isActive: updated.isActive,
      tournamentsCount: updated._count.tournaments,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteUser(id: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === AdminRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot delete the Super Admin account');
    }

    await this.prisma.adminUser.delete({ where: { id } });
    return { success: true, message: `Scorer "${user.username}" deleted successfully` };
  }

  async findByUsername(username: string) {
    return this.prisma.adminUser.findUnique({
      where: { username: username.trim().toLowerCase() },
    });
  }
}
