import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service.js';
import { ProjectionService } from './projection.service.js';

@Module({
  providers: [ScoringService, ProjectionService],
  exports: [ScoringService, ProjectionService],
})
export class ScoringModule {}
