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
                    oversPerInnings: 20,
                    numberOfTeams: 4,
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
    const teams = await Promise.all(['Falcons', 'Warriors', 'Titans', 'Royals'].map((name, index) => prisma.team.create({
        data: {
            tournamentId: tournament.id,
            name,
            shortName: name.slice(0, 3).toUpperCase(),
            jerseyPrimary: ['#1db954', '#ff6b35', '#22d3ee', '#fbbf24'][index],
            managerName: `${name} Manager`,
        },
    })));
    for (const team of teams) {
        for (let i = 1; i <= 14; i += 1) {
            const player = await prisma.player.create({
                data: {
                    tournamentId: tournament.id,
                    firstName: `${team.shortName}${i}`,
                    lastName: 'Player',
                    displayName: `${team.shortName} Player ${i}`,
                    role: i % 5 === 0 ? 'All-Rounder' : i % 3 === 0 ? 'Bowler' : 'Batter',
                    battingHand: i % 2 === 0 ? 'Right' : 'Left',
                    bowlingType: i % 2 === 0 ? 'Right-arm medium' : 'Left-arm spin',
                    jerseyNumber: String(i),
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
            take: 11,
        }),
        prisma.teamPlayer.findMany({
            where: { teamId: teams[1].id },
            include: { player: true },
            take: 11,
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
//# sourceMappingURL=seed.js.map