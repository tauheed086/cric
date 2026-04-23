import { Injectable } from '@nestjs/common';
import { MatchEventType, type EventEnvelope } from '@cric/types';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class EventBusService {
  private readonly tournamentSubject = new Subject<EventEnvelope>();
  private readonly matchSubjects = new Map<string, Subject<EventEnvelope>>();

  tournamentStream(): Observable<EventEnvelope> {
    return this.tournamentSubject.asObservable();
  }

  matchStream(matchId: string): Observable<EventEnvelope> {
    if (!this.matchSubjects.has(matchId)) {
      this.matchSubjects.set(matchId, new Subject<EventEnvelope>());
    }
    return this.matchSubjects.get(matchId)!.asObservable();
  }

  publishTournamentEvent<T>(args: {
    eventType: MatchEventType;
    entityType: string;
    entityId: string;
    updatedBy: string;
    version: number;
    payload: T;
  }) {
    const event: EventEnvelope<T> = {
      eventType: args.eventType,
      entityType: args.entityType,
      entityId: args.entityId,
      updatedAt: new Date().toISOString(),
      updatedBy: args.updatedBy,
      version: args.version,
      payload: args.payload,
    };
    this.tournamentSubject.next(event);
  }

  publishMatchEvent<T>(args: {
    matchId: string;
    eventType: MatchEventType;
    entityType: string;
    entityId: string;
    updatedBy: string;
    version: number;
    payload: T;
  }) {
    if (!this.matchSubjects.has(args.matchId)) {
      this.matchSubjects.set(args.matchId, new Subject<EventEnvelope>());
    }
    const event: EventEnvelope<T> = {
      eventType: args.eventType,
      entityType: args.entityType,
      entityId: args.entityId,
      updatedAt: new Date().toISOString(),
      updatedBy: args.updatedBy,
      version: args.version,
      payload: args.payload,
    };
    this.matchSubjects.get(args.matchId)!.next(event);
  }
}