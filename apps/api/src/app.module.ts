import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module.js';
import { EventsModule } from './events/events.module.js';
import { PublicModule } from './public/public.module.js';
import { AdminModule } from './admin/admin.module.js';
import { ScoringModule } from './scoring/scoring.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    EventsModule,
    ScoringModule,
    PublicModule,
    AdminModule,
  ],
})
export class AppModule {}