import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module.js';
import { AdminAuthGuard } from '../common/admin-auth.guard.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [ScoringModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard],
})
export class AdminModule {}
