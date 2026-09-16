import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module.js';
import { AdminAuthGuard, SuperAdminGuard } from '../common/admin-auth.guard.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [ScoringModule],
  controllers: [AdminAuthController, AdminUsersController, AdminController],
  providers: [AdminService, AdminUsersService, AdminAuthGuard, SuperAdminGuard],
  exports: [AdminUsersService],
})
export class AdminModule {}
