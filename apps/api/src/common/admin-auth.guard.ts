import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = req.headers['x-admin-token'];
    const expected = this.config?.get<string>('ADMIN_TOKEN') ?? process.env.ADMIN_TOKEN ?? 'local-admin-token';

    if (token !== expected) {
      throw new UnauthorizedException('Invalid admin token');
    }
    return true;
  }
}
