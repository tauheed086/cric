import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.headers['x-admin-name'] ?? 'admin';
});