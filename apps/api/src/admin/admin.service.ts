import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminRole, AwardType, FixtureStatus } from '@prisma/client';
import { MatchEventType } from '@cric/types';
import { PrismaService } from '../prisma/prisma.service.js';
import { ScoringService } from '../scoring/scoring.service.js';
import { ProjectionService } from '../scoring/projection.service.js';
import { EventBusService } from '../events/event-bus.service.js';
import type { RequestAdminUser } from '../common/current-admin.js';
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

  private async getTournament(user?: RequestAdminUser, throwOnMissing = true) {
    if (user && user.role === AdminRole.SCORER) {
      const tournament = await this.prisma.tournament.findFirst({
        where: { createdById: user.id },
        orderBy: { createdAt: 'desc' },
      });
      if (!tournament && throwOnMissing) {
        throw new NotFoundException('You have not created any tournament yet. Please create your tournament first.');
      }
      return tournament;
    }

    const tournament = await this.prisma.tournament.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!tournament && throwOnMissing) {
      throw new NotFoundException('Tournament not configured');
    }
    return tournament;
  }

  async upsertTournament(
    dto: UpsertTournamentDto,
    settings: UpdateSettingsDto | null,
    user: RequestAdminUser,
  ) {
    let existing = null;
    if (user.role === AdminRole.SCORER) {
      existing = await this.prisma.tournament.findFirst({
        where: { createdById: user.id },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      existing = await this.prisma.tournament.findFirst({
        orderBy: { createdAt: 'desc' },
      });
    }

    const tournament = existing
      ? await this.prisma.tournament.update({
          where: { id: existing.id },
          data: dto,
        })
      : await this.prisma.tournament.create({
          data: {
            ...dto,
            createdById: user.id !== 'super_admin' ? user.id : null,
            isActive: true,
          },
        });

    if (settings) {
      await this.prisma.seasonSettings.upsert({
        where: { tournamentId: tournament.id },
        create: {
          tournamentId: tournament.id,
          ...settings,
          format: settings.format ?? 'T20',
          oversPerInnings: settings.oversPerInnings ?? 20,
          numberOfTeams: settings.numberOfTeams ?? 8,
        },
        update: settings,
      });
    }

    this.eventBus.publishTournamentEvent({
      eventType: MatchEventType.MATCH_UPDATED,
      entityType: 'tournament',
      entityId: tournament.id,
      updatedBy: user.name,
      version: Date.now(),
      payload: tournament,
    });

    return tournament;
  }

  async getDashboard(user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, false);
    if (!tournament) {
      return {
        tournament: null,
        hasTournament: false,
        cards: {
          matchesToday: 0,
          pendingScoreUpdates: 0,
          inProgressMatches: 0,
          completedMatches: 0,
        },
        alerts: [],
      };
    }

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
      hasTournament: true,
      cards: {
        matchesToday,
        pendingScoreUpdates: pending,
        inProgressMatches: inProgress,
        completedMatches: completed,
      },
      alerts,
    };
  }

  async listTeams(user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, false);
    if (!tournament) return [];
    return this.prisma.team.findMany({
      where: { tournamentId: tournament.id },
      include: {
        teamPlayers: {
          include: {
            player: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createTeam(dto: TeamDto, user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, true);
    return this.prisma.team.create({
      data: {
        tournamentId: tournament!.id,
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
    const associatedCount = await this.prisma.fixture.count({
      where: { OR: [{ teamAId: id }, { teamBId: id }] },
    });
    if (associatedCount > 0) {
      throw new BadRequestException('Cannot delete team because it is scheduled in fixtures or matches');
    }
    return this.prisma.team.delete({ where: { id } });
  }

  async listPlayers(user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, false);
    if (!tournament) return [];
    return this.prisma.player.findMany({
      where: { tournamentId: tournament.id },
      include: {
        teamPlayers: true,
      },
      orderBy: { displayName: 'asc' },
    });
  }

  async createPlayer(dto: PlayerDto, user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, true);
    const displayName = dto.displayName?.trim() || [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim() || 'Player';
    const player = await this.prisma.player.create({
      data: {
        tournamentId: tournament!.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName,
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
    const displayName = dto.displayName?.trim() || [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim() || 'Player';
    const updated = await this.prisma.player.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName,
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

  async listVenues(user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, false);
    if (!tournament) return [];
    return this.prisma.venue.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { name: 'asc' },
    });
  }

  async createVenue(dto: VenueDto, user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, true);
    return this.prisma.venue.create({
      data: {
        tournamentId: tournament!.id,
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
    const associatedCount = await this.prisma.fixture.count({
      where: { venueId: id },
    });
    if (associatedCount > 0) {
      throw new BadRequestException('Cannot delete venue because fixtures or matches are scheduled at this venue');
    }
    return this.prisma.venue.delete({ where: { id } });
  }

  async listFixtures(user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, false);
    if (!tournament) return [];
    return this.prisma.fixture.findMany({
      where: { tournamentId: tournament.id },
      include: {
        teamA: {
          include: {
            teamPlayers: {
              include: {
                player: true,
              },
            },
          },
        },
        teamB: {
          include: {
            teamPlayers: {
              include: {
                player: true,
              },
            },
          },
        },
        venue: true,
        match: {
          include: {
            squadSelections: {
              include: {
                player: true,
              },
            },
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async listMatches(user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, false);
    if (!tournament) return [];
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

  async createFixture(dto: FixtureDto, user?: RequestAdminUser) {
    if (dto.teamAId === dto.teamBId) {
      throw new BadRequestException('Team A and Team B must be different teams');
    }
    const tournament = await this.getTournament(user, true);
    return this.prisma.$transaction(async (tx) => {
      const fixture = await tx.fixture.create({
        data: {
          tournamentId: tournament!.id,
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
          tournamentId: tournament!.id,
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
    if (dto.teamAId === dto.teamBId) {
      throw new BadRequestException('Team A and Team B must be different teams');
    }

    const match = await this.prisma.match.findUnique({
      where: { fixtureId: id },
      include: {
        ballEvents: { select: { id: true }, take: 1 },
      },
    });

    if (match && match.ballEvents.length > 0 && (match.teamAId !== dto.teamAId || match.teamBId !== dto.teamBId)) {
      throw new BadRequestException('Cannot change teams for a match that already has ball scoring recorded');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.fixture.update({
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

      await tx.match.update({
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
    });
  }

  async deleteFixture(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { fixtureId: id },
      include: {
        ballEvents: { select: { id: true }, take: 1 },
      },
    });

    if (match && match.ballEvents.length > 0) {
      throw new BadRequestException('Cannot delete fixture because match has live ball scoring data recorded');
    }

    if (match && (match.status === 'COMPLETED' || match.status === 'INNINGS_1' || match.status === 'INNINGS_2')) {
      throw new BadRequestException('Cannot delete fixture because match has already started or completed');
    }

    const tournamentId = match?.tournamentId;

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({ where: { fixtureId: id } });
      return tx.fixture.delete({ where: { id } });
    });

    if (tournamentId) {
      await Promise.all([
        this.projections.rebuildPointsTable(tournamentId),
        this.projections.rebuildLeaderboards(tournamentId),
      ]);
    }

    return result;
  }

  async getMatch(matchId: string, user?: RequestAdminUser) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: { select: { id: true, createdById: true } },
        innings: true,
        toss: true,
        teamA: {
          include: {
            teamPlayers: {
              include: {
                player: true,
              },
            },
          },
        },
        teamB: {
          include: {
            teamPlayers: {
              include: {
                player: true,
              },
            },
          },
        },
        squadSelections: {
          include: {
            player: true,
          },
        },
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

    if (match && user?.role === AdminRole.SCORER && match.tournament.createdById !== user.id) {
      throw new ForbiddenException('You can only access matches of tournaments created by you');
    }

    return match;
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

  async listAwards(user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, false);
    if (!tournament) return [];
    return this.prisma.award.findMany({
      where: { tournamentId: tournament.id },
      include: { player: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertAward(dto: AwardDto, actor: string, user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, true);
    if (dto.type === AwardType.MAN_OF_THE_MATCH && !dto.matchId) {
      throw new NotFoundException('matchId required for Man of the Match');
    }

    const existing = await this.prisma.award.findFirst({
      where: {
        tournamentId: tournament!.id,
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
            tournamentId: tournament!.id,
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

  async listAnnouncements(user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, false);
    if (!tournament) return [];
    return this.prisma.announcement.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAnnouncement(dto: AnnouncementDto, actor: string, user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, true);
    const announcement = await this.prisma.announcement.create({
      data: {
        tournamentId: tournament!.id,
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

  async getSettings(user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, false);
    if (!tournament) return null;
    return this.prisma.seasonSettings.findUnique({
      where: { tournamentId: tournament.id },
    });
  }

  async updateSettings(dto: UpdateSettingsDto, user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, true);
    const settings = await this.prisma.seasonSettings.upsert({
      where: { tournamentId: tournament!.id },
      create: {
        tournamentId: tournament!.id,
        ...dto,
        format: dto.format ?? 'T20',
        oversPerInnings: dto.oversPerInnings ?? 20,
        numberOfTeams: dto.numberOfTeams ?? 8,
      },
      update: dto,
    });

    await this.projections.rebuildPointsTable(tournament!.id);
    return settings;
  }

  async forceRecompute(user?: RequestAdminUser) {
    const tournament = await this.getTournament(user, true);
    await this.projections.rebuildPointsTable(tournament!.id);
    await this.projections.rebuildLeaderboards(tournament!.id);
    return { ok: true };
  }
}
