import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AwardType, ExtrasType, MatchInterruptionType, MatchStatus } from '@prisma/client';
import { MatchEventType, type BallInput } from '@cric/types';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectionService } from './projection.service.js';
import { EventBusService } from '../events/event-bus.service.js';

function toOvers(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

const BALLS_PER_OVER = 6;
const LOCKED_MATCH_STATUSES = new Set<MatchStatus>([MatchStatus.COMPLETED, MatchStatus.ABANDONED]);

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projections: ProjectionService,
    private readonly eventBus: EventBusService,
  ) {}

  private async log(args: {
    tournamentId: string;
    matchId?: string;
    action: string;
    entityType: string;
    entityId: string;
    actor: string;
    payload?: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        tournamentId: args.tournamentId,
        matchId: args.matchId,
        action: args.action,
        entityType: args.entityType,
        entityId: args.entityId,
        actor: args.actor,
        payload: args.payload as any,
      },
    });
  }

  private async getMatch(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        innings: {
          orderBy: { inningsNumber: 'asc' },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }
    return match;
  }

  private assertMatchIsEditable(match: { status: MatchStatus }) {
    if (LOCKED_MATCH_STATUSES.has(match.status)) {
      throw new BadRequestException('Match already finished');
    }
  }

  private legalDelivery(extrasType?: ExtrasType | null): boolean {
    return extrasType !== ExtrasType.WIDE && extrasType !== ExtrasType.NO_BALL;
  }

  private validateBallInput(input: BallInput) {
    if (input.runsOffBat < 0 || input.runsOffBat > 6) {
      throw new BadRequestException('Runs off bat must be between 0 and 6');
    }

    if (input.extrasRuns !== undefined && input.extrasRuns < 0) {
      throw new BadRequestException('Extras runs cannot be negative');
    }

    if (!input.extrasType && (input.extrasRuns ?? 0) > 0) {
      throw new BadRequestException('extrasRuns cannot be set without extrasType');
    }

    if (input.extrasType === 'WIDE') {
      if (input.runsOffBat > 0) {
        throw new BadRequestException('Runs off bat cannot be recorded on a wide');
      }
      if ((input.extrasRuns ?? 0) < 1) {
        throw new BadRequestException('Wide must add at least 1 extra run');
      }
    }

    if (input.extrasType === 'NO_BALL' && (input.extrasRuns ?? 0) < 1) {
      throw new BadRequestException('No ball must add at least 1 extra run');
    }

    if ((input.extrasType === 'BYE' || input.extrasType === 'LEG_BYE') && input.runsOffBat > 0) {
      throw new BadRequestException(`${input.extrasType} cannot include runs off bat`);
    }

    if (input.wicket && !input.wicketType) {
      throw new BadRequestException('wicketType is required when wicket is true');
    }
  }

  private async getEligibleTeamPlayerIds(matchId: string, teamId: string) {
    const selectedPlayers = await this.prisma.squadSelection.findMany({
      where: {
        matchId,
        teamId,
        isPlayingXI: true,
      },
      select: {
        playerId: true,
      },
    });

    if (selectedPlayers.length > 0) {
      return new Set(selectedPlayers.map((row) => row.playerId));
    }

    const rosterPlayers = await this.prisma.teamPlayer.findMany({
      where: {
        teamId,
      },
      select: {
        playerId: true,
      },
    });

    return new Set(rosterPlayers.map((row) => row.playerId));
  }

  private async getOversLimit(tournamentId: string): Promise<number | null> {
    const settings = await this.prisma.seasonSettings.findUnique({
      where: { tournamentId },
      select: { oversPerInnings: true },
    });

    if (!settings) {
      return null;
    }

    return settings.oversPerInnings * BALLS_PER_OVER;
  }

  private async resolveInnings(matchId: string, inningsNumber?: 1 | 2) {
    const match = await this.getMatch(matchId);

    let activeInningsNumber = inningsNumber ?? (match.currentInnings as 0 | 1 | 2);
    if (!activeInningsNumber) {
      activeInningsNumber = 1;
      await this.startInnings(matchId, 1, 'system');
    }

    const innings = await this.prisma.innings.findUnique({
      where: {
        matchId_inningsNumber: {
          matchId,
          inningsNumber: activeInningsNumber,
        },
      },
    });

    if (!innings) {
      throw new NotFoundException('Innings not found');
    }

    return { match, innings };
  }

  private async getBattingLineupSize(matchId: string, battingTeamId: string): Promise<number | null> {
    const selectedCount = await this.prisma.squadSelection.count({
      where: {
        matchId,
        teamId: battingTeamId,
        isPlayingXI: true,
      },
    });

    if (selectedCount > 0) {
      return selectedCount;
    }

    const squadCount = await this.prisma.teamPlayer.count({
      where: { teamId: battingTeamId },
    });

    return squadCount > 0 ? squadCount : null;
  }

  private async recomputeInnings(inningsId: string) {
    const events = await this.prisma.ballEvent.findMany({
      where: {
        inningsId,
        isVoided: false,
      },
      orderBy: { sequence: 'asc' },
    });

    const totalRuns = events.reduce((sum, ball) => sum + ball.runsOffBat + ball.extrasRuns, 0);
    const wickets = events.filter((ball) => ball.wicket).length;
    const balls = events.filter((ball) => ball.isValidDelivery).length;
    const runRate = balls ? Number((totalRuns / (balls / 6)).toFixed(2)) : 0;

    const innings = await this.prisma.innings.update({
      where: { id: inningsId },
      data: {
        totalRuns,
        wickets,
        balls,
        runRate,
      },
    });

    const overs = await this.prisma.over.findMany({ where: { inningsId } });
    for (const over of overs) {
      const overEvents = events.filter((ball) => ball.overId === over.id);
      if (overEvents.length === 0) {
        await this.prisma.over.delete({ where: { id: over.id } });
      } else {
        await this.prisma.over.update({
          where: { id: over.id },
          data: {
            runs: overEvents.reduce((sum, ball) => sum + ball.runsOffBat + ball.extrasRuns, 0),
            wickets: overEvents.filter((ball) => ball.wicket).length,
            balls: overEvents.filter((ball) => ball.isValidDelivery).length,
          },
        });
      }
    }

    return innings;
  }

  private async resolveSecondInningsResult(matchId: string, secondInnings: { battingTeamId: string; totalRuns: number }, targetRuns?: number | null) {
    const innings1 = await this.prisma.innings.findUnique({
      where: {
        matchId_inningsNumber: {
          matchId,
          inningsNumber: 1,
        },
      },
    });

    if (!innings1) {
      return {
        winnerTeamId: secondInnings.battingTeamId,
        resultSummary: 'Second innings completed',
      };
    }

    const target = targetRuns ?? innings1.totalRuns + 1;
    if (secondInnings.totalRuns >= target) {
      return {
        winnerTeamId: secondInnings.battingTeamId,
        resultSummary: 'Target chased successfully',
      };
    }

    return {
      winnerTeamId: innings1.battingTeamId,
      resultSummary: 'Target not chased. First-innings side wins',
    };
  }

  private async publish(matchId: string, updatedBy: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        innings: {
          orderBy: { inningsNumber: 'asc' },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    await this.projections.rebuildMatchProjection(match.id);
    const [pointsRows] = await Promise.all([
      this.projections.rebuildPointsTable(match.tournamentId),
      this.projections.rebuildLeaderboards(match.tournamentId),
    ]);

    const score = match.innings.find((row) => row.inningsNumber === match.currentInnings);
    const payload = {
      matchId: match.id,
      status: match.status,
      statusText: match.statusText,
      currentInnings: match.currentInnings,
      score: score
        ? {
            runs: score.totalRuns,
            wickets: score.wickets,
            overs: toOvers(score.balls),
            runRate: score.runRate,
            target: match.targetRuns,
          }
        : null,
      pointsPreview: (pointsRows ?? []).slice(0, 5),
      updatedAt: match.updatedAt,
    };

    this.eventBus.publishMatchEvent({
      matchId: match.id,
      eventType: MatchEventType.SCORE_UPDATED,
      entityType: 'match',
      entityId: match.id,
      updatedBy,
      version: match.version,
      payload,
    });

    this.eventBus.publishTournamentEvent({
      eventType: MatchEventType.POINTS_UPDATED,
      entityType: 'tournament',
      entityId: match.tournamentId,
      updatedBy,
      version: Date.now(),
      payload: {
        matchId: match.id,
        status: match.status,
      },
    });

    return payload;
  }

  async updateToss(matchId: string, wonByTeamId: string, decision: string, updatedBy: string) {
    const match = await this.getMatch(matchId);
    this.assertMatchIsEditable(match);

    await this.prisma.$transaction([
      this.prisma.toss.upsert({
        where: { matchId },
        create: {
          matchId,
          wonByTeamId,
          decision,
        },
        update: {
          wonByTeamId,
          decision,
        },
      }),
      this.prisma.match.update({
        where: { id: matchId },
        data: {
          tossWonByTeamId: wonByTeamId,
          tossDecision: decision,
          status: MatchStatus.POST_TOSS,
          statusText: `${decision === 'BAT' ? 'Batting' : 'Bowling'} chosen at toss`,
          version: { increment: 1 },
        },
      }),
    ]);

    await this.log({
      tournamentId: match.tournamentId,
      matchId,
      action: 'MATCH_TOSS_UPDATED',
      entityType: 'match',
      entityId: matchId,
      actor: updatedBy,
      payload: { wonByTeamId, decision },
    });

    return this.publish(matchId, updatedBy);
  }

  async setPlayingXI(matchId: string, teamId: string, playerIds: string[], updatedBy: string) {
    if (playerIds.length < 2 || playerIds.length > 11) {
      throw new BadRequestException('Playing squad must contain between 2 and 11 players');
    }

    const match = await this.getMatch(matchId);
    this.assertMatchIsEditable(match);

    await this.prisma.$transaction([
      this.prisma.squadSelection.deleteMany({ where: { matchId, teamId } }),
      this.prisma.squadSelection.createMany({
        data: playerIds.map((playerId) => ({
          matchId,
          teamId,
          playerId,
          isPlayingXI: true,
        })),
      }),
      this.prisma.match.update({
        where: { id: matchId },
        data: {
          version: { increment: 1 },
        },
      }),
    ]);

    await this.log({
      tournamentId: match.tournamentId,
      matchId,
      action: 'MATCH_XI_UPDATED',
      entityType: 'match',
      entityId: matchId,
      actor: updatedBy,
      payload: { teamId, playerIds },
    });

    return this.publish(matchId, updatedBy);
  }

  async startInnings(matchId: string, inningsNumber: 1 | 2, updatedBy: string) {
    const match = await this.getMatch(matchId);
    this.assertMatchIsEditable(match);
    let innings1ForChase:
      | {
          battingTeamId: string;
          bowlingTeamId: string;
          totalRuns: number;
          isCompleted: boolean;
        }
      | null = null;

    if (inningsNumber === 2) {
      innings1ForChase = await this.prisma.innings.findUnique({
        where: {
          matchId_inningsNumber: {
            matchId,
            inningsNumber: 1,
          },
        },
        select: {
          battingTeamId: true,
          bowlingTeamId: true,
          totalRuns: true,
          isCompleted: true,
        },
      });

      if (!innings1ForChase) {
        throw new BadRequestException('Cannot start innings 2 before innings 1');
      }
      if (!innings1ForChase.isCompleted) {
        throw new BadRequestException('Cannot start innings 2 before innings 1 is completed');
      }
    }

    const existing = await this.prisma.innings.findUnique({
      where: {
        matchId_inningsNumber: {
          matchId,
          inningsNumber,
        },
      },
    });

    if (!existing) {
      let battingTeamId = match.teamAId;
      let bowlingTeamId = match.teamBId;

      if (inningsNumber === 1 && match.tossWonByTeamId && match.tossDecision) {
        if (match.tossDecision === 'BAT') {
          battingTeamId = match.tossWonByTeamId;
          bowlingTeamId = match.tossWonByTeamId === match.teamAId ? match.teamBId : match.teamAId;
        } else {
          bowlingTeamId = match.tossWonByTeamId;
          battingTeamId = match.tossWonByTeamId === match.teamAId ? match.teamBId : match.teamAId;
        }
      }

      if (inningsNumber === 2 && innings1ForChase) {
        battingTeamId = innings1ForChase.bowlingTeamId;
        bowlingTeamId = innings1ForChase.battingTeamId;
      }

      await this.prisma.innings.create({
        data: {
          matchId,
          inningsNumber,
          battingTeamId,
          bowlingTeamId,
        },
      });
    }

    const status = inningsNumber === 1 ? MatchStatus.INNINGS_1 : MatchStatus.INNINGS_2;
    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        currentInnings: inningsNumber,
        status,
        targetRuns: inningsNumber === 2 && innings1ForChase ? innings1ForChase.totalRuns + 1 : match.targetRuns,
        interruptionType: MatchInterruptionType.NONE,
        statusText: inningsNumber === 1 ? 'First innings underway' : 'Second innings chase underway',
        version: { increment: 1 },
      },
    });

    await this.log({
      tournamentId: match.tournamentId,
      matchId,
      action: 'INNINGS_STARTED',
      entityType: 'match',
      entityId: matchId,
      actor: updatedBy,
      payload: { inningsNumber },
    });

    return this.publish(matchId, updatedBy);
  }

  async recordBall(matchId: string, input: BallInput, updatedBy: string) {
    const { match, innings } = await this.resolveInnings(matchId, input.inningsNumber);
    this.assertMatchIsEditable(match);

    if (innings.isCompleted) {
      throw new BadRequestException('Innings already completed');
    }

    if (input.strikerId === input.nonStrikerId) {
      throw new BadRequestException('Striker and non-striker must be different players');
    }

    this.validateBallInput(input);

    const legal = this.legalDelivery(input.extrasType as ExtrasType | null | undefined);
    const nonVoided = await this.prisma.ballEvent.findMany({
      where: {
        matchId,
        inningsId: innings.id,
        isVoided: false,
      },
      include: {
        wicketEvent: true,
      },
      orderBy: { sequence: 'asc' },
    });

    if (input.inningsNumber === 2 && match.targetRuns !== null && innings.totalRuns >= match.targetRuns) {
      throw new BadRequestException('Target already achieved in this innings');
    }

    const dismissedBatterIds = new Set(
      nonVoided
        .filter((row) => row.wicket)
        .map((row) => row.wicketEvent?.dismissedPlayerId ?? row.strikerId),
    );

    if (dismissedBatterIds.has(input.strikerId)) {
      throw new BadRequestException('Selected striker is already out');
    }

    if (dismissedBatterIds.has(input.nonStrikerId)) {
      throw new BadRequestException('Selected non-striker is already out');
    }

    const effectiveDismissedId = input.wicket
      ? (input.dismissedPlayerId ?? input.strikerId)
      : null;

    if (input.wicket) {
      if (effectiveDismissedId !== input.strikerId && effectiveDismissedId !== input.nonStrikerId) {
        throw new BadRequestException('Dismissed player must be either the striker or non-striker');
      }

      if (input.extrasType === 'WIDE') {
        const allowedWideWickets = ['RUN_OUT', 'STUMPED', 'HIT_WICKET', 'OBSTRUCTING_THE_FIELD'];
        if (input.wicketType && !allowedWideWickets.includes(input.wicketType)) {
          throw new BadRequestException(`Cannot be dismissed as ${input.wicketType} on a wide`);
        }
      }

      if (input.extrasType === 'NO_BALL') {
        const allowedNoBallWickets = ['RUN_OUT', 'HIT_THE_BALL_TWICE', 'OBSTRUCTING_THE_FIELD'];
        if (input.wicketType && !allowedNoBallWickets.includes(input.wicketType)) {
          throw new BadRequestException(`Cannot be dismissed as ${input.wicketType} on a no ball`);
        }
      }

      if (['BOWLED', 'CAUGHT', 'LBW', 'STUMPED', 'HIT_WICKET'].includes(input.wicketType ?? '') && effectiveDismissedId !== input.strikerId) {
        throw new BadRequestException(`${input.wicketType} can only apply to the striker`);
      }
    }

    const [battingEligiblePlayers, bowlingEligiblePlayers] = await Promise.all([
      this.getEligibleTeamPlayerIds(matchId, innings.battingTeamId),
      this.getEligibleTeamPlayerIds(matchId, innings.bowlingTeamId),
    ]);

    if (!battingEligiblePlayers.has(input.strikerId)) {
      throw new BadRequestException('Striker must belong to batting team');
    }

    if (!battingEligiblePlayers.has(input.nonStrikerId)) {
      throw new BadRequestException('Non-striker must belong to batting team');
    }

    if (!bowlingEligiblePlayers.has(input.bowlerId)) {
      throw new BadRequestException('Bowler must belong to bowling team');
    }

    const lineupSize = await this.getBattingLineupSize(matchId, innings.battingTeamId);
    const maxWickets = lineupSize !== null ? Math.max(lineupSize - 1, 0) : null;
    if (maxWickets !== null) {
      const currentWickets = nonVoided.filter((row) => row.wicket).length;
      if (currentWickets >= maxWickets) {
        throw new BadRequestException(`Innings is all out: max wickets for ${lineupSize} players is ${maxWickets}`);
      }
    }

    const maxLegalBalls = await this.getOversLimit(match.tournamentId);
    const legalBallsSoFar = nonVoided.filter((row) => row.isValidDelivery).length;
    if (maxLegalBalls !== null && legalBallsSoFar >= maxLegalBalls) {
      throw new BadRequestException(`Innings already reached over limit (${maxLegalBalls / BALLS_PER_OVER} overs)`);
    }

    const lastBallEvent = await this.prisma.ballEvent.findFirst({
      where: { matchId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    const sequence = (lastBallEvent?.sequence ?? 0) + 1;
    const overNumber = Math.floor(legalBallsSoFar / BALLS_PER_OVER) + 1;
    const ballInOver = (legalBallsSoFar % BALLS_PER_OVER) + 1;

    let over = await this.prisma.over.findUnique({
      where: {
        inningsId_overNumber: {
          inningsId: innings.id,
          overNumber,
        },
      },
    });

    if (over) {
      if (over.bowlerId !== input.bowlerId) {
        throw new BadRequestException('Bowler cannot change within an over');
      }
    } else {
      const previousOver =
        overNumber > 1
          ? await this.prisma.over.findUnique({
              where: {
                inningsId_overNumber: {
                  inningsId: innings.id,
                  overNumber: overNumber - 1,
                },
              },
            })
          : null;

      if (previousOver?.bowlerId === input.bowlerId) {
        throw new BadRequestException('Same bowler cannot bowl consecutive overs');
      }

      over = await this.prisma.over.create({
        data: {
          inningsId: innings.id,
          overNumber,
          bowlerId: input.bowlerId,
        },
      });
    }

    const extrasRuns = input.extrasRuns ?? 0;
    const event = await this.prisma.ballEvent.create({
      data: {
        matchId,
        inningsId: innings.id,
        overId: over.id,
        sequence,
        ballInOver,
        runsOffBat: input.runsOffBat,
        extrasType: (input.extrasType as ExtrasType | undefined) ?? null,
        extrasRuns,
        wicket: Boolean(input.wicket),
        wicketType: input.wicketType ?? null,
        strikerId: input.strikerId,
        nonStrikerId: input.nonStrikerId,
        bowlerId: input.bowlerId,
        isValidDelivery: legal,
        commentary: input.commentary ?? null,
        createdBy: String(updatedBy),
      },
    });

    if (input.extrasType) {
      await this.prisma.extrasEvent.create({
        data: {
          ballEventId: event.id,
          extrasType: input.extrasType as ExtrasType,
          runs: extrasRuns,
        },
      });
    }

    if (input.wicket) {
      await this.prisma.wicketEvent.create({
        data: {
          ballEventId: event.id,
          dismissalType: input.wicketType ?? 'OUT',
          dismissedPlayerId: effectiveDismissedId,
        },
      });
    }

    const updatedInnings = await this.recomputeInnings(innings.id);

    const targetAchieved = input.inningsNumber === 2 && match.targetRuns !== null && updatedInnings.totalRuns >= match.targetRuns;
    const inningsAllOut = maxWickets !== null && updatedInnings.wickets >= maxWickets;
    const inningsOversExhausted = maxLegalBalls !== null && updatedInnings.balls >= maxLegalBalls;
    const inningsCompletedByLimits = inningsAllOut || inningsOversExhausted;
    const chaseFailedWithInningsComplete =
      input.inningsNumber === 2 &&
      match.targetRuns !== null &&
      updatedInnings.totalRuns < match.targetRuns &&
      inningsCompletedByLimits;

    if (input.inningsNumber === 1 && inningsCompletedByLimits) {
      const targetRuns = updatedInnings.totalRuns + 1;
      await this.prisma.$transaction([
        this.prisma.innings.update({
          where: { id: updatedInnings.id },
          data: {
            isCompleted: true,
          },
        }),
        this.prisma.match.update({
          where: { id: matchId },
          data: {
            status: MatchStatus.INNINGS_BREAK,
            targetRuns,
            statusText: `Innings break. Target ${targetRuns}`,
            interruptionType: MatchInterruptionType.NONE,
            version: { increment: 1 },
          },
        }),
      ]);
    } else if (targetAchieved || chaseFailedWithInningsComplete) {
      const result = await this.resolveSecondInningsResult(matchId, updatedInnings, match.targetRuns);

      await this.prisma.$transaction([
        this.prisma.innings.update({
          where: { id: updatedInnings.id },
          data: {
            isCompleted: true,
          },
        }),
        this.prisma.match.update({
          where: { id: matchId },
          data: {
            status: MatchStatus.COMPLETED,
            winnerTeamId: result.winnerTeamId,
            resultSummary: result.resultSummary,
            statusText: 'Match completed',
            interruptionType: MatchInterruptionType.NONE,
            publishedAt: new Date(),
            version: { increment: 1 },
          },
        }),
      ]);
    } else {
      await this.prisma.match.update({
        where: { id: matchId },
        data: {
          status: input.inningsNumber === 1 ? MatchStatus.INNINGS_1 : MatchStatus.INNINGS_2,
          currentInnings: input.inningsNumber,
          interruptionType: MatchInterruptionType.NONE,
          statusText: input.inningsNumber === 1 ? 'First innings live' : 'Chase in progress',
          version: { increment: 1 },
        },
      });
    }

    await this.log({
      tournamentId: match.tournamentId,
      matchId,
      action: 'BALL_RECORDED',
      entityType: 'ball_event',
      entityId: event.id,
      actor: updatedBy,
      payload: input,
    });

    return this.publish(matchId, updatedBy);
  }

  async undoLastBall(matchId: string, updatedBy: string) {
    const match = await this.getMatch(matchId);
    if (match.status === MatchStatus.ABANDONED) {
      throw new BadRequestException('Cannot undo ball on abandoned match');
    }

    const last = await this.prisma.ballEvent.findFirst({
      where: {
        matchId,
        isVoided: false,
      },
      orderBy: { sequence: 'desc' },
    });

    if (!last) {
      throw new BadRequestException('No ball events to undo');
    }

    await this.prisma.ballEvent.update({
      where: { id: last.id },
      data: {
        isVoided: true,
      },
    });

    const lastInnings = await this.prisma.innings.findUnique({
      where: { id: last.inningsId },
    });

    if (lastInnings?.isCompleted) {
      await this.prisma.innings.update({
        where: { id: last.inningsId },
        data: { isCompleted: false },
      });
    }

    await this.recomputeInnings(last.inningsId);

    const revertedStatus =
      lastInnings?.inningsNumber === 2 ? MatchStatus.INNINGS_2 : MatchStatus.INNINGS_1;
    const revertedStatusText =
      lastInnings?.inningsNumber === 2
        ? 'Chase in progress (last ball undone)'
        : 'First innings live (last ball undone)';

    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: revertedStatus,
        currentInnings: lastInnings?.inningsNumber ?? match.currentInnings,
        winnerTeamId: null,
        resultSummary: null,
        statusText: revertedStatusText,
        version: { increment: 1 },
      },
    });

    if (match.fixtureId) {
      await this.prisma.fixture.update({
        where: { id: match.fixtureId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    await this.log({
      tournamentId: match.tournamentId,
      matchId,
      action: 'BALL_UNDONE',
      entityType: 'ball_event',
      entityId: last.id,
      actor: updatedBy,
      payload: null,
    });

    return this.publish(matchId, updatedBy);
  }

  async editLastBall(matchId: string, input: BallInput, updatedBy: string) {
    const match = await this.getMatch(matchId);
    if (match.status === MatchStatus.ABANDONED) {
      throw new BadRequestException('Cannot edit ball on abandoned match');
    }

    const last = await this.prisma.ballEvent.findFirst({
      where: {
        matchId,
        isVoided: false,
      },
      orderBy: { sequence: 'desc' },
    });

    if (!last) {
      throw new BadRequestException('No ball event available for edit');
    }

    await this.prisma.ballEvent.update({
      where: { id: last.id },
      data: {
        isVoided: true,
      },
    });

    await this.prisma.innings.update({
      where: { id: last.inningsId },
      data: { isCompleted: false },
    });

    await this.recomputeInnings(last.inningsId);

    await this.recordBall(matchId, input, updatedBy);

    await this.log({
      tournamentId: match.tournamentId,
      matchId,
      action: 'BALL_EDITED',
      entityType: 'ball_event',
      entityId: last.id,
      actor: updatedBy,
      payload: input,
    });

    return this.publish(matchId, updatedBy);
  }

  async endInnings(matchId: string, updatedBy: string) {
    const match = await this.getMatch(matchId);
    this.assertMatchIsEditable(match);
    if (!match.currentInnings) {
      throw new BadRequestException('No innings in progress');
    }

    const innings = await this.prisma.innings.findUnique({
      where: {
        matchId_inningsNumber: {
          matchId,
          inningsNumber: match.currentInnings,
        },
      },
    });

    if (!innings) {
      throw new NotFoundException('Current innings not found');
    }

    await this.prisma.innings.update({
      where: { id: innings.id },
      data: {
        isCompleted: true,
      },
    });

    if (match.currentInnings === 1) {
      await this.prisma.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.INNINGS_BREAK,
          targetRuns: innings.totalRuns + 1,
          statusText: `Innings break. Target ${innings.totalRuns + 1}`,
          version: { increment: 1 },
        },
      });
    } else {
      const result = await this.resolveSecondInningsResult(matchId, innings, match.targetRuns);
      await this.prisma.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.COMPLETED,
          winnerTeamId: result.winnerTeamId,
          resultSummary: result.resultSummary,
          statusText: 'Match completed',
          publishedAt: new Date(),
          version: { increment: 1 },
        },
      });

      await this.prisma.fixture.update({
        where: { id: match.fixtureId },
        data: {
          status: 'COMPLETED',
        },
      });
    }

    await this.log({
      tournamentId: match.tournamentId,
      matchId,
      action: 'INNINGS_ENDED',
      entityType: 'innings',
      entityId: innings.id,
      actor: updatedBy,
      payload: {
        inningsNumber: match.currentInnings,
      },
    });

    return this.publish(matchId, updatedBy);
  }

  async setInterruption(matchId: string, type: MatchInterruptionType, statusText: string, updatedBy: string) {
    const match = await this.getMatch(matchId);
    this.assertMatchIsEditable(match);
    const nextStatus = type === MatchInterruptionType.ABANDONED ? MatchStatus.ABANDONED : MatchStatus.DELAYED;

    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        interruptionType: type,
        status: nextStatus,
        statusText,
        publishedAt: nextStatus === MatchStatus.ABANDONED ? new Date() : undefined,
        version: { increment: 1 },
      },
    });

    await this.log({
      tournamentId: match.tournamentId,
      matchId,
      action: 'MATCH_INTERRUPTED',
      entityType: 'match',
      entityId: matchId,
      actor: updatedBy,
      payload: { type, statusText },
    });

    return this.publish(matchId, updatedBy);
  }

  async declareResult(
    matchId: string,
    data: {
      winnerTeamId: string | null;
      resultSummary: string;
      momPlayerId?: string | null;
    },
    updatedBy: string,
  ) {
    const match = await this.getMatch(matchId);
    this.assertMatchIsEditable(match);

    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        winnerTeamId: data.winnerTeamId,
        resultSummary: data.resultSummary,
        momPlayerId: data.momPlayerId ?? null,
        status: MatchStatus.COMPLETED,
        publishedAt: new Date(),
        statusText: data.resultSummary,
        version: { increment: 1 },
      },
    });

    await this.prisma.fixture.update({
      where: { id: match.fixtureId },
      data: {
        status: 'COMPLETED',
      },
    });

    if (data.momPlayerId) {
      const existingAward = await this.prisma.award.findFirst({
        where: { matchId, type: AwardType.MAN_OF_THE_MATCH },
      });
      if (existingAward) {
        await this.prisma.award.update({
          where: { id: existingAward.id },
          data: { playerId: data.momPlayerId, locked: true },
        });
      } else {
        await this.prisma.award.create({
          data: {
            tournamentId: match.tournamentId,
            matchId,
            playerId: data.momPlayerId,
            type: AwardType.MAN_OF_THE_MATCH,
            reason: `Man of the Match for ${match.matchNumber}`,
            locked: true,
          },
        });
      }
    }

    await this.log({
      tournamentId: match.tournamentId,
      matchId,
      action: 'RESULT_DECLARED',
      entityType: 'match',
      entityId: matchId,
      actor: updatedBy,
      payload: data,
    });

    await this.publish(matchId, updatedBy);

    const updatedMatch = await this.prisma.match.findUnique({ where: { id: matchId } });
    this.eventBus.publishMatchEvent({
      matchId,
      eventType: MatchEventType.RESULT_PUBLISHED,
      entityType: 'match',
      entityId: matchId,
      updatedBy,
      version: updatedMatch?.version ?? Date.now(),
      payload: data,
    });

    return updatedMatch;
  }

  async setManOfMatch(matchId: string, playerId: string, updatedBy: string) {
    const match = await this.getMatch(matchId);
    if (match.status === MatchStatus.ABANDONED) {
      throw new BadRequestException('Cannot set Man of the Match for abandoned match');
    }

    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        momPlayerId: playerId,
        version: { increment: 1 },
      },
    });

    const existingAward = await this.prisma.award.findFirst({
      where: { matchId, type: AwardType.MAN_OF_THE_MATCH },
    });

    if (existingAward) {
      await this.prisma.award.update({
        where: { id: existingAward.id },
        data: { playerId, locked: true },
      });
    } else {
      await this.prisma.award.create({
        data: {
          tournamentId: match.tournamentId,
          matchId,
          playerId,
          type: AwardType.MAN_OF_THE_MATCH,
          reason: `Man of the Match for ${match.matchNumber}`,
          locked: true,
        },
      });
    }

    await this.log({
      tournamentId: match.tournamentId,
      matchId,
      action: 'MOM_UPDATED',
      entityType: 'match',
      entityId: matchId,
      actor: updatedBy,
      payload: { playerId },
    });

    await this.publish(matchId, updatedBy);
    return updated;
  }
}
