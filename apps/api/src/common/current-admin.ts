import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

export interface RequestAdminUser {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
}

export const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest();
  return req.user?.name ?? req.headers['x-admin-name'] ?? 'Admin';
});

export const CurrentAdminUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestAdminUser => {
  const req = ctx.switchToHttp().getRequest();
  return (
    req.user ?? {
      id: 'super_admin',
      username: 'admin',
      name: req.headers['x-admin-name'] ?? 'Super Admin',
      role: AdminRole.SUPER_ADMIN,
    }
  );
});