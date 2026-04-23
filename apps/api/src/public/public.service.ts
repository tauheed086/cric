import { Injectable, NotFoundException } from '@nestjs/common';
import { LeaderboardMetric } from '@prisma/client';
import { type DashboardPayload, type MatchCard, type PointsTableRow } from '@cric/types';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectionService } from '../scoring/projection.service.js';

function oversLabel(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projections: ProjectionService,
  ) {}

  private async getTournament() {
    const tournament = await this.prisma.tournament.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    return tournament;
  }

  private toMatchCard(match: any): MatchCard {
    const innings = match.innings ?? [];
    const inningScore = (row: any) => ({
      runs: row.totalRuns,
      wickets: row.wickets,
      overs: oversLabel(row.balls),
      runRate: row.runRate,
    });

    const current = innings.find((row: any) => row.inningsNumber === match.currentInnings);
    const teamAInnings = innings.find((row: any) => row.battingTeamId === match.teamA.id);
    const teamBInnings = innings.find((row: any) => row.battingTeamId === match.teamB.id);
    const score = current
      ? {
          ...inningScore(current),
          target: match.targetRuns,
          requiredRate:
            match.targetRuns && current.balls > 0
              ? Number((((match.targetRuns - current.totalRuns) / Math.max((120 - current.balls) / 6, 1)).toFixed(2)))
              : null,
        }
      : undefined;

    return {
      id: match.id,
      matchNumber: match.matchNumber,
      venue: match.venue.name,
      stage: match.stage,
      status: match.status,
      startsAt: match.startsAt.toISOString(),
      teamA: {
        id: match.teamA.id,
        name: match.teamA.name,
        shortName: match.teamA.shortName,
        logoUrl: match.teamA.logoUrl,
      },
      teamB: {
        id: match.teamB.id,
        name: match.teamB.name,
        shortName: match.teamB.shortName,
        logoUrl: match.teamB.logoUrl,
      },
      score,
      teamAScore: teamAInnings ? inningScore(teamAInnings) : null,
      teamBScore: teamBInnings ? inningScore(teamBInnings) : null,
      currentBattingTeamId: current?.battingTeamId ?? null,
      winnerTeamId: match.winnerTeamId ?? null,
      tossText: match.toss ? `${match.toss.wonByTeamId === match.teamA.id ? match.teamA.name : match.teamB.name} won toss` : null,
      statusText: match.statusText,
      lastUpdatedAt: match.updatedAt?.toISOString(),
    };
  }

  async homeDashboard(): Promise<DashboardPayload> {
    const tournament = await this.getTournament();
    const [matches, pointsRows, topBatters, topBowlers, announcement] = await Promise.all([
      this.prisma.match.findMany({
        where: { tournamentId: tournament.id },
        include: {
          teamA: true,
          teamB: true,
          venue: true,
          toss: true,
          innings: true,
        },
        orderBy: { startsAt: 'asc' },
      }),
      this.prisma.pointsTableProjection.findMany({
        where: { tournamentId: tournament.id },
        include: { team: true },
        orderBy: [{ points: 'desc' }, { netRunRate: 'desc' }],
        take: 6,
      }),
      this.projections.listLeaderboard(LeaderboardMetric.MOST_RUNS),
      this.projections.listLeaderboard(LeaderboardMetric.MOST_WICKETS),
      this.prisma.announcement.findFirst({
        where: { tournamentId: tournament.id, isPublished: true },
        orderBy: { publishedAt: 'desc' },
      }),
    ]);

    const ongoing = matches.filter((row) => ['INNINGS_1', 'INNINGS_2', 'INNINGS_BREAK', 'DELAYED'].includes(row.status)).slice(0, 3);
    const upcoming = matches.filter((row) => ['UPCOMING', 'PRE_TOSS', 'POST_TOSS'].includes(row.status)).slice(0, 4);
    const recentResults = matches
      .filter((row) => ['COMPLETED', 'ABANDONED'].includes(row.status))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 4);

    return {
      tournamentName: tournament.name,
      season: tournament.season,
      ongoingMatches: ongoing.map((row) => this.toMatchCard(row)),
      upcomingFixtures: upcoming.map((row) => this.toMatchCard(row)),
      recentResults: recentResults.map((row) => this.toMatchCard(row)),
      pointsPreview: pointsRows.map((row) => ({
        teamId: row.teamId,
        teamName: row.team.name,
        played: row.played,
        won: row.won,
        lost: row.lost,
        tied: row.tied,
        noResult: row.noResult,
        points: row.points,
        netRunRate: row.netRunRate,
        qualified: row.qualified,
        eliminated: row.eliminated,
      })),
      topBatters: topBatters.slice(0, 5),
      topBowlers: topBowlers.slice(0, 5),
      announcement: announcement
        ? {
            id: announcement.id,
            title: announcement.title,
            body: announcement.body,
            publishedAt: (announcement.publishedAt ?? announcement.createdAt).toISOString(),
          }
        : null,
    };
  }

  async fixtures(status?: string, date?: string) {
    const tournament = await this.getTournament();
    const filters: any = { tournamentId: tournament.id };

    if (status) {
      const map: Record<string, string[]> = {
        UPCOMING: ['UPCOMING', 'PRE_TOSS', 'POST_TOSS'],
        IN_PROGRESS: ['INNINGS_1', 'INNINGS_2', 'INNINGS_BREAK', 'DELAYED'],
        COMPLETED: ['COMPLETED'],
        ABANDONED: ['ABANDONED'],
        DELAYED: ['DELAYED'],
      };
      filters.status = { in: map[status] ?? [status] };
    }

    if (date) {
      const d = new Date(date);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      filters.startsAt = { gte: start, lte: end };
    }

    const matches = await this.prisma.match.findMany({
      where: filters,
      include: {
        teamA: true,
        teamB: true,
        venue: true,
        toss: true,
        innings: true,
      },
      orderBy: { startsAt: 'asc' },
    });

    return matches.map((row) => this.toMatchCard(row));
  }

  async matchOverview(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: true,
        teamB: true,
        venue: true,
        innings: true,
        toss: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }
    return this.toMatchCard(match);
  }

  async matchScorecard(matchId: string) {
    const projection = await this.prisma.scorecardProjection.findUnique({
      where: { matchId },
    });
    if (!projection) {
      await this.projections.rebuildMatchProjection(matchId);
      return this.prisma.scorecardProjection.findUnique({ where: { matchId } });
    }
    return projection;
  }

  async matchCommentary(matchId: string) {
    return this.prisma.ballEvent.findMany({
      where: {
        matchId,
        isVoided: false,
      },
      include: {
        striker: true,
        bowler: true,
      },
      orderBy: { sequence: 'desc' },
      take: 100,
    });
  }

  async matchSquads(matchId: string) {
    return this.prisma.squadSelection.findMany({
      where: { matchId },
      include: {
        player: true,
      },
      orderBy: {
        player: {
          displayName: 'asc',
        },
      },
    });
  }

  async matchStats(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        innings: true,
      },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    const innings1 = match.innings.find((row) => row.inningsNumber === 1);
    const innings2 = match.innings.find((row) => row.inningsNumber === 2);

    return {
      innings1: innings1
        ? {
            runs: innings1.totalRuns,
            wickets: innings1.wickets,
            overs: oversLabel(innings1.balls),
            runRate: innings1.runRate,
          }
        : null,
      innings2: innings2
        ? {
            runs: innings2.totalRuns,
            wickets: innings2.wickets,
            overs: oversLabel(innings2.balls),
            runRate: innings2.runRate,
          }
        : null,
      target: match.targetRuns,
      statusText: match.statusText,
      resultSummary: match.resultSummary,
    };
  }

  async results() {
    const tournament = await this.getTournament();
    const matches = await this.prisma.match.findMany({
      where: {
        tournamentId: tournament.id,
        status: { in: ['COMPLETED', 'ABANDONED'] as any },
      },
      include: {
        teamA: true,
        teamB: true,
        venue: true,
        innings: true,
        toss: true,
      },
      orderBy: { publishedAt: 'desc' },
    });
    return matches.map((row) => this.toMatchCard(row));
  }

  async pointsTable(): Promise<PointsTableRow[]> {
    const tournament = await this.getTournament();
    const existing = await this.prisma.pointsTableProjection.findMany({
      where: { tournamentId: tournament.id },
      include: { team: true },
      orderBy: [{ points: 'desc' }, { netRunRate: 'desc' }],
    });
    if (!existing.length) {
      await this.projections.rebuildPointsTable(tournament.id);
      return this.pointsTable();
    }

    return existing.map((row) => ({
      teamId: row.teamId,
      teamName: row.team.name,
      played: row.played,
      won: row.won,
      lost: row.lost,
      tied: row.tied,
      noResult: row.noResult,
      points: row.points,
      netRunRate: row.netRunRate,
      qualified: row.qualified,
      eliminated: row.eliminated,
    }));
  }

  async teamPage(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        teamPlayers: {
          include: {
            player: true,
          },
        },
        fixturesAsA: true,
        fixturesAsB: true,
      },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const points = await this.prisma.pointsTableProjection.findFirst({
      where: {
        teamId,
      },
    });

    return {
      team,
      summary: points,
      squad: team.teamPlayers.map((row) => row.player),
      fixtures: [...team.fixturesAsA, ...team.fixturesAsB].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    };
  }

  async playerPage(playerId: string) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    const [battingEvents, bowlingEvents, awards, rankings] = await Promise.all([
      this.prisma.ballEvent.findMany({
        where: { strikerId: playerId, isVoided: false },
      }),
      this.prisma.ballEvent.findMany({
        where: { bowlerId: playerId, isVoided: false },
      }),
      this.prisma.award.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.leaderboardProjection.findMany({
        where: { playerId },
        orderBy: { rank: 'asc' },
      }),
    ]);

    const runs = battingEvents.reduce((sum, row) => sum + row.runsOffBat, 0);
    const ballsFaced = battingEvents.filter((row) => row.isValidDelivery).length;
    const wickets = bowlingEvents.filter((row) => row.wicket).length;
    const ballsBowled = bowlingEvents.filter((row) => row.isValidDelivery).length;
    const conceded = bowlingEvents.reduce((sum, row) => sum + row.runsOffBat + row.extrasRuns, 0);
    const fours = battingEvents.filter((row) => row.runsOffBat === 4).length;
    const sixes = battingEvents.filter((row) => row.runsOffBat === 6).length;

    return {
      player,
      stats: {
        runs,
        wickets,
        strikeRate: ballsFaced ? Number(((runs / ballsFaced) * 100).toFixed(2)) : 0,
        economy: ballsBowled ? Number((conceded / (ballsBowled / 6)).toFixed(2)) : 0,
        ballsFaced,
        ballsBowled,
        fours,
        sixes,
      },
      awards,
      rankings,
    };
  }

  async leaderboards() {
    const [runs, wickets, strikeRate, economy, sixes, fours, mvp] = await Promise.all([
      this.projections.listLeaderboard(LeaderboardMetric.MOST_RUNS),
      this.projections.listLeaderboard(LeaderboardMetric.MOST_WICKETS),
      this.projections.listLeaderboard(LeaderboardMetric.BEST_STRIKE_RATE),
      this.projections.listLeaderboard(LeaderboardMetric.BEST_ECONOMY),
      this.projections.listLeaderboard(LeaderboardMetric.MOST_SIXES),
      this.projections.listLeaderboard(LeaderboardMetric.MOST_FOURS),
      this.projections.listLeaderboard(LeaderboardMetric.MVP),
    ]);
    return {
      mostRuns: runs,
      mostWickets: wickets,
      bestStrikeRate: strikeRate,
      bestEconomy: economy,
      mostSixes: sixes,
      mostFours: fours,
      mvp,
    };
  }

  async awards() {
    const tournament = await this.getTournament();
    return this.prisma.award.findMany({
      where: { tournamentId: tournament.id },
      include: {
        player: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async announcements() {
    const tournament = await this.getTournament();
    return this.prisma.announcement.findMany({
      where: {
        tournamentId: tournament.id,
        isPublished: true,
      },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async search(query: string) {
    const tournament = await this.getTournament();
    const q = query.trim();
    if (!q) {
      return {
        teams: [],
        players: [],
        matches: [],
      };
    }
    const [teams, players, matches] = await Promise.all([
      this.prisma.team.findMany({
        where: { tournamentId: tournament.id, name: { contains: q, mode: 'insensitive' } },
        take: 20,
      }),
      this.prisma.player.findMany({
        where: { tournamentId: tournament.id, displayName: { contains: q, mode: 'insensitive' } },
        take: 20,
      }),
      this.prisma.match.findMany({
        where: { tournamentId: tournament.id, matchNumber: { contains: q, mode: 'insensitive' } },
        include: {
          teamA: true,
          teamB: true,
          venue: true,
          innings: true,
          toss: true,
        },
        take: 20,
      }),
    ]);

    return {
      teams,
      players,
      matches: matches.map((row) => this.toMatchCard(row)),
    };
  }
}
