import { Injectable } from '@nestjs/common';
import { LeaderboardMetric, Prisma } from '@prisma/client';
import { MatchStatus, type LeaderboardRow, type PointsTableRow } from '@cric/types';
import { PrismaService } from '../prisma/prisma.service.js';

function oversFromBalls(balls: number): number {
  if (balls === 0) {
    return 0;
  }
  return balls / 6;
}

function formatOvers(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

@Injectable()
export class ProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  async rebuildMatchProjection(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        innings: {
          include: {
            ballEvents: {
              where: { isVoided: false },
              include: {
                striker: true,
                bowler: true,
              },
              orderBy: { sequence: 'asc' },
            },
            battingTeam: true,
            bowlingTeam: true,
          },
          orderBy: { inningsNumber: 'asc' },
        },
      },
    });

    if (!match) {
      return null;
    }

    const inningsPayload = match.innings.map((innings) => {
      const batting = new Map<string, { name: string; runs: number; balls: number; fours: number; sixes: number }>();
      const bowling = new Map<string, { name: string; balls: number; runs: number; wickets: number }>();
      const fallOfWickets: Array<{ score: string; over: string; player: string }> = [];
      let extras = 0;

      for (const ball of innings.ballEvents) {
        const batter = batting.get(ball.strikerId) ?? {
          name: ball.striker.displayName,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
        };
        batter.runs += ball.runsOffBat;
        if (ball.isValidDelivery) {
          batter.balls += 1;
        }
        if (ball.runsOffBat === 4) {
          batter.fours += 1;
        }
        if (ball.runsOffBat === 6) {
          batter.sixes += 1;
        }
        batting.set(ball.strikerId, batter);

        const bowler = bowling.get(ball.bowlerId) ?? {
          name: ball.bowler.displayName,
          balls: 0,
          runs: 0,
          wickets: 0,
        };
        if (ball.isValidDelivery) {
          bowler.balls += 1;
        }
        bowler.runs += ball.runsOffBat + ball.extrasRuns;
        if (ball.wicket) {
          bowler.wickets += 1;
          const totalAtWicket = innings.ballEvents
            .filter((item) => item.sequence <= ball.sequence)
            .reduce((sum, item) => sum + item.runsOffBat + item.extrasRuns, 0);
          const wicketsAtPoint = innings.ballEvents.filter((item) => item.sequence <= ball.sequence && item.wicket).length;
          const legalBallsAtPoint = innings.ballEvents
            .filter((item) => item.sequence <= ball.sequence && item.isValidDelivery)
            .length;
          fallOfWickets.push({
            score: `${totalAtWicket}/${wicketsAtPoint}`,
            over: formatOvers(legalBallsAtPoint),
            player: ball.striker.displayName,
          });
        }
        bowling.set(ball.bowlerId, bowler);

        extras += ball.extrasRuns;
      }

      return {
        inningsNumber: innings.inningsNumber,
        battingTeam: innings.battingTeam.name,
        bowlingTeam: innings.bowlingTeam.name,
        totalRuns: innings.totalRuns,
        wickets: innings.wickets,
        overs: formatOvers(innings.balls),
        runRate: innings.runRate,
        extras,
        batting: Array.from(batting.values()),
        bowling: Array.from(bowling.values()).map((row) => ({
          ...row,
          overs: formatOvers(row.balls),
          economy: row.balls ? Number((row.runs / (row.balls / 6)).toFixed(2)) : 0,
        })),
        fallOfWickets,
      };
    });

    const summary = {
      status: match.status,
      statusText: match.statusText,
      targetRuns: match.targetRuns,
      resultSummary: match.resultSummary,
      lastUpdatedAt: match.updatedAt.toISOString(),
    };

    const innings1 = inningsPayload[0] ?? {};
    const innings2 = inningsPayload[1] ?? null;

    await this.prisma.scorecardProjection.upsert({
      where: { matchId: match.id },
      create: {
        matchId: match.id,
        innings1,
        innings2,
        summary,
      },
      update: {
        innings1,
        innings2,
        summary,
        lastComputedAt: new Date(),
      },
    });

    return { inningsPayload, summary };
  }

  async rebuildPointsTable(tournamentId: string): Promise<PointsTableRow[]> {
    const [teams, matches, seasonSettings] = await Promise.all([
      this.prisma.team.findMany({ where: { tournamentId } }),
      this.prisma.match.findMany({
        where: {
          tournamentId,
          status: { in: [MatchStatus.COMPLETED, MatchStatus.ABANDONED] as any },
        },
        include: {
          innings: true,
        },
      }),
      this.prisma.seasonSettings.findUnique({ where: { tournamentId } }),
    ]);

    const pointsWin = seasonSettings?.pointsRuleWin ?? 2;
    const pointsTie = seasonSettings?.pointsRuleTie ?? 1;
    const pointsNoResult = seasonSettings?.pointsRuleNoResult ?? 1;

    const rows = new Map<string, PointsTableRow & { runsFor: number; ballsFor: number; runsAgainst: number; ballsAgainst: number }>();
    for (const team of teams) {
      rows.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        noResult: 0,
        points: 0,
        netRunRate: 0,
        qualified: false,
        eliminated: false,
        runsFor: 0,
        ballsFor: 0,
        runsAgainst: 0,
        ballsAgainst: 0,
      });
    }

    for (const match of matches) {
      const a = rows.get(match.teamAId);
      const b = rows.get(match.teamBId);
      if (!a || !b) {
        continue;
      }
      a.played += 1;
      b.played += 1;

      const innings1 = match.innings.find((i) => i.inningsNumber === 1);
      const innings2 = match.innings.find((i) => i.inningsNumber === 2);

      if (innings1 && innings2) {
        const team1 = rows.get(innings1.battingTeamId);
        const team2 = rows.get(innings2.battingTeamId);
        if (team1 && team2) {
          team1.runsFor += innings1.totalRuns;
          team1.ballsFor += innings1.balls;
          team1.runsAgainst += innings2.totalRuns;
          team1.ballsAgainst += innings2.balls;

          team2.runsFor += innings2.totalRuns;
          team2.ballsFor += innings2.balls;
          team2.runsAgainst += innings1.totalRuns;
          team2.ballsAgainst += innings1.balls;
        }
      }

      if (match.status === MatchStatus.ABANDONED || !match.winnerTeamId) {
        a.noResult += 1;
        b.noResult += 1;
        a.points += pointsNoResult;
        b.points += pointsNoResult;
      } else if (match.winnerTeamId === match.teamAId) {
        a.won += 1;
        b.lost += 1;
        a.points += pointsWin;
      } else if (match.winnerTeamId === match.teamBId) {
        b.won += 1;
        a.lost += 1;
        b.points += pointsWin;
      } else {
        a.tied += 1;
        b.tied += 1;
        a.points += pointsTie;
        b.points += pointsTie;
      }
    }

    const materialized = Array.from(rows.values()).map((row) => {
      const oversFor = oversFromBalls(row.ballsFor);
      const oversAgainst = oversFromBalls(row.ballsAgainst);
      const nrrFor = oversFor > 0 ? row.runsFor / oversFor : 0;
      const nrrAgainst = oversAgainst > 0 ? row.runsAgainst / oversAgainst : 0;
      row.netRunRate = Number((nrrFor - nrrAgainst).toFixed(3));
      return row;
    });

    materialized.sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }
      return right.netRunRate - left.netRunRate;
    });

    materialized.forEach((row, index) => {
      row.qualified = index < 4;
      row.eliminated = index >= Math.max(teams.length - 2, 0);
    });

    await this.prisma.$transaction([
      this.prisma.pointsTableProjection.deleteMany({ where: { tournamentId } }),
      this.prisma.pointsTableProjection.createMany({
        data: materialized.map((row) => ({
          tournamentId,
          teamId: row.teamId,
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
      }),
    ]);

    return materialized.map(({ runsFor: _rf, ballsFor: _bf, runsAgainst: _ra, ballsAgainst: _ba, ...row }) => row);
  }

  async rebuildLeaderboards(tournamentId: string) {
    const balls = await this.prisma.ballEvent.findMany({
      where: {
        isVoided: false,
        match: { tournamentId },
      },
      include: {
        striker: true,
        bowler: true,
      },
      orderBy: { sequence: 'asc' },
    });

    const battingMap = new Map<string, { runs: number; balls: number; fours: number; sixes: number }>();
    const bowlingMap = new Map<string, { balls: number; runs: number; wickets: number }>();

    for (const ball of balls) {
      const batter = battingMap.get(ball.strikerId) ?? { runs: 0, balls: 0, fours: 0, sixes: 0 };
      batter.runs += ball.runsOffBat;
      if (ball.isValidDelivery) {
        batter.balls += 1;
      }
      if (ball.runsOffBat === 4) {
        batter.fours += 1;
      }
      if (ball.runsOffBat === 6) {
        batter.sixes += 1;
      }
      battingMap.set(ball.strikerId, batter);

      const bowler = bowlingMap.get(ball.bowlerId) ?? { balls: 0, runs: 0, wickets: 0 };
      if (ball.isValidDelivery) {
        bowler.balls += 1;
      }
      bowler.runs += ball.runsOffBat + ball.extrasRuns;
      if (ball.wicket) {
        bowler.wickets += 1;
      }
      bowlingMap.set(ball.bowlerId, bowler);
    }

    const buildRanks = (
      metric: LeaderboardMetric,
      rows: Array<{ playerId: string; value: number; subMetric?: string }>,
      descending = true,
    ) => {
      const sorted = rows.sort((a, b) => (descending ? b.value - a.value : a.value - b.value));
      return sorted.map((row, idx) => ({
        tournamentId,
        metric,
        playerId: row.playerId,
        rank: idx + 1,
        metricValue: Number(row.value.toFixed(3)),
        subMetric: row.subMetric,
      }));
    };

    const mostRuns = buildRanks(
      LeaderboardMetric.MOST_RUNS,
      Array.from(battingMap.entries()).map(([playerId, stat]) => ({ playerId, value: stat.runs })),
    );

    const mostWickets = buildRanks(
      LeaderboardMetric.MOST_WICKETS,
      Array.from(bowlingMap.entries()).map(([playerId, stat]) => ({ playerId, value: stat.wickets })),
    );

    const strikeRates = buildRanks(
      LeaderboardMetric.BEST_STRIKE_RATE,
      Array.from(battingMap.entries())
        .filter(([, stat]) => stat.balls >= 10)
        .map(([playerId, stat]) => ({
          playerId,
          value: stat.balls ? (stat.runs / stat.balls) * 100 : 0,
        })),
    );

    const economies = buildRanks(
      LeaderboardMetric.BEST_ECONOMY,
      Array.from(bowlingMap.entries())
        .filter(([, stat]) => stat.balls >= 12)
        .map(([playerId, stat]) => ({
          playerId,
          value: stat.balls ? stat.runs / (stat.balls / 6) : Number.MAX_SAFE_INTEGER,
        })),
      false,
    );

    const mostSixes = buildRanks(
      LeaderboardMetric.MOST_SIXES,
      Array.from(battingMap.entries()).map(([playerId, stat]) => ({ playerId, value: stat.sixes })),
    );

    const mostFours = buildRanks(
      LeaderboardMetric.MOST_FOURS,
      Array.from(battingMap.entries()).map(([playerId, stat]) => ({ playerId, value: stat.fours })),
    );

    const mvp = buildRanks(
      LeaderboardMetric.MVP,
      Array.from(new Set([...battingMap.keys(), ...bowlingMap.keys()])).map((playerId) => {
        const b = battingMap.get(playerId);
        const bw = bowlingMap.get(playerId);
        const score = (b?.runs ?? 0) + (bw?.wickets ?? 0) * 20 + (b?.fours ?? 0) + (b?.sixes ?? 0) * 2;
        return { playerId, value: score };
      }),
    );

    const flattened = [...mostRuns, ...mostWickets, ...strikeRates, ...economies, ...mostSixes, ...mostFours, ...mvp];

    await this.prisma.$transaction([
      this.prisma.leaderboardProjection.deleteMany({ where: { tournamentId } }),
      ...(flattened.length
        ? [
            this.prisma.leaderboardProjection.createMany({
              data: flattened,
            }),
          ]
        : []),
    ] as Prisma.PrismaPromise<unknown>[]);

    return flattened;
  }

  async listLeaderboard(metric: LeaderboardMetric): Promise<LeaderboardRow[]> {
    const rows = await this.prisma.leaderboardProjection.findMany({
      where: { metric },
      include: {
        player: true,
      },
      orderBy: { rank: 'asc' },
      take: 20,
    });

    const playerIds = rows.map((row) => row.playerId);
    const teamPlayers = await this.prisma.teamPlayer.findMany({
      where: {
        playerId: { in: playerIds },
      },
      include: {
        team: true,
      },
    });

    const teamMap = new Map<string, string>();
    for (const row of teamPlayers) {
      if (!teamMap.has(row.playerId)) {
        teamMap.set(row.playerId, row.team.name);
      }
    }

    return rows.map((row) => ({
      playerId: row.playerId,
      playerName: row.player.displayName,
      teamName: teamMap.get(row.playerId) ?? '-',
      metric: row.metricValue,
      subMetric: row.subMetric ?? undefined,
    }));
  }
}
