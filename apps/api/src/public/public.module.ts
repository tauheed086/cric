import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module.js';
import { PublicController } from './public.controller.js';
import { PublicService } from './public.service.js';

@Module({
  imports: [ScoringModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
