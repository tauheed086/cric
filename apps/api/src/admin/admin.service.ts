import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AwardType, FixtureStatus } from '@prisma/client';
import { MatchEventType } from '@cric/types';
import { PrismaService } from '../prisma/prisma.service.js';
import { ScoringService } from '../scoring/scoring.service.js';
import { ProjectionService } from '../scoring/projection.service.js';
import { EventBusService } from '../events/event-bus.service.js';
import type {
  AnnouncementDto,
  AwardDto,
  BallInputDto,
  DeclareResultDto,
  FixtureDto,
  InterruptionDto,
  ManOfMatchDto,
  PlayerDto,
  PlayingXiDto,
  StartInningsDto,
  TeamDto,
  TossDto,
  UpdateSettingsDto,
  UpsertTournamentDto,
  VenueDto,
} from './dto.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    private readonly projections: ProjectionService,
    private readonly eventBus: EventBusService,
  ) {}

  private async getTournament() {
    const tournament = await this.prisma.tournament.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!tournament) {
      throw new NotFoundException('Tournament not configured');
    }
    return tournament;
  }

  async upsertTournament(dto: UpsertTournamentDto, settings: UpdateSettingsDto | null, actor: string) {
    const existing = await this.prisma.tournament.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    const tournament = existing
      ? await this.prisma.tournament.update({
          where: { id: existing.id },
          data: dto,
        })
      : await this.prisma.tournament.create({
          data: {
            ...dto,
            isActive: true,
          },
        });

    if (settings) {
      await this.prisma.seasonSettings.upsert({
        where: { tournamentId: tournament.id },
        create: {
          tournamentId: tournament.id,
          ...settings,
        },
        update: settings,
      });
    }

    this.eventBus.publishTournamentEvent({
      eventType: MatchEventType.MATCH_UPDATED,
      entityType: 'tournament',
      entityId: tournament.id,
      updatedBy: actor,
      version: Date.now(),
      payload: tournament,
    });

    return tournament;
  }

  async getDashboard() {
    const tournament = await this.getTournament();
    const [matchesToday, pending, inProgress, completed, alerts] = await Promise.all([
      this.prisma.match.count({
        where: {
          tournamentId: tournament.id,
          startsAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      this.prisma.match.count({
        where: {
          tournamentId: tournament.id,
          status: { in: ['PRE_TOSS', 'POST_TOSS', 'UPCOMING'] as any },
        },
      }),
      this.prisma.match.count({
        where: {
          tournamentId: tournament.id,
          status: { in: ['INNINGS_1', 'INNINGS_2', 'INNINGS_BREAK'] as any },
        },
      }),
      this.prisma.match.count({
        where: {
          tournamentId: tournament.id,
          status: { in: ['COMPLETED', 'ABANDONED'] as any },
        },
      }),
      this.prisma.match.findMany({
        where: {
          tournamentId: tournament.id,
          OR: [{ scorecardProjection: null }, { status: 'COMPLETED', resultSummary: null }],
        },
        select: { id: true, matchNumber: true, status: true },
        take: 20,
      }),
    ]);

    return {
      tournament,
      cards: {
        matchesToday,
        pendingScoreUpdates: pending,
        inProgressMatches: inProgress,
        completedMatches: completed,
      },
      alerts,
    };
  }

  async listTeams() {
    const tournament = await this.getTournament();
    return this.prisma.team.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { name: 'asc' },
    });
  }

  async createTeam(dto: TeamDto) {
    const tournament = await this.getTournament();
    return this.prisma.team.create({
      data: {
        tournamentId: tournament.id,
        ...dto,
      },
    });
  }

  async updateTeam(id: string, dto: TeamDto) {
    return this.prisma.team.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTeam(id: string) {
    return this.prisma.team.delete({ where: { id } });
  }

  async listPlayers() {
    const tournament = await this.getTournament();
    return this.prisma.player.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { displayName: 'asc' },
    });
  }

  async createPlayer(dto: PlayerDto) {
    const tournament = await this.getTournament();
    const player = await this.prisma.player.create({
      data: {
        tournamentId: tournament.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName: dto.displayName,
        role: dto.role,
        battingHand: dto.battingHand,
        bowlingType: dto.bowlingType,
        jerseyNumber: dto.jerseyNumber,
        photoUrl: dto.photoUrl,
      },
    });

    await this.prisma.teamPlayer.create({
      data: {
        teamId: dto.teamId,
        playerId: player.id,
      },
    });

    return player;
  }

  async updatePlayer(id: string, dto: PlayerDto) {
    const updated = await this.prisma.player.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName: dto.displayName,
        role: dto.role,
        battingHand: dto.battingHand,
        bowlingType: dto.bowlingType,
        jerseyNumber: dto.jerseyNumber,
        photoUrl: dto.photoUrl,
      },
    });

    await this.prisma.teamPlayer.deleteMany({ where: { playerId: id } });
    await this.prisma.teamPlayer.create({
      data: {
        teamId: dto.teamId,
        playerId: id,
      },
    });

    return updated;
  }

  async deletePlayer(id: string) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    const scoringReferences = await this.prisma.ballEvent.count({
      where: {
        OR: [{ strikerId: id }, { nonStrikerId: id }, { bowlerId: id }],
      },
    });

    if (scoringReferences > 0) {
      throw new BadRequestException('Cannot delete player because this player has scoring history in one or more matches');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.squadSelection.deleteMany({ where: { playerId: id } });
      await tx.teamPlayer.deleteMany({ where: { playerId: id } });
      return tx.player.delete({ where: { id } });
    });
  }

  async listVenues() {
    const tournament = await this.getTournament();
    return this.prisma.venue.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { name: 'asc' },
    });
  }

  async createVenue(dto: VenueDto) {
    const tournament = await this.getTournament();
    return this.prisma.venue.create({
      data: {
        tournamentId: tournament.id,
        ...dto,
      },
    });
  }

  async updateVenue(id: string, dto: VenueDto) {
    return this.prisma.venue.update({
      where: { id },
      data: dto,
    });
  }

  async deleteVenue(id: string) {
    return this.prisma.venue.delete({ where: { id } });
  }

  async listFixtures() {
    const tournament = await this.getTournament();
    return this.prisma.fixture.findMany({
      where: { tournamentId: tournament.id },
      include: {
        teamA: true,
        teamB: true,
        venue: true,
        match: true,
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async listMatches() {
    const tournament = await this.getTournament();
    return this.prisma.match.findMany({
      where: { tournamentId: tournament.id },
      include: {
        innings: true,
        toss: true,
        squadSelections: true,
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async createFixture(dto: FixtureDto) {
    const tournament = await this.getTournament();
    return this.prisma.$transaction(async (tx) => {
      const fixture = await tx.fixture.create({
        data: {
          tournamentId: tournament.id,
          matchNumber: dto.matchNumber,
          stage: dto.stage,
          teamAId: dto.teamAId,
          teamBId: dto.teamBId,
          venueId: dto.venueId,
          startsAt: new Date(dto.startsAt),
          status: FixtureStatus.UPCOMING,
        },
      });

      const match = await tx.match.create({
        data: {
          tournamentId: tournament.id,
          fixtureId: fixture.id,
          teamAId: dto.teamAId,
          teamBId: dto.teamBId,
          venueId: dto.venueId,
          matchNumber: dto.matchNumber,
          stage: dto.stage,
          status: 'PRE_TOSS',
          startsAt: new Date(dto.startsAt),
          statusText: 'Awaiting toss',
        },
      });

      return { fixture, match };
    });
  }

  async updateFixture(id: string, dto: FixtureDto) {
    const updated = await this.prisma.fixture.update({
      where: { id },
      data: {
        matchNumber: dto.matchNumber,
        stage: dto.stage,
        teamAId: dto.teamAId,
        teamBId: dto.teamBId,
        venueId: dto.venueId,
        startsAt: new Date(dto.startsAt),
      },
    });

    await this.prisma.match.update({
      where: { fixtureId: id },
      data: {
        matchNumber: dto.matchNumber,
        stage: dto.stage,
        teamAId: dto.teamAId,
        teamBId: dto.teamBId,
        venueId: dto.venueId,
        startsAt: new Date(dto.startsAt),
      },
    });

    return updated;
  }

  async deleteFixture(id: string) {
    await this.prisma.match.deleteMany({ where: { fixtureId: id } });
    return this.prisma.fixture.delete({ where: { id } });
  }

  async getMatch(matchId: string) {
    return this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        innings: true,
        toss: true,
        squadSelections: true,
        ballEvents: {
          where: {
            isVoided: false,
          },
          orderBy: {
            sequence: 'asc',
          },
          select: {
            id: true,
            inningsId: true,
            sequence: true,
            ballInOver: true,
            runsOffBat: true,
            extrasRuns: true,
            extrasType: true,
            wicket: true,
            isValidDelivery: true,
            strikerId: true,
            bowlerId: true,
          },
        },
      },
    });
  }

  updateToss(matchId: string, dto: TossDto, actor: string) {
    return this.scoring.updateToss(matchId, dto.wonByTeamId, dto.decision, actor);
  }

  setPlayingXI(matchId: string, dto: PlayingXiDto, actor: string) {
    return this.scoring.setPlayingXI(matchId, dto.teamId, dto.playerIds, actor);
  }

  addBall(matchId: string, dto: BallInputDto, actor: string) {
    return this.scoring.recordBall(matchId, dto, actor);
  }

  undoBall(matchId: string, actor: string) {
    return this.scoring.undoLastBall(matchId, actor);
  }

  editLastBall(matchId: string, dto: BallInputDto, actor: string) {
    return this.scoring.editLastBall(matchId, dto, actor);
  }

  startInnings(matchId: string, dto: StartInningsDto, actor: string) {
    return this.scoring.startInnings(matchId, dto.inningsNumber, actor);
  }

  endInnings(matchId: string, actor: string) {
    return this.scoring.endInnings(matchId, actor);
  }

  setInterruption(matchId: string, dto: InterruptionDto, actor: string) {
    return this.scoring.setInterruption(matchId, dto.type, dto.statusText, actor);
  }

  declareResult(matchId: string, dto: DeclareResultDto, actor: string) {
    return this.scoring.declareResult(
      matchId,
      {
        winnerTeamId: dto.winnerTeamId ?? null,
        resultSummary: dto.resultSummary,
        momPlayerId: dto.momPlayerId ?? null,
      },
      actor,
    );
  }

  setManOfMatch(matchId: string, dto: ManOfMatchDto, actor: string) {
    return this.scoring.setManOfMatch(matchId, dto.playerId, actor);
  }

  async listAwards() {
    const tournament = await this.getTournament();
    return this.prisma.award.findMany({
      where: { tournamentId: tournament.id },
      include: { player: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertAward(dto: AwardDto, actor: string) {
    const tournament = await this.getTournament();
    if (dto.type === AwardType.MAN_OF_THE_MATCH && !dto.matchId) {
      throw new NotFoundException('matchId required for Man of the Match');
    }

    const existing = await this.prisma.award.findFirst({
      where: {
        tournamentId: tournament.id,
        type: dto.type,
        matchId: dto.matchId ?? null,
      },
    });

    const award = existing
      ? await this.prisma.award.update({
          where: { id: existing.id },
          data: {
            playerId: dto.playerId,
            reason: dto.reason,
            locked: dto.locked ?? false,
          },
        })
      : await this.prisma.award.create({
          data: {
            tournamentId: tournament.id,
            type: dto.type,
            playerId: dto.playerId,
            matchId: dto.matchId ?? null,
            reason: dto.reason,
            locked: dto.locked ?? false,
          },
        });

    this.eventBus.publishTournamentEvent({
      eventType: MatchEventType.MATCH_UPDATED,
      entityType: 'award',
      entityId: award.id,
      updatedBy: actor,
      version: Date.now(),
      payload: award,
    });

    return award;
  }

  async listAnnouncements() {
    const tournament = await this.getTournament();
    return this.prisma.announcement.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAnnouncement(dto: AnnouncementDto, actor: string) {
    const tournament = await this.getTournament();
    const announcement = await this.prisma.announcement.create({
      data: {
        tournamentId: tournament.id,
        title: dto.title,
        body: dto.body,
        isPublished: dto.isPublished ?? true,
        publishedAt: dto.isPublished === false ? null : new Date(),
      },
    });

    this.eventBus.publishTournamentEvent({
      eventType: MatchEventType.ANNOUNCEMENT_UPDATED,
      entityType: 'announcement',
      entityId: announcement.id,
      updatedBy: actor,
      version: Date.now(),
      payload: announcement,
    });

    return announcement;
  }

  async updateAnnouncement(id: string, dto: AnnouncementDto, actor: string) {
    const announcement = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title,
        body: dto.body,
        isPublished: dto.isPublished ?? true,
        publishedAt: dto.isPublished === false ? null : new Date(),
      },
    });

    this.eventBus.publishTournamentEvent({
      eventType: MatchEventType.ANNOUNCEMENT_UPDATED,
      entityType: 'announcement',
      entityId: announcement.id,
      updatedBy: actor,
      version: Date.now(),
      payload: announcement,
    });

    return announcement;
  }

  deleteAnnouncement(id: string) {
    return this.prisma.announcement.delete({ where: { id } });
  }

  async getSettings() {
    const tournament = await this.getTournament();
    return this.prisma.seasonSettings.findUnique({
      where: { tournamentId: tournament.id },
    });
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const tournament = await this.getTournament();
    const settings = await this.prisma.seasonSettings.upsert({
      where: { tournamentId: tournament.id },
      create: {
        tournamentId: tournament.id,
        ...dto,
      },
      update: dto,
    });

    await this.projections.rebuildPointsTable(tournament.id);
    return settings;
  }

  async forceRecompute() {
    const tournament = await this.getTournament();
    await this.projections.rebuildPointsTable(tournament.id);
    await this.projections.rebuildLeaderboards(tournament.id);
    return { ok: true };
  }
}
