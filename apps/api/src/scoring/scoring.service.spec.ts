import { BadRequestException } from '@nestjs/common';
import { ScoringService } from './scoring.service.js';

describe('ScoringService', () => {
  const buildService = () => {
    const prisma = {
      match: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      ballEvent: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      innings: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      squadSelection: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      teamPlayer: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      seasonSettings: {
        findUnique: jest.fn(),
      },
      over: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      extrasEvent: {
        create: jest.fn(),
      },
      wicketEvent: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    } as any;

    const projections = {
      rebuildMatchProjection: jest.fn().mockResolvedValue({}),
      rebuildPointsTable: jest.fn().mockResolvedValue([]),
      rebuildLeaderboards: jest.fn().mockResolvedValue([]),
    } as any;

    const eventBus = {
      publishMatchEvent: jest.fn(),
      publishTournamentEvent: jest.fn(),
    } as any;

    const service = new ScoringService(prisma, projections, eventBus);
    return { service, prisma };
  };

  it('throws when undo is requested with no ball events', async () => {
    const { service, prisma } = buildService();
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      tournamentId: 't1',
      innings: [],
    });
    prisma.ballEvent.findFirst.mockResolvedValue(null);

    await expect(service.undoLastBall('m1', 'admin')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks undo when match is abandoned', async () => {
    const { service, prisma } = buildService();
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      tournamentId: 't1',
      status: 'ABANDONED',
      innings: [],
    });

    await expect(service.undoLastBall('m1', 'admin')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows undo when match was auto-completed and reopens match', async () => {
    const { service, prisma } = buildService();
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      tournamentId: 't1',
      status: 'COMPLETED',
      currentInnings: 2,
      innings: [{ id: 'i2', inningsNumber: 2, isCompleted: true, totalRuns: 100, wickets: 3, balls: 50, runRate: 12 }],
    });
    prisma.ballEvent.findFirst.mockResolvedValue({
      id: 'b1',
      inningsId: 'i2',
      matchId: 'm1',
      sequence: 50,
      isValidDelivery: true,
      runsOffBat: 4,
      extrasRuns: 0,
      wicket: false,
    });
    prisma.ballEvent.findMany.mockResolvedValue([]);
    prisma.innings.findUnique.mockResolvedValue({
      id: 'i2',
      inningsNumber: 2,
      isCompleted: true,
      totalRuns: 96,
      wickets: 3,
      balls: 49,
      runRate: 11.75,
    });
    prisma.innings.update.mockResolvedValue({
      id: 'i2',
      inningsNumber: 2,
      isCompleted: false,
      totalRuns: 96,
      wickets: 3,
      balls: 49,
      runRate: 11.75,
    });
    prisma.over.findMany.mockResolvedValue([]);
    prisma.match.update.mockResolvedValue({
      id: 'm1',
      status: 'INNINGS_2',
      currentInnings: 2,
    });
    prisma.auditLog.create.mockResolvedValue({});

    await service.undoLastBall('m1', 'admin');
    expect(prisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'm1' },
        data: expect.objectContaining({
          status: 'INNINGS_2',
          winnerTeamId: null,
          resultSummary: null,
        }),
      }),
    );
  });

  it('blocks already-out batsman from facing balls even when wicket is false', async () => {
    const { service, prisma } = buildService();
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      tournamentId: 't1',
      status: 'INNINGS_1',
      currentInnings: 1,
      teamAId: 'team1',
      teamBId: 'team2',
      innings: [{ id: 'i1', inningsNumber: 1, isCompleted: false }],
    });
    prisma.innings.findUnique.mockResolvedValue({
      id: 'i1',
      inningsNumber: 1,
      battingTeamId: 'team1',
      bowlingTeamId: 'team2',
      isCompleted: false,
    });
    prisma.ballEvent.findMany.mockResolvedValue([
      { id: 'b0', strikerId: 'p1', wicket: true, isVoided: false, sequence: 1 },
    ]);
    prisma.squadSelection.findMany.mockResolvedValue([
      { playerId: 'p1' },
      { playerId: 'p2' },
      { playerId: 'p3' },
    ]);
    prisma.seasonSettings.findUnique.mockResolvedValue({ oversPerInnings: 20 });

    await expect(
      service.recordBall(
        'm1',
        {
          inningsNumber: 1,
          runsOffBat: 1,
          strikerId: 'p1',
          nonStrikerId: 'p2',
          bowlerId: 'p3',
          wicket: false,
        },
        'admin',
      ),
    ).rejects.toThrow('Selected striker is already out');
  });

  it('blocks starting innings when match is abandoned', async () => {
    const { service, prisma } = buildService();
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      tournamentId: 't1',
      status: 'ABANDONED',
      teamAId: 'a',
      teamBId: 'b',
      innings: [],
    });

    await expect(service.startInnings('m1', 1, 'admin')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when innings 2 starts before innings 1', async () => {
    const { service, prisma } = buildService();
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      tournamentId: 't1',
      teamAId: 'a',
      teamBId: 'b',
      innings: [],
    });
    prisma.innings.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await expect(service.startInnings('m1', 2, 'admin')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when innings 2 starts before innings 1 is completed', async () => {
    const { service, prisma } = buildService();
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      tournamentId: 't1',
      teamAId: 'a',
      teamBId: 'b',
      innings: [],
      targetRuns: null,
    });
    prisma.innings.findUnique
      .mockResolvedValueOnce({
        battingTeamId: 'a',
        bowlingTeamId: 'b',
        totalRuns: 120,
        isCompleted: false,
      })
      .mockResolvedValueOnce(null);

    await expect(service.startInnings('m1', 2, 'admin')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks recording more wickets than batting team players - 1', async () => {
    const { service, prisma } = buildService();
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      tournamentId: 't1',
      teamAId: 'a',
      teamBId: 'b',
      currentInnings: 1,
      status: 'INNINGS_1',
      innings: [{ inningsNumber: 1 }],
    });
    prisma.innings.findUnique.mockResolvedValue({
      id: 'i1',
      matchId: 'm1',
      inningsNumber: 1,
      battingTeamId: 'a',
      bowlingTeamId: 'b',
    });
    prisma.ballEvent.findMany.mockResolvedValue(
      Array.from({ length: 7 }, (_, index) => ({
        id: `b${index + 1}`,
        wicket: true,
        isValidDelivery: true,
        sequence: index + 1,
        strikerId: `out-${index + 1}`,
      })),
    );
    prisma.squadSelection.count.mockResolvedValue(0);
    prisma.squadSelection.findMany.mockResolvedValue([]);
    prisma.teamPlayer.count.mockResolvedValue(8);
    prisma.teamPlayer.findMany.mockImplementation(({ where }: any) => {
      if (where.teamId === 'a') {
        return Promise.resolve([{ playerId: 'p1' }, { playerId: 'p2' }]);
      }
      return Promise.resolve([{ playerId: 'p3' }]);
    });
    prisma.seasonSettings.findUnique.mockResolvedValue(null);

    await expect(
      service.recordBall(
        'm1',
        {
          inningsNumber: 1,
          runsOffBat: 0,
          wicket: true,
          wicketType: 'OUT',
          strikerId: 'p1',
          nonStrikerId: 'p2',
          bowlerId: 'p3',
        },
        'admin',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects balls when striker does not belong to batting side', async () => {
    const { service, prisma } = buildService();
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      tournamentId: 't1',
      teamAId: 'a',
      teamBId: 'b',
      currentInnings: 1,
      status: 'INNINGS_1',
      innings: [{ inningsNumber: 1 }],
    });
    prisma.innings.findUnique.mockResolvedValue({
      id: 'i1',
      matchId: 'm1',
      inningsNumber: 1,
      battingTeamId: 'a',
      bowlingTeamId: 'b',
      isCompleted: false,
      totalRuns: 0,
    });
    prisma.ballEvent.findMany.mockResolvedValue([]);
    prisma.squadSelection.findMany.mockResolvedValue([]);
    prisma.squadSelection.count.mockResolvedValue(0);
    prisma.teamPlayer.count.mockResolvedValue(11);
    prisma.teamPlayer.findMany.mockImplementation(({ where }: any) => {
      if (where.teamId === 'a') {
        return Promise.resolve([{ playerId: 'p2' }]);
      }
      return Promise.resolve([{ playerId: 'p3' }]);
    });
    prisma.seasonSettings.findUnique.mockResolvedValue(null);

    await expect(
      service.recordBall(
        'm1',
        {
          inningsNumber: 1,
          runsOffBat: 1,
          strikerId: 'p1',
          nonStrikerId: 'p2',
          bowlerId: 'p3',
        },
        'admin',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects changing bowler in the middle of an over', async () => {
    const { service, prisma } = buildService();
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      tournamentId: 't1',
      teamAId: 'a',
      teamBId: 'b',
      currentInnings: 1,
      status: 'INNINGS_1',
      innings: [{ inningsNumber: 1 }],
    });
    prisma.innings.findUnique.mockResolvedValue({
      id: 'i1',
      matchId: 'm1',
      inningsNumber: 1,
      battingTeamId: 'a',
      bowlingTeamId: 'b',
      isCompleted: false,
      totalRuns: 0,
    });
    prisma.ballEvent.findMany.mockResolvedValue([]);
    prisma.squadSelection.findMany.mockResolvedValue([]);
    prisma.squadSelection.count.mockResolvedValue(0);
    prisma.teamPlayer.count.mockResolvedValue(11);
    prisma.teamPlayer.findMany.mockImplementation(({ where }: any) => {
      if (where.teamId === 'a') {
        return Promise.resolve([{ playerId: 'p1' }, { playerId: 'p2' }]);
      }
      return Promise.resolve([{ playerId: 'p3' }, { playerId: 'p4' }]);
    });
    prisma.seasonSettings.findUnique.mockResolvedValue(null);
    prisma.over.findUnique.mockResolvedValue({
      id: 'o1',
      inningsId: 'i1',
      overNumber: 1,
      bowlerId: 'p4',
    });

    await expect(
      service.recordBall(
        'm1',
        {
          inningsNumber: 1,
          runsOffBat: 1,
          strikerId: 'p1',
          nonStrikerId: 'p2',
          bowlerId: 'p3',
        },
        'admin',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects consecutive overs by same bowler', async () => {
    const { service, prisma } = buildService();
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      tournamentId: 't1',
      teamAId: 'a',
      teamBId: 'b',
      currentInnings: 1,
      status: 'INNINGS_1',
      innings: [{ inningsNumber: 1 }],
    });
    prisma.innings.findUnique.mockResolvedValue({
      id: 'i1',
      matchId: 'm1',
      inningsNumber: 1,
      battingTeamId: 'a',
      bowlingTeamId: 'b',
      isCompleted: false,
      totalRuns: 0,
    });
    prisma.ballEvent.findMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => ({
        id: `b${index + 1}`,
        wicket: false,
        isValidDelivery: true,
        sequence: index + 1,
        strikerId: 'p1',
      })),
    );
    prisma.squadSelection.findMany.mockResolvedValue([]);
    prisma.squadSelection.count.mockResolvedValue(0);
    prisma.teamPlayer.count.mockResolvedValue(11);
    prisma.teamPlayer.findMany.mockImplementation(({ where }: any) => {
      if (where.teamId === 'a') {
        return Promise.resolve([{ playerId: 'p1' }, { playerId: 'p2' }]);
      }
      return Promise.resolve([{ playerId: 'p3' }]);
    });
    prisma.seasonSettings.findUnique.mockResolvedValue(null);
    prisma.over.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'o1',
        inningsId: 'i1',
        overNumber: 1,
        bowlerId: 'p3',
      });

    await expect(
      service.recordBall(
        'm1',
        {
          inningsNumber: 1,
          runsOffBat: 0,
          strikerId: 'p1',
          nonStrikerId: 'p2',
          bowlerId: 'p3',
        },
        'admin',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects ball entry after over limit is reached', async () => {
    const { service, prisma } = buildService();
    prisma.match.findUnique.mockResolvedValue({
      id: 'm1',
      tournamentId: 't1',
      teamAId: 'a',
      teamBId: 'b',
      currentInnings: 1,
      status: 'INNINGS_1',
      innings: [{ inningsNumber: 1 }],
    });
    prisma.innings.findUnique.mockResolvedValue({
      id: 'i1',
      matchId: 'm1',
      inningsNumber: 1,
      battingTeamId: 'a',
      bowlingTeamId: 'b',
      isCompleted: false,
      totalRuns: 0,
    });
    prisma.ballEvent.findMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => ({
        id: `b${index + 1}`,
        wicket: false,
        isValidDelivery: true,
        sequence: index + 1,
        strikerId: 'p1',
      })),
    );
    prisma.squadSelection.findMany.mockResolvedValue([]);
    prisma.squadSelection.count.mockResolvedValue(0);
    prisma.teamPlayer.count.mockResolvedValue(11);
    prisma.teamPlayer.findMany.mockImplementation(({ where }: any) => {
      if (where.teamId === 'a') {
        return Promise.resolve([{ playerId: 'p1' }, { playerId: 'p2' }]);
      }
      return Promise.resolve([{ playerId: 'p3' }]);
    });
    prisma.seasonSettings.findUnique.mockResolvedValue({ oversPerInnings: 1 });

    await expect(
      service.recordBall(
        'm1',
        {
          inningsNumber: 1,
          runsOffBat: 0,
          strikerId: 'p1',
          nonStrikerId: 'p2',
          bowlerId: 'p3',
        },
        'admin',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('auto-ends first innings at over limit and sets target', async () => {
    const { service, prisma } = buildService();
    jest.spyOn(service as any, 'resolveInnings').mockResolvedValue({
      match: {
        id: 'm1',
        tournamentId: 't1',
        status: 'INNINGS_1',
        targetRuns: null,
      },
      innings: {
        id: 'i1',
        battingTeamId: 'a',
        bowlingTeamId: 'b',
        isCompleted: false,
        totalRuns: 120,
      },
    });
    jest
      .spyOn(service as any, 'getEligibleTeamPlayerIds')
      .mockResolvedValueOnce(new Set(['p1', 'p2']))
      .mockResolvedValueOnce(new Set(['p3']));
    jest.spyOn(service as any, 'getBattingLineupSize').mockResolvedValue(11);
    jest.spyOn(service as any, 'getOversLimit').mockResolvedValue(6);
    jest.spyOn(service as any, 'recomputeInnings').mockResolvedValue({
      id: 'i1',
      battingTeamId: 'a',
      totalRuns: 121,
      wickets: 2,
      balls: 6,
    });
    const publishSpy = jest.spyOn(service as any, 'publish').mockResolvedValue({});

    prisma.ballEvent.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({
        id: `b${index + 1}`,
        wicket: false,
        isValidDelivery: true,
        sequence: index + 1,
        strikerId: 'p1',
      })),
    );
    prisma.ballEvent.count.mockResolvedValue(5);
    prisma.over.findUnique.mockResolvedValue(null);
    prisma.over.create.mockResolvedValue({ id: 'o1' });
    prisma.ballEvent.create.mockResolvedValue({ id: 'b6' });
    prisma.innings.update.mockResolvedValue({});
    prisma.match.update.mockResolvedValue({});
    prisma.$transaction.mockResolvedValue([{}, {}]);
    prisma.auditLog.create.mockResolvedValue({});

    await service.recordBall(
      'm1',
      {
        inningsNumber: 1,
        runsOffBat: 1,
        strikerId: 'p1',
        nonStrikerId: 'p2',
        bowlerId: 'p3',
      },
      'admin',
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'INNINGS_BREAK',
          targetRuns: 122,
        }),
      }),
    );
    expect(publishSpy).toHaveBeenCalledWith('m1', 'admin');
  });

  it('auto-completes second innings with first-innings winner when chase ends short at over limit', async () => {
    const { service, prisma } = buildService();
    jest.spyOn(service as any, 'resolveInnings').mockResolvedValue({
      match: {
        id: 'm1',
        tournamentId: 't1',
        status: 'INNINGS_2',
        targetRuns: 80,
      },
      innings: {
        id: 'i2',
        battingTeamId: 'b',
        bowlingTeamId: 'a',
        isCompleted: false,
        totalRuns: 74,
      },
    });
    jest
      .spyOn(service as any, 'getEligibleTeamPlayerIds')
      .mockResolvedValueOnce(new Set(['p1', 'p2']))
      .mockResolvedValueOnce(new Set(['p3']));
    jest.spyOn(service as any, 'getBattingLineupSize').mockResolvedValue(11);
    jest.spyOn(service as any, 'getOversLimit').mockResolvedValue(6);
    jest.spyOn(service as any, 'recomputeInnings').mockResolvedValue({
      id: 'i2',
      battingTeamId: 'b',
      totalRuns: 75,
      wickets: 2,
      balls: 6,
    });
    const resolveResult = jest.spyOn(service as any, 'resolveSecondInningsResult').mockResolvedValue({
      winnerTeamId: 'a',
      resultSummary: 'Target not chased. First-innings side wins',
    });
    const publishSpy = jest.spyOn(service as any, 'publish').mockResolvedValue({});

    prisma.ballEvent.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({
        id: `b${index + 1}`,
        wicket: false,
        isValidDelivery: true,
        sequence: index + 1,
        strikerId: 'p1',
      })),
    );
    prisma.ballEvent.count.mockResolvedValue(5);
    prisma.over.findUnique.mockResolvedValue(null);
    prisma.over.create.mockResolvedValue({ id: 'o1' });
    prisma.ballEvent.create.mockResolvedValue({ id: 'b6' });
    prisma.innings.update.mockResolvedValue({});
    prisma.match.update.mockResolvedValue({});
    prisma.$transaction.mockResolvedValue([{}, {}]);
    prisma.auditLog.create.mockResolvedValue({});

    await service.recordBall(
      'm1',
      {
        inningsNumber: 2,
        runsOffBat: 1,
        strikerId: 'p1',
        nonStrikerId: 'p2',
        bowlerId: 'p3',
      },
      'admin',
    );

    expect(resolveResult).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({
        totalRuns: 75,
        wickets: 2,
        balls: 6,
      }),
      80,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          winnerTeamId: 'a',
        }),
      }),
    );
    expect(publishSpy).toHaveBeenCalledWith('m1', 'admin');
  });

  it('records run out for non-striker and saves correct dismissedPlayerId', async () => {
    const { service, prisma } = buildService();
    jest.spyOn(service as any, 'resolveInnings').mockResolvedValue({
      match: {
        id: 'm1',
        tournamentId: 't1',
        status: 'INNINGS_1',
        targetRuns: null,
      },
      innings: {
        id: 'i1',
        battingTeamId: 'a',
        bowlingTeamId: 'b',
        isCompleted: false,
        totalRuns: 10,
      },
    });
    jest
      .spyOn(service as any, 'getEligibleTeamPlayerIds')
      .mockResolvedValueOnce(new Set(['p1', 'p2']))
      .mockResolvedValueOnce(new Set(['p3']));
    jest.spyOn(service as any, 'getBattingLineupSize').mockResolvedValue(11);
    jest.spyOn(service as any, 'getOversLimit').mockResolvedValue(120);
    jest.spyOn(service as any, 'recomputeInnings').mockResolvedValue({
      id: 'i1',
      battingTeamId: 'a',
      totalRuns: 11,
      wickets: 1,
      balls: 1,
    });
    jest.spyOn(service as any, 'publish').mockResolvedValue({});

    prisma.ballEvent.findMany.mockResolvedValue([]);
    prisma.over.findUnique.mockResolvedValue(null);
    prisma.over.create.mockResolvedValue({ id: 'o1' });
    prisma.ballEvent.create.mockResolvedValue({ id: 'b1' });
    prisma.match.update.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});

    await service.recordBall(
      'm1',
      {
        inningsNumber: 1,
        runsOffBat: 1,
        wicket: true,
        wicketType: 'RUN_OUT',
        dismissedPlayerId: 'p2',
        strikerId: 'p1',
        nonStrikerId: 'p2',
        bowlerId: 'p3',
      },
      'admin',
    );

    expect(prisma.wicketEvent.create).toHaveBeenCalledWith({
      data: {
        ballEventId: 'b1',
        dismissalType: 'RUN_OUT',
        dismissedPlayerId: 'p2',
      },
    });
  });
});
