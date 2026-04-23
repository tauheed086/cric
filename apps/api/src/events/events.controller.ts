import { Controller, Param, Sse } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { EventBusService } from './event-bus.service.js';

@Controller('events')
export class EventsController {
  constructor(private readonly eventBus: EventBusService) {}

  @Sse('tournament')
  tournamentEvents() {
    return this.eventBus.tournamentStream().pipe(
      map((data) => ({ data })),
    );
  }

  @Sse('matches/:matchId')
  matchEvents(@Param('matchId') matchId: string) {
    return this.eventBus.matchStream(matchId).pipe(
      map((data) => ({ data })),
    );
  }
}