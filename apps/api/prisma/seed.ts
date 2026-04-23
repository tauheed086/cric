import { PrismaClient, FixtureStage, MatchStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.extrasEvent.deleteMany(),
    prisma.wicketEvent.deleteMany(),
    prisma.ballEvent.deleteMany(),
    prisma.over.deleteMany(),
    prisma.innings.deleteMany(),
    prisma.squadSelection.deleteMany(),
    prisma.toss.deleteMany(),
    prisma.match.deleteMany(),
    prisma.fixture.deleteMany(),
    prisma.teamPlayer.deleteMany(),
    prisma.award.deleteMany(),
    prisma.leaderboardProjection.deleteMany(),
    prisma.pointsTableProjection.deleteMany(),
    prisma.scorecardProjection.deleteMany(),
    prisma.player.deleteMany(),
    prisma.team.deleteMany(),
    prisma.venue.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.seasonSettings.deleteMany(),
    prisma.tournament.deleteMany(),
  ]);

  const tournament = await prisma.tournament.create({
    data: {
      name: 'Community Premier Cup',
      season: '2026',
      sponsorName: 'Righteous Sports',
      heroBannerUrl: 'https://images.unsplash.com/photo-1521417531039-5f8ab13eb0fb',
      seasonSettings: {
        create: {
          format: 'T20',
          oversPerInnings: 4,
          numberOfTeams: 2,
          groupStructure: 'Single group',
          knockoutStages: 'Final',
          pointsRuleWin: 2,
          pointsRuleTie: 1,
          pointsRuleNoResult: 1,
          rankingLogic: 'Runs, wickets, impact',
        },
      },
      announcements: {
        create: {
          title: 'Tournament Launch',
          body: 'Welcome to the Community Premier Cup 2026.',
          isPublished: true,
          publishedAt: new Date(),
        },
      },
    },
  });

  const venue = await prisma.venue.create({
    data: {
      tournamentId: tournament.id,
      name: 'Greenfield Cricket Ground',
      city: 'Kolkata',
      address: 'District Sports Complex',
    },
  });

  const teamSeed = [
    {
      name: 'Shree Sai Swami Samarth',
      shortName: 'SSS',
      jerseyPrimary: '#1db954',
      managerName: 'SSS Manager',
      players: [
        { firstName: 'SSS', lastName: 'Batter 1', displayName: 'SSS Batter 1', role: 'Batter', battingHand: 'Right', bowlingType: 'Right-arm offbreak', jerseyNumber: '1' },
        { firstName: 'SSS', lastName: 'Batter 2', displayName: 'SSS Batter 2', role: 'Batter', battingHand: 'Left', bowlingType: 'Right-arm offbreak', jerseyNumber: '2' },
        { firstName: 'SSS', lastName: 'Batter 3', displayName: 'SSS Batter 3', role: 'Batter', battingHand: 'Right', bowlingType: 'Left-arm orthodox', jerseyNumber: '3' },
        {
          firstName: 'SSS',
          lastName: 'All-Rounder 1',
          displayName: 'SSS All-Rounder 1',
          role: 'All-Rounder',
          battingHand: 'Right',
          bowlingType: 'Right-arm medium',
          jerseyNumber: '4',
        },
        { firstName: 'SSS', lastName: 'Bowler 1', displayName: 'SSS Bowler 1', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm fast', jerseyNumber: '5' },
        { firstName: 'SSS', lastName: 'Bowler 2', displayName: 'SSS Bowler 2', role: 'Bowler', battingHand: 'Left', bowlingType: 'Left-arm fast', jerseyNumber: '6' },
        { firstName: 'SSS', lastName: 'Bowler 3', displayName: 'SSS Bowler 3', role: 'Bowler', battingHand: 'Right', bowlingType: 'Legbreak', jerseyNumber: '7' },
        {
          firstName: 'SSS',
          lastName: 'Wicketkeeper 1',
          displayName: 'SSS Wicketkeeper 1',
          role: 'Wicketkeeper',
          battingHand: 'Right',
          bowlingType: 'Right-arm medium',
          jerseyNumber: '8',
        },
      ],
    },
    {
      name: 'Java Packers',
      shortName: 'JPK',
      jerseyPrimary: '#ff6b35',
      managerName: 'JPK Manager',
      players: [
        { firstName: 'JPK', lastName: 'Batter 1', displayName: 'JPK Batter 1', role: 'Batter', battingHand: 'Right', bowlingType: 'Right-arm offbreak', jerseyNumber: '1' },
        { firstName: 'JPK', lastName: 'Batter 2', displayName: 'JPK Batter 2', role: 'Batter', battingHand: 'Left', bowlingType: 'Right-arm offbreak', jerseyNumber: '2' },
        { firstName: 'JPK', lastName: 'Batter 3', displayName: 'JPK Batter 3', role: 'Batter', battingHand: 'Right', bowlingType: 'Left-arm orthodox', jerseyNumber: '3' },
        {
          firstName: 'JPK',
          lastName: 'All-Rounder 1',
          displayName: 'JPK All-Rounder 1',
          role: 'All-Rounder',
          battingHand: 'Left',
          bowlingType: 'Right-arm medium',
          jerseyNumber: '4',
        },
        { firstName: 'JPK', lastName: 'Bowler 1', displayName: 'JPK Bowler 1', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm fast', jerseyNumber: '5' },
        { firstName: 'JPK', lastName: 'Bowler 2', displayName: 'JPK Bowler 2', role: 'Bowler', battingHand: 'Left', bowlingType: 'Left-arm fast', jerseyNumber: '6' },
        { firstName: 'JPK', lastName: 'Bowler 3', displayName: 'JPK Bowler 3', role: 'Bowler', battingHand: 'Right', bowlingType: 'Legbreak', jerseyNumber: '7' },
        {
          firstName: 'JPK',
          lastName: 'Wicketkeeper 1',
          displayName: 'JPK Wicketkeeper 1',
          role: 'Wicketkeeper',
          battingHand: 'Right',
          bowlingType: 'Right-arm medium',
          jerseyNumber: '8',
        },
      ],
    },
  ] as const;

  const teams = await Promise.all(
    teamSeed.map((team) =>
      prisma.team.create({
        data: {
          tournamentId: tournament.id,
          name: team.name,
          shortName: team.shortName,
          jerseyPrimary: team.jerseyPrimary,
          managerName: team.managerName,
        },
      }),
    ),
  );

  for (const [index, team] of teams.entries()) {
    for (const playerSeed of teamSeed[index].players) {
      const player = await prisma.player.create({
        data: {
          tournamentId: tournament.id,
          firstName: playerSeed.firstName,
          lastName: playerSeed.lastName,
          displayName: playerSeed.displayName,
          role: playerSeed.role,
          battingHand: playerSeed.battingHand,
          bowlingType: playerSeed.bowlingType,
          jerseyNumber: playerSeed.jerseyNumber,
        },
      });
      await prisma.teamPlayer.create({
        data: {
          teamId: team.id,
          playerId: player.id,
        },
      });
    }
  }

  const fixture = await prisma.fixture.create({
    data: {
      tournamentId: tournament.id,
      matchNumber: 'Match 01',
      stage: FixtureStage.LEAGUE,
      status: 'IN_PROGRESS',
      teamAId: teams[0].id,
      teamBId: teams[1].id,
      venueId: venue.id,
      startsAt: new Date(),
    },
  });

  const match = await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      fixtureId: fixture.id,
      teamAId: teams[0].id,
      teamBId: teams[1].id,
      venueId: venue.id,
      matchNumber: fixture.matchNumber,
      stage: fixture.stage,
      status: MatchStatus.INNINGS_1,
      startsAt: fixture.startsAt,
      currentInnings: 1,
      statusText: 'First innings live',
    },
  });

  const [teamAPlayers, teamBPlayers] = await Promise.all([
    prisma.teamPlayer.findMany({
      where: { teamId: teams[0].id },
      include: { player: true },
      take: 8,
    }),
    prisma.teamPlayer.findMany({
      where: { teamId: teams[1].id },
      include: { player: true },
      take: 8,
    }),
  ]);

  await prisma.toss.create({
    data: {
      matchId: match.id,
      wonByTeamId: teams[0].id,
      decision: 'BAT',
    },
  });

  await prisma.innings.create({
    data: {
      matchId: match.id,
      inningsNumber: 1,
      battingTeamId: teams[0].id,
      bowlingTeamId: teams[1].id,
      totalRuns: 0,
      wickets: 0,
      balls: 0,
      runRate: 0,
    },
  });

  await prisma.squadSelection.createMany({
    data: [...teamAPlayers, ...teamBPlayers].map((row) => ({
      matchId: match.id,
      teamId: row.teamId,
      playerId: row.playerId,
      isPlayingXI: true,
    })),
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
