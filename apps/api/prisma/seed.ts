import { PrismaClient, FixtureStage, MatchStatus, ExtrasType, LeaderboardMetric, AwardType } from '@prisma/client';

const prisma = new PrismaClient();

function formatOvers(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function oversFromBalls(balls: number): number {
  return balls === 0 ? 0 : balls / 6;
}

class SeedRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

async function main() {
  console.log('--- Cleaning existing data ---');
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

  console.log('--- Creating Tournament & Settings ---');
  const tournament = await prisma.tournament.create({
    data: {
      name: 'Super 8 Premier Trophy 2026',
      season: '2026',
      sponsorName: 'Apex Sports Arena',
      sponsorLogoUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e',
      heroBannerUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
      seasonSettings: {
        create: {
          format: 'T4',
          oversPerInnings: 4,
          ballType: 'White Leather',
          numberOfTeams: 8,
          groupStructure: 'Single Group (8 Teams, 4 Matches Each)',
          knockoutStages: '2 Semi-Finals & Final',
          pointsRuleWin: 2,
          pointsRuleTie: 1,
          pointsRuleNoResult: 1,
          rankingLogic: 'Points, NRR, Head-to-Head',
        },
      },
      announcements: {
        createMany: {
          data: [
            {
              title: 'Super 8 Premier Trophy 2026 Launched!',
              body: 'Welcome to the Super 8 Premier Trophy 2026. 8 elite teams battle across May 9 & 10 in 4-over fixtures. Top 4 teams qualify for the Playoffs!',
              isPublished: true,
              publishedAt: new Date('2026-05-08T09:00:00.000Z'),
            },
            {
              title: 'Playoffs Confirmed: Semi-Finals & Grand Final on May 10!',
              body: 'The top 4 qualified teams advance to the Semi-Finals today, followed by the Grand Final under floodlights.',
              isPublished: true,
              publishedAt: new Date('2026-05-10T15:00:00.000Z'),
            },
          ],
        },
      },
    },
  });

  const venue = await prisma.venue.create({
    data: {
      tournamentId: tournament.id,
      name: 'Eden Park Sports Complex',
      city: 'Kolkata',
      address: 'Salt Lake Stadium Rd, Sector III',
    },
  });

  console.log('--- Creating 8 Teams & Players ---');
  const teamSeedData = [
    {
      name: 'Shree Sai Swami Samarth',
      shortName: 'SSS',
      jerseyPrimary: '#1db954',
      managerName: 'A. Samarth',
      players: [
        { firstName: 'Rohit', lastName: 'Samarth', displayName: 'Rohit Samarth', role: 'Batter', battingHand: 'Right', bowlingType: 'Right-arm offbreak', jerseyNumber: '45' },
        { firstName: 'Rahul', lastName: 'Kadam', displayName: 'Rahul Kadam', role: 'Batter', battingHand: 'Left', bowlingType: 'Left-arm orthodox', jerseyNumber: '1' },
        { firstName: 'Ishan', lastName: 'More', displayName: 'Ishan More', role: 'Wicketkeeper', battingHand: 'Left', bowlingType: 'Right-arm medium', jerseyNumber: '32' },
        { firstName: 'Hardik', lastName: 'Shinde', displayName: 'Hardik Shinde', role: 'All-Rounder', battingHand: 'Right', bowlingType: 'Right-arm fast-medium', jerseyNumber: '33' },
        { firstName: 'Shivam', lastName: 'Patil', displayName: 'Shivam Patil', role: 'All-Rounder', battingHand: 'Right', bowlingType: 'Right-arm medium', jerseyNumber: '77' },
        { firstName: 'Jasprit', lastName: 'Mane', displayName: 'Jasprit Mane', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm fast', jerseyNumber: '93' },
        { firstName: 'Yuzvendra', lastName: 'Gaikwad', displayName: 'Yuzvendra Gaikwad', role: 'Bowler', battingHand: 'Right', bowlingType: 'Legbreak', jerseyNumber: '3' },
        { firstName: 'Arshdeep', lastName: 'Chavan', displayName: 'Arshdeep Chavan', role: 'Bowler', battingHand: 'Left', bowlingType: 'Left-arm fast', jerseyNumber: '2' },
      ],
    },
    {
      name: 'Java Packers',
      shortName: 'JPK',
      jerseyPrimary: '#ff6b35',
      managerName: 'V. Raman',
      players: [
        { firstName: 'Virat', lastName: 'Deshmukh', displayName: 'Virat Deshmukh', role: 'Batter', battingHand: 'Right', bowlingType: 'Right-arm medium', jerseyNumber: '18' },
        { firstName: 'Devdutt', lastName: 'Koli', displayName: 'Devdutt Koli', role: 'Batter', battingHand: 'Left', bowlingType: 'Right-arm offbreak', jerseyNumber: '19' },
        { firstName: 'Sanju', lastName: 'Joshi', displayName: 'Sanju Joshi', role: 'Wicketkeeper', battingHand: 'Right', bowlingType: 'Right-arm medium', jerseyNumber: '11' },
        { firstName: 'Glenn', lastName: 'Rao', displayName: 'Glenn Rao', role: 'All-Rounder', battingHand: 'Right', bowlingType: 'Right-arm offbreak', jerseyNumber: '32' },
        { firstName: 'Ravindra', lastName: 'Sawant', displayName: 'Ravindra Sawant', role: 'All-Rounder', battingHand: 'Left', bowlingType: 'Left-arm orthodox', jerseyNumber: '8' },
        { firstName: 'Mohammed', lastName: 'Siraj', displayName: 'Mohammed Siraj', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm fast', jerseyNumber: '73' },
        { firstName: 'Kuldeep', lastName: 'Jadhav', displayName: 'Kuldeep Jadhav', role: 'Bowler', battingHand: 'Left', bowlingType: 'Left-arm wrist spin', jerseyNumber: '23' },
        { firstName: 'Bhuvneshwar', lastName: 'Khedekar', displayName: 'Bhuvneshwar Khedekar', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm medium-fast', jerseyNumber: '15' },
      ],
    },
    {
      name: 'Royal Strikers',
      shortName: 'RST',
      jerseyPrimary: '#2563eb',
      managerName: 'D. Karthik',
      players: [
        { firstName: 'Faf', lastName: 'Duplessis', displayName: 'Faf Duplessis', role: 'Batter', battingHand: 'Right', bowlingType: 'Right-arm legbreak', jerseyNumber: '13' },
        { firstName: 'Rajat', lastName: 'Patidar', displayName: 'Rajat Patidar', role: 'Batter', battingHand: 'Right', bowlingType: 'Right-arm offbreak', jerseyNumber: '97' },
        { firstName: 'Dinesh', lastName: 'Kumar', displayName: 'Dinesh Kumar', role: 'Wicketkeeper', battingHand: 'Right', bowlingType: 'Right-arm medium', jerseyNumber: '21' },
        { firstName: 'Marcus', lastName: 'Stoinis', displayName: 'Marcus Stoinis', role: 'All-Rounder', battingHand: 'Right', bowlingType: 'Right-arm medium', jerseyNumber: '17' },
        { firstName: 'Krunal', lastName: 'Pandya', displayName: 'Krunal Pandya', role: 'All-Rounder', battingHand: 'Left', bowlingType: 'Left-arm orthodox', jerseyNumber: '24' },
        { firstName: 'Mitchell', lastName: 'Starc', displayName: 'Mitchell Starc', role: 'Bowler', battingHand: 'Left', bowlingType: 'Left-arm fast', jerseyNumber: '56' },
        { firstName: 'Varun', lastName: 'Chakravarthy', displayName: 'Varun Chakravarthy', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm legbreak', jerseyNumber: '29' },
        { firstName: 'Harshit', lastName: 'Rana', displayName: 'Harshit Rana', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm fast', jerseyNumber: '22' },
      ],
    },
    {
      name: 'Phoenix Blasters',
      shortName: 'PXH',
      jerseyPrimary: '#dc2626',
      managerName: 'K. Sangakkara',
      players: [
        { firstName: 'Jos', lastName: 'Buttler', displayName: 'Jos Buttler', role: 'Batter', battingHand: 'Right', bowlingType: 'Right-arm offbreak', jerseyNumber: '63' },
        { firstName: 'Yashasvi', lastName: 'Jaiswal', displayName: 'Yashasvi Jaiswal', role: 'Batter', battingHand: 'Left', bowlingType: 'Right-arm legbreak', jerseyNumber: '64' },
        { firstName: 'Heinrich', lastName: 'Klaasen', displayName: 'Heinrich Klaasen', role: 'Wicketkeeper', battingHand: 'Right', bowlingType: 'Right-arm offbreak', jerseyNumber: '4' },
        { firstName: 'Andre', lastName: 'Russell', displayName: 'Andre Russell', role: 'All-Rounder', battingHand: 'Right', bowlingType: 'Right-arm fast', jerseyNumber: '12' },
        { firstName: 'Axar', lastName: 'Patel', displayName: 'Axar Patel', role: 'All-Rounder', battingHand: 'Left', bowlingType: 'Left-arm orthodox', jerseyNumber: '20' },
        { firstName: 'Trent', lastName: 'Boult', displayName: 'Trent Boult', role: 'Bowler', battingHand: 'Left', bowlingType: 'Left-arm fast-medium', jerseyNumber: '18' },
        { firstName: 'Rashid', lastName: 'Khan', displayName: 'Rashid Khan', role: 'Bowler', battingHand: 'Right', bowlingType: 'Legbreak googly', jerseyNumber: '19' },
        { firstName: 'Sandeep', lastName: 'Sharma', displayName: 'Sandeep Sharma', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm medium', jerseyNumber: '66' },
      ],
    },
    {
      name: 'Coastal Titans',
      shortName: 'CTN',
      jerseyPrimary: '#0891b2',
      managerName: 'A. Nehra',
      players: [
        { firstName: 'Shubman', lastName: 'Gill', displayName: 'Shubman Gill', role: 'Batter', battingHand: 'Right', bowlingType: 'Right-arm offbreak', jerseyNumber: '7' },
        { firstName: 'Sai', lastName: 'Sudharsan', displayName: 'Sai Sudharsan', role: 'Batter', battingHand: 'Left', bowlingType: 'Right-arm legbreak', jerseyNumber: '23' },
        { firstName: 'Wriddhiman', lastName: 'Saha', displayName: 'Wriddhiman Saha', role: 'Wicketkeeper', battingHand: 'Right', bowlingType: 'Right-arm offbreak', jerseyNumber: '6' },
        { firstName: 'Liam', lastName: 'Livingstone', displayName: 'Liam Livingstone', role: 'All-Rounder', battingHand: 'Right', bowlingType: 'Right-arm legbreak', jerseyNumber: '27' },
        { firstName: 'Washington', lastName: 'Sundar', displayName: 'Washington Sundar', role: 'All-Rounder', battingHand: 'Left', bowlingType: 'Right-arm offbreak', jerseyNumber: '5' },
        { firstName: 'Kagiso', lastName: 'Rabada', displayName: 'Kagiso Rabada', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm fast', jerseyNumber: '25' },
        { firstName: 'Noor', lastName: 'Ahmad', displayName: 'Noor Ahmad', role: 'Bowler', battingHand: 'Left', bowlingType: 'Left-arm wrist spin', jerseyNumber: '15' },
        { firstName: 'Mohit', lastName: 'Sharma', displayName: 'Mohit Sharma', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm medium', jerseyNumber: '14' },
      ],
    },
    {
      name: 'Desert Eagles',
      shortName: 'DEG',
      jerseyPrimary: '#d97706',
      managerName: 'B. McCullum',
      players: [
        { firstName: 'Travis', lastName: 'Head', displayName: 'Travis Head', role: 'Batter', battingHand: 'Left', bowlingType: 'Right-arm offbreak', jerseyNumber: '62' },
        { firstName: 'Abhishek', lastName: 'Sharma', displayName: 'Abhishek Sharma', role: 'Batter', battingHand: 'Left', bowlingType: 'Left-arm orthodox', jerseyNumber: '4' },
        { firstName: 'Nicholas', lastName: 'Pooran', displayName: 'Nicholas Pooran', role: 'Wicketkeeper', battingHand: 'Left', bowlingType: 'Right-arm offbreak', jerseyNumber: '29' },
        { firstName: 'Sam', lastName: 'Curran', displayName: 'Sam Curran', role: 'All-Rounder', battingHand: 'Left', bowlingType: 'Left-arm medium-fast', jerseyNumber: '58' },
        { firstName: 'Nitish', lastName: 'Reddy', displayName: 'Nitish Reddy', role: 'All-Rounder', battingHand: 'Right', bowlingType: 'Right-arm medium-fast', jerseyNumber: '67' },
        { firstName: 'Pat', lastName: 'Cummins', displayName: 'Pat Cummins', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm fast', jerseyNumber: '30' },
        { firstName: 'T.', lastName: 'Natarajan', displayName: 'T. Natarajan', role: 'Bowler', battingHand: 'Left', bowlingType: 'Left-arm medium-fast', jerseyNumber: '44' },
        { firstName: 'Mayank', lastName: 'Markande', displayName: 'Mayank Markande', role: 'Bowler', battingHand: 'Right', bowlingType: 'Legbreak', jerseyNumber: '31' },
      ],
    },
    {
      name: 'Metro Knights',
      shortName: 'MTK',
      jerseyPrimary: '#7c3aed',
      managerName: 'C. Pandit',
      players: [
        { firstName: 'Shreyas', lastName: 'Iyer', displayName: 'Shreyas Iyer', role: 'Batter', battingHand: 'Right', bowlingType: 'Right-arm legbreak', jerseyNumber: '96' },
        { firstName: 'Venkatesh', lastName: 'Iyer', displayName: 'Venkatesh Iyer', role: 'Batter', battingHand: 'Left', bowlingType: 'Right-arm medium', jerseyNumber: '25' },
        { firstName: 'Philip', lastName: 'Salt', displayName: 'Philip Salt', role: 'Wicketkeeper', battingHand: 'Right', bowlingType: 'Right-arm medium', jerseyNumber: '28' },
        { firstName: 'Sunil', lastName: 'Narine', displayName: 'Sunil Narine', role: 'All-Rounder', battingHand: 'Left', bowlingType: 'Right-arm offbreak', jerseyNumber: '74' },
        { firstName: 'Rinku', lastName: 'Singh', displayName: 'Rinku Singh', role: 'All-Rounder', battingHand: 'Left', bowlingType: 'Right-arm offbreak', jerseyNumber: '35' },
        { firstName: 'Lockie', lastName: 'Ferguson', displayName: 'Lockie Ferguson', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm fast', jerseyNumber: '69' },
        { firstName: 'Suyash', lastName: 'Sharma', displayName: 'Suyash Sharma', role: 'Bowler', battingHand: 'Right', bowlingType: 'Legbreak', jerseyNumber: '5' },
        { firstName: 'Vaibhav', lastName: 'Arora', displayName: 'Vaibhav Arora', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm fast-medium', jerseyNumber: '99' },
      ],
    },
    {
      name: 'Thunder Kings',
      shortName: 'TDK',
      jerseyPrimary: '#334155',
      managerName: 'S. Fleming',
      players: [
        { firstName: 'Ruturaj', lastName: 'Gaikwad', displayName: 'Ruturaj Gaikwad', role: 'Batter', battingHand: 'Right', bowlingType: 'Right-arm offbreak', jerseyNumber: '31' },
        { firstName: 'Devon', lastName: 'Conway', displayName: 'Devon Conway', role: 'Batter', battingHand: 'Left', bowlingType: 'Right-arm medium', jerseyNumber: '88' },
        { firstName: 'MS', lastName: 'Dhoni', displayName: 'MS Dhoni', role: 'Wicketkeeper', battingHand: 'Right', bowlingType: 'Right-arm medium', jerseyNumber: '7' },
        { firstName: 'Shivam', lastName: 'Dube', displayName: 'Shivam Dube', role: 'All-Rounder', battingHand: 'Left', bowlingType: 'Right-arm medium', jerseyNumber: '25' },
        { firstName: 'Moeen', lastName: 'Ali', displayName: 'Moeen Ali', role: 'All-Rounder', battingHand: 'Left', bowlingType: 'Right-arm offbreak', jerseyNumber: '18' },
        { firstName: 'Deepak', lastName: 'Chahar', displayName: 'Deepak Chahar', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm medium-fast', jerseyNumber: '90' },
        { firstName: 'Maheesh', lastName: 'Theekshana', displayName: 'Maheesh Theekshana', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm offbreak', jerseyNumber: '61' },
        { firstName: 'Matheesha', lastName: 'Pathirana', displayName: 'Matheesha Pathirana', role: 'Bowler', battingHand: 'Right', bowlingType: 'Right-arm fast', jerseyNumber: '81' },
      ],
    },
  ];

  const createdTeams: Array<{ id: string; name: string; shortName: string }> = [];
  const teamPlayersMap = new Map<string, Array<{ id: string; displayName: string; role: string }>>();

  for (const tData of teamSeedData) {
    const team = await prisma.team.create({
      data: {
        tournamentId: tournament.id,
        name: tData.name,
        shortName: tData.shortName,
        jerseyPrimary: tData.jerseyPrimary,
        managerName: tData.managerName,
      },
    });
    createdTeams.push(team);

    const playersList: Array<{ id: string; displayName: string; role: string }> = [];
    for (const p of tData.players) {
      const player = await prisma.player.create({
        data: {
          tournamentId: tournament.id,
          firstName: p.firstName,
          lastName: p.lastName,
          displayName: p.displayName,
          role: p.role,
          battingHand: p.battingHand,
          bowlingType: p.bowlingType,
          jerseyNumber: p.jerseyNumber,
        },
      });
      await prisma.teamPlayer.create({
        data: {
          teamId: team.id,
          playerId: player.id,
        },
      });
      playersList.push({ id: player.id, displayName: player.displayName, role: player.role });
    }
    teamPlayersMap.set(team.id, playersList);
  }

  const teamByCode = (code: string) => createdTeams.find((t) => t.shortName === code)!;

  // Simulator helper
  let matchCounter = 1;
  const allMatchIds: string[] = [];

  async function simulateMatch(args: {
    matchNumber: string;
    stage: FixtureStage;
    teamA: { id: string; name: string; shortName: string };
    teamB: { id: string; name: string; shortName: string };
    startsAt: string;
    isLive?: boolean;
    seedNumber: number;
  }) {
    const rng = new SeedRandom(args.seedNumber);
    const teamA = args.teamA;
    const teamB = args.teamB;
    const teamAPlayers = teamPlayersMap.get(teamA.id)!;
    const teamBPlayers = teamPlayersMap.get(teamB.id)!;

    const fixture = await prisma.fixture.create({
      data: {
        tournamentId: tournament.id,
        matchNumber: args.matchNumber,
        stage: args.stage,
        status: args.isLive ? 'IN_PROGRESS' : 'COMPLETED',
        teamAId: teamA.id,
        teamBId: teamB.id,
        venueId: venue.id,
        startsAt: new Date(args.startsAt),
      },
    });

    const match = await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        fixtureId: fixture.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        venueId: venue.id,
        matchNumber: args.matchNumber,
        stage: args.stage,
        status: args.isLive ? MatchStatus.INNINGS_2 : MatchStatus.COMPLETED,
        startsAt: new Date(args.startsAt),
        currentInnings: 2,
        tossWonByTeamId: teamA.id,
        tossDecision: 'BAT',
        statusText: args.isLive ? 'Innings 2 in progress • Live chase' : 'Match completed',
      },
    });
    allMatchIds.push(match.id);

    await prisma.toss.create({
      data: {
        matchId: match.id,
        wonByTeamId: teamA.id,
        decision: 'BAT',
      },
    });

    await prisma.squadSelection.createMany({
      data: [
        ...teamAPlayers.map((p) => ({ matchId: match.id, teamId: teamA.id, playerId: p.id, isPlayingXI: true })),
        ...teamBPlayers.map((p) => ({ matchId: match.id, teamId: teamB.id, playerId: p.id, isPlayingXI: true })),
      ],
    });

    // Innings 1: Team A bats, Team B bowls
    const innings1 = await prisma.innings.create({
      data: {
        matchId: match.id,
        inningsNumber: 1,
        battingTeamId: teamA.id,
        bowlingTeamId: teamB.id,
        totalRuns: 0,
        wickets: 0,
        balls: 0,
        runRate: 0,
        isCompleted: true,
      },
    });

    const innings1Bowlers = [teamBPlayers[5], teamBPlayers[6], teamBPlayers[7], teamBPlayers[4]];
    let strikerIdx1 = 0;
    let nonStrikerIdx1 = 1;
    let nextBatterIdx1 = 2;
    let innings1TotalRuns = 0;
    let innings1Wickets = 0;
    let innings1Balls = 0;
    let sequence = 1;

    for (let overNum = 1; overNum <= 4; overNum++) {
      const bowler = innings1Bowlers[overNum - 1];
      const over = await prisma.over.create({
        data: {
          inningsId: innings1.id,
          overNumber: overNum,
          bowlerId: bowler.id,
          runs: 0,
          wickets: 0,
          balls: 0,
        },
      });

      let overRuns = 0;
      let overWickets = 0;
      let overBalls = 0;

      for (let b = 1; b <= 6; b++) {
        const rand = rng.next();
        let runsOffBat = 0;
        let isWicket = false;
        let dismissalType = '';
        let commentary = '';

        if (rand < 0.08 && innings1Wickets < 6) {
          isWicket = true;
          dismissalType = rand < 0.04 ? 'BOWLED' : 'CAUGHT';
          innings1Wickets++;
          overWickets++;
          commentary = dismissalType === 'BOWLED'
            ? `OUT! Clean bowled! Stumps shattered by ${bowler.displayName}!`
            : `OUT! Caught in the outfield! ${bowler.displayName} strikes!`;
        } else if (rand < 0.22) {
          runsOffBat = 4;
          commentary = 'FOUR! Bludgeoned through extra cover with glorious power!';
        } else if (rand < 0.32) {
          runsOffBat = 6;
          commentary = 'SIX! Magnificent pull shot deep into the stands!';
        } else if (rand < 0.60) {
          runsOffBat = 1;
          commentary = 'Pushed into the deep cover for a smart single.';
        } else if (rand < 0.75) {
          runsOffBat = 2;
          commentary = 'Driven towards wide long-on, sharp running secures two.';
        } else {
          runsOffBat = 0;
          commentary = 'Dot ball. Good tight line outside off, beaten.';
        }

        overRuns += runsOffBat;
        innings1TotalRuns += runsOffBat;
        overBalls++;
        innings1Balls++;

        const striker = teamAPlayers[strikerIdx1];
        const nonStriker = teamAPlayers[nonStrikerIdx1];

        const ballEvent = await prisma.ballEvent.create({
          data: {
            matchId: match.id,
            inningsId: innings1.id,
            overId: over.id,
            sequence: sequence++,
            ballInOver: b,
            runsOffBat,
            extrasRuns: 0,
            wicket: isWicket,
            wicketType: isWicket ? dismissalType : null,
            strikerId: striker.id,
            nonStrikerId: nonStriker.id,
            bowlerId: bowler.id,
            isValidDelivery: true,
            commentary,
            createdBy: 'system_seed',
          },
        });

        if (isWicket) {
          await prisma.wicketEvent.create({
            data: {
              ballEventId: ballEvent.id,
              dismissalType,
              dismissedPlayerId: striker.id,
            },
          });
          if (nextBatterIdx1 < teamAPlayers.length) {
            strikerIdx1 = nextBatterIdx1++;
          }
        } else if (runsOffBat % 2 === 1) {
          const temp = strikerIdx1;
          strikerIdx1 = nonStrikerIdx1;
          nonStrikerIdx1 = temp;
        }
      }

      const temp = strikerIdx1;
      strikerIdx1 = nonStrikerIdx1;
      nonStrikerIdx1 = temp;

      await prisma.over.update({
        where: { id: over.id },
        data: {
          runs: overRuns,
          wickets: overWickets,
          balls: overBalls,
        },
      });
    }

    await prisma.innings.update({
      where: { id: innings1.id },
      data: {
        totalRuns: innings1TotalRuns,
        wickets: innings1Wickets,
        balls: innings1Balls,
        runRate: Number((innings1TotalRuns / (innings1Balls / 6)).toFixed(2)),
      },
    });

    // Innings 2: Team B bats, Team A bowls
    const targetRuns = innings1TotalRuns + 1;
    const innings2 = await prisma.innings.create({
      data: {
        matchId: match.id,
        inningsNumber: 2,
        battingTeamId: teamB.id,
        bowlingTeamId: teamA.id,
        totalRuns: 0,
        wickets: 0,
        balls: 0,
        runRate: 0,
        isCompleted: !args.isLive,
      },
    });

    const innings2Bowlers = [teamAPlayers[5], teamAPlayers[6], teamAPlayers[7], teamAPlayers[4]];
    let strikerIdx2 = 0;
    let nonStrikerIdx2 = 1;
    let nextBatterIdx2 = 2;
    let innings2TotalRuns = 0;
    let innings2Wickets = 0;
    let innings2Balls = 0;
    let innings2Finished = false;

    const maxOvers = args.isLive ? 2 : 4;

    for (let overNum = 1; overNum <= maxOvers && !innings2Finished; overNum++) {
      const bowler = innings2Bowlers[overNum - 1];
      const over = await prisma.over.create({
        data: {
          inningsId: innings2.id,
          overNumber: overNum,
          bowlerId: bowler.id,
          runs: 0,
          wickets: 0,
          balls: 0,
        },
      });

      let overRuns = 0;
      let overWickets = 0;
      let overBalls = 0;

      for (let b = 1; b <= 6 && !innings2Finished; b++) {
        const rand = rng.next();
        let runsOffBat = 0;
        let isWicket = false;
        let dismissalType = '';
        let commentary = '';

        if (rand < 0.08 && innings2Wickets < 6) {
          isWicket = true;
          dismissalType = 'BOWLED';
          innings2Wickets++;
          overWickets++;
          commentary = `WICKET! Clean bowled by ${bowler.displayName}!`;
        } else if (rand < 0.25) {
          runsOffBat = 4;
          commentary = 'FOUR! Cut aggressively behind point!';
        } else if (rand < 0.35) {
          runsOffBat = 6;
          commentary = 'SIX! Towering maximum straight over long-off!';
        } else if (rand < 0.65) {
          runsOffBat = 1;
          commentary = 'Tucked to square leg for a quick single.';
        } else if (rand < 0.78) {
          runsOffBat = 2;
          commentary = 'Steered through backward point, brisk two taken.';
        } else {
          runsOffBat = 0;
          commentary = 'No run. Beaten by good pace and seam movement.';
        }

        overRuns += runsOffBat;
        innings2TotalRuns += runsOffBat;
        overBalls++;
        innings2Balls++;

        const striker = teamBPlayers[strikerIdx2];
        const nonStriker = teamBPlayers[nonStrikerIdx2];

        const ballEvent = await prisma.ballEvent.create({
          data: {
            matchId: match.id,
            inningsId: innings2.id,
            overId: over.id,
            sequence: sequence++,
            ballInOver: b,
            runsOffBat,
            extrasRuns: 0,
            wicket: isWicket,
            wicketType: isWicket ? dismissalType : null,
            strikerId: striker.id,
            nonStrikerId: nonStriker.id,
            bowlerId: bowler.id,
            isValidDelivery: true,
            commentary,
            createdBy: 'system_seed',
          },
        });

        if (isWicket) {
          await prisma.wicketEvent.create({
            data: {
              ballEventId: ballEvent.id,
              dismissalType,
              dismissedPlayerId: striker.id,
            },
          });
          if (nextBatterIdx2 < teamBPlayers.length) {
            strikerIdx2 = nextBatterIdx2++;
          }
        } else if (runsOffBat % 2 === 1) {
          const temp = strikerIdx2;
          strikerIdx2 = nonStrikerIdx2;
          nonStrikerIdx2 = temp;
        }

        if (!args.isLive && innings2TotalRuns >= targetRuns) {
          innings2Finished = true;
        }
      }

      const temp = strikerIdx2;
      strikerIdx2 = nonStrikerIdx2;
      nonStrikerIdx2 = temp;

      await prisma.over.update({
        where: { id: over.id },
        data: {
          runs: overRuns,
          wickets: overWickets,
          balls: overBalls,
        },
      });
    }

    await prisma.innings.update({
      where: { id: innings2.id },
      data: {
        totalRuns: innings2TotalRuns,
        wickets: innings2Wickets,
        balls: innings2Balls,
        runRate: innings2Balls ? Number((innings2TotalRuns / (innings2Balls / 6)).toFixed(2)) : 0,
      },
    });

    let winnerTeamId: string | null = null;
    let resultSummary: string | null = null;

    if (!args.isLive) {
      if (innings2TotalRuns >= targetRuns) {
        winnerTeamId = teamB.id;
        const wicketsLeft = 7 - innings2Wickets;
        resultSummary = `${teamB.name} won by ${wicketsLeft} wickets`;
      } else {
        winnerTeamId = teamA.id;
        const margin = targetRuns - 1 - innings2TotalRuns;
        resultSummary = `${teamA.name} won by ${margin} runs`;
      }

      await prisma.match.update({
        where: { id: match.id },
        data: {
          targetRuns,
          winnerTeamId,
          resultSummary,
          statusText: resultSummary,
        },
      });

      const momPlayer = winnerTeamId === teamA.id ? teamAPlayers[0] : teamBPlayers[0];
      await prisma.award.create({
        data: {
          tournamentId: tournament.id,
          matchId: match.id,
          playerId: momPlayer.id,
          type: AwardType.MAN_OF_THE_MATCH,
          reason: `Match-winning performance in ${args.matchNumber}`,
          locked: true,
        },
      });
    } else {
      const runsNeeded = Math.max(targetRuns - innings2TotalRuns, 0);
      const ballsLeft = 24 - innings2Balls;
      await prisma.match.update({
        where: { id: match.id },
        data: {
          targetRuns,
          statusText: `${teamB.name} need ${runsNeeded} runs in ${ballsLeft} balls`,
        },
      });
    }

    return { matchId: match.id, winnerTeamId };
  }

  console.log('--- Simulating 16 League Matches (4 overs each, May 9 & 10) ---');
  const leagueSchedule = [
    // May 9, 2026 (10 matches)
    { matchNumber: 'Match 01', teamA: 'SSS', teamB: 'JPK', startsAt: '2026-05-09T09:00:00.000Z' },
    { matchNumber: 'Match 02', teamA: 'RST', teamB: 'PXH', startsAt: '2026-05-09T10:00:00.000Z' },
    { matchNumber: 'Match 03', teamA: 'CTN', teamB: 'DEG', startsAt: '2026-05-09T11:00:00.000Z' },
    { matchNumber: 'Match 04', teamA: 'MTK', teamB: 'TDK', startsAt: '2026-05-09T12:00:00.000Z' },
    { matchNumber: 'Match 05', teamA: 'SSS', teamB: 'RST', startsAt: '2026-05-09T13:30:00.000Z' },
    { matchNumber: 'Match 06', teamA: 'JPK', teamB: 'PXH', startsAt: '2026-05-09T14:30:00.000Z' },
    { matchNumber: 'Match 07', teamA: 'CTN', teamB: 'MTK', startsAt: '2026-05-09T15:30:00.000Z' },
    { matchNumber: 'Match 08', teamA: 'DEG', teamB: 'TDK', startsAt: '2026-05-09T16:30:00.000Z' },
    { matchNumber: 'Match 09', teamA: 'RST', teamB: 'CTN', startsAt: '2026-05-09T17:30:00.000Z' },
    { matchNumber: 'Match 10', teamA: 'PXH', teamB: 'DEG', startsAt: '2026-05-09T18:30:00.000Z' },

    // May 10, 2026 (6 matches)
    { matchNumber: 'Match 11', teamA: 'SSS', teamB: 'MTK', startsAt: '2026-05-10T09:00:00.000Z' },
    { matchNumber: 'Match 12', teamA: 'JPK', teamB: 'TDK', startsAt: '2026-05-10T10:00:00.000Z' },
    { matchNumber: 'Match 13', teamA: 'SSS', teamB: 'TDK', startsAt: '2026-05-10T11:00:00.000Z' },
    { matchNumber: 'Match 14', teamA: 'JPK', teamB: 'RST', startsAt: '2026-05-10T12:00:00.000Z' },
    { matchNumber: 'Match 15', teamA: 'PXH', teamB: 'CTN', startsAt: '2026-05-10T13:30:00.000Z' },
    { matchNumber: 'Match 16', teamA: 'DEG', teamB: 'MTK', startsAt: '2026-05-10T14:30:00.000Z' },
  ];

  let seedNum = 100;
  for (const item of leagueSchedule) {
    await simulateMatch({
      matchNumber: item.matchNumber,
      stage: FixtureStage.LEAGUE,
      teamA: teamByCode(item.teamA),
      teamB: teamByCode(item.teamB),
      startsAt: item.startsAt,
      seedNumber: seedNum++,
    });
  }

  console.log('--- Calculating League Standings to Determine Top 4 Playoff Qualifiers ---');
  const leagueMatches = await prisma.match.findMany({
    where: {
      tournamentId: tournament.id,
      stage: FixtureStage.LEAGUE,
      status: MatchStatus.COMPLETED,
    },
    include: { innings: true },
  });

  const standingsMap = new Map<string, any>();
  for (const t of createdTeams) {
    standingsMap.set(t.id, {
      team: t,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      runsFor: 0,
      ballsFor: 0,
      runsAgainst: 0,
      ballsAgainst: 0,
      nrr: 0,
    });
  }

  for (const m of leagueMatches) {
    const a = standingsMap.get(m.teamAId);
    const b = standingsMap.get(m.teamBId);
    if (!a || !b) continue;

    a.played += 1;
    b.played += 1;

    const inn1 = m.innings.find((i) => i.inningsNumber === 1);
    const inn2 = m.innings.find((i) => i.inningsNumber === 2);

    if (inn1 && inn2) {
      const t1 = standingsMap.get(inn1.battingTeamId);
      const t2 = standingsMap.get(inn2.battingTeamId);
      if (t1 && t2) {
        t1.runsFor += inn1.totalRuns;
        t1.ballsFor += inn1.balls;
        t1.runsAgainst += inn2.totalRuns;
        t1.ballsAgainst += inn2.balls;

        t2.runsFor += inn2.totalRuns;
        t2.ballsFor += inn2.balls;
        t2.runsAgainst += inn1.totalRuns;
        t2.ballsAgainst += inn1.balls;
      }
    }

    if (m.winnerTeamId === m.teamAId) {
      a.won += 1;
      b.lost += 1;
      a.points += 2;
    } else if (m.winnerTeamId === m.teamBId) {
      b.won += 1;
      a.lost += 1;
      b.points += 2;
    }
  }

  const sortedStandings = Array.from(standingsMap.values()).map((row) => {
    const oversFor = oversFromBalls(row.ballsFor);
    const oversAgainst = oversFromBalls(row.ballsAgainst);
    const nrrFor = oversFor > 0 ? row.runsFor / oversFor : 0;
    const nrrAgainst = oversAgainst > 0 ? row.runsAgainst / oversAgainst : 0;
    row.nrr = Number((nrrFor - nrrAgainst).toFixed(3));
    return row;
  });

  sortedStandings.sort((l, r) => {
    if (r.points !== l.points) return r.points - l.points;
    return r.nrr - l.nrr;
  });

  const rank1 = sortedStandings[0].team;
  const rank2 = sortedStandings[1].team;
  const rank3 = sortedStandings[2].team;
  const rank4 = sortedStandings[3].team;

  console.log(`Top 4 Qualifiers: 1. ${rank1.name}, 2. ${rank2.name}, 3. ${rank3.name}, 4. ${rank4.name}`);

  console.log('--- Simulating Playoffs (Semi-Final 1, Semi-Final 2, Grand Final) ---');
  // Semi-Final 1: Rank 1 vs Rank 4
  const sf1Result = await simulateMatch({
    matchNumber: 'Semi-Final 1',
    stage: FixtureStage.SEMI_FINAL,
    teamA: rank1,
    teamB: rank4,
    startsAt: '2026-05-10T16:00:00.000Z',
    seedNumber: seedNum++,
  });

  // Semi-Final 2: Rank 2 vs Rank 3
  const sf2Result = await simulateMatch({
    matchNumber: 'Semi-Final 2',
    stage: FixtureStage.SEMI_FINAL,
    teamA: rank2,
    teamB: rank3,
    startsAt: '2026-05-10T17:30:00.000Z',
    seedNumber: seedNum++,
  });

  const sf1Winner = sf1Result.winnerTeamId === rank1.id ? rank1 : rank4;
  const sf2Winner = sf2Result.winnerTeamId === rank2.id ? rank2 : rank3;

  console.log(`Finalists: ${sf1Winner.name} vs ${sf2Winner.name}`);

  // Grand Final: Winner SF1 vs Winner SF2 (Live INNINGS_2)
  await simulateMatch({
    matchNumber: 'Grand Final',
    stage: FixtureStage.FINAL,
    teamA: sf1Winner,
    teamB: sf2Winner,
    startsAt: '2026-05-10T19:30:00.000Z',
    isLive: true,
    seedNumber: seedNum++,
  });

  console.log('--- Generating Scorecard Projections for All 19 Matches ---');
  for (const matchId of allMatchIds) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        innings: {
          include: {
            ballEvents: {
              where: { isVoided: false },
              include: { striker: true, bowler: true },
              orderBy: { sequence: 'asc' },
            },
            battingTeam: true,
            bowlingTeam: true,
          },
          orderBy: { inningsNumber: 'asc' },
        },
      },
    });

    if (!match) continue;

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
        if (ball.isValidDelivery) batter.balls += 1;
        if (ball.runsOffBat === 4) batter.fours += 1;
        if (ball.runsOffBat === 6) batter.sixes += 1;
        batting.set(ball.strikerId, batter);

        const bowler = bowling.get(ball.bowlerId) ?? {
          name: ball.bowler.displayName,
          balls: 0,
          runs: 0,
          wickets: 0,
        };
        if (ball.isValidDelivery) bowler.balls += 1;
        const bowlerExtras = ball.extrasType === 'BYE' || ball.extrasType === 'LEG_BYE' ? 0 : ball.extrasRuns;
        bowler.runs += ball.runsOffBat + bowlerExtras;
        if (ball.wicket && ball.wicketType !== 'RUN_OUT') bowler.wickets += 1;
        if (ball.wicket) {
          const totalAtWicket = innings.ballEvents
            .filter((item) => item.sequence <= ball.sequence)
            .reduce((sum, item) => sum + item.runsOffBat + item.extrasRuns, 0);
          const wicketsAtPoint = innings.ballEvents.filter((item) => item.sequence <= ball.sequence && item.wicket).length;
          const legalBallsAtPoint = innings.ballEvents.filter((item) => item.sequence <= ball.sequence && item.isValidDelivery).length;
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

    await prisma.scorecardProjection.upsert({
      where: { matchId: match.id },
      create: {
        matchId: match.id,
        innings1: inningsPayload[0] ?? {},
        innings2: inningsPayload[1] ?? null,
        summary,
      },
      update: {
        innings1: inningsPayload[0] ?? {},
        innings2: inningsPayload[1] ?? null,
        summary,
        lastComputedAt: new Date(),
      },
    });
  }

  console.log('--- Generating Points Table Projection ---');
  sortedStandings.forEach((row, index) => {
    row.qualified = index < 4;
    row.eliminated = index >= Math.max(createdTeams.length - 2, 0);
  });

  await prisma.pointsTableProjection.createMany({
    data: sortedStandings.map((row) => ({
      tournamentId: tournament.id,
      teamId: row.team.id,
      played: row.played,
      won: row.won,
      lost: row.lost,
      tied: 0,
      noResult: 0,
      points: row.points,
      netRunRate: row.nrr,
      qualified: row.qualified,
      eliminated: row.eliminated,
    })),
  });

  console.log('--- Generating Leaderboard Projections ---');
  const balls = await prisma.ballEvent.findMany({
    where: {
      isVoided: false,
      match: { tournamentId: tournament.id },
    },
    include: { striker: true, bowler: true },
    orderBy: { sequence: 'asc' },
  });

  const battingMap = new Map<string, { runs: number; balls: number; fours: number; sixes: number }>();
  const bowlingMap = new Map<string, { balls: number; runs: number; wickets: number }>();

  for (const ball of balls) {
    const batter = battingMap.get(ball.strikerId) ?? { runs: 0, balls: 0, fours: 0, sixes: 0 };
    batter.runs += ball.runsOffBat;
    if (ball.isValidDelivery) batter.balls += 1;
    if (ball.runsOffBat === 4) batter.fours += 1;
    if (ball.runsOffBat === 6) batter.sixes += 1;
    battingMap.set(ball.strikerId, batter);

    const bowler = bowlingMap.get(ball.bowlerId) ?? { balls: 0, runs: 0, wickets: 0 };
    if (ball.isValidDelivery) bowler.balls += 1;
    const bowlerExtras = ball.extrasType === 'BYE' || ball.extrasType === 'LEG_BYE' ? 0 : ball.extrasRuns;
    bowler.runs += ball.runsOffBat + bowlerExtras;
    if (ball.wicket && ball.wicketType !== 'RUN_OUT') bowler.wickets += 1;
    bowlingMap.set(ball.bowlerId, bowler);
  }

  const buildRanks = (
    metric: LeaderboardMetric,
    metricRows: Array<{ playerId: string; value: number; subMetric?: string }>,
    descending = true,
  ) => {
    const sorted = metricRows.sort((a, b) => (descending ? b.value - a.value : a.value - b.value));
    return sorted.map((row, idx) => ({
      tournamentId: tournament.id,
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
        value: stat.balls ? stat.runs / (stat.balls / 6) : 99,
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
  if (flattened.length) {
    await prisma.leaderboardProjection.createMany({
      data: flattened,
    });
  }

  if (mostRuns[0]) {
    await prisma.award.create({
      data: {
        tournamentId: tournament.id,
        playerId: mostRuns[0].playerId,
        type: AwardType.BEST_BATTER,
        reason: 'Leading run-scorer of the tournament',
        locked: true,
      },
    });
  }

  if (mostWickets[0]) {
    await prisma.award.create({
      data: {
        tournamentId: tournament.id,
        playerId: mostWickets[0].playerId,
        type: AwardType.BEST_BOWLER,
        reason: 'Leading wicket-taker of the tournament',
        locked: true,
      },
    });
  }

  if (mvp[0]) {
    await prisma.award.create({
      data: {
        tournamentId: tournament.id,
        playerId: mvp[0].playerId,
        type: AwardType.PLAYER_OF_THE_SERIES,
        reason: 'Highest overall MVP impact rating',
        locked: true,
      },
    });
  }

  console.log('--- Tournament Seed Successfully Completed! ---');
  console.log(`Tournament: ${tournament.name} (${tournament.season})`);
  console.log(`Teams created: ${createdTeams.length}`);
  console.log(`Matches created: 19 (16 League, 2 Semi-Finals, 1 Grand Final)`);
  console.log(`Playoffs: SF1 (${rank1.shortName} vs ${rank4.shortName}), SF2 (${rank2.shortName} vs ${rank3.shortName}), Final (${sf1Winner.shortName} vs ${sf2Winner.shortName})`);
  console.log(`Standings: ${sortedStandings.map((m) => `${m.team.shortName}: ${m.points}pts (Q:${m.qualified})`).join(' | ')}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
