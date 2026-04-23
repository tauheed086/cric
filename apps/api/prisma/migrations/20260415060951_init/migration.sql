-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('UPCOMING', 'PRE_TOSS', 'POST_TOSS', 'INNINGS_1', 'INNINGS_BREAK', 'INNINGS_2', 'COMPLETED', 'DELAYED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "FixtureStage" AS ENUM ('LEAGUE', 'QUALIFIER', 'SEMI_FINAL', 'FINAL');

-- CreateEnum
CREATE TYPE "FixtureStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'DELAYED');

-- CreateEnum
CREATE TYPE "ExtrasType" AS ENUM ('WIDE', 'NO_BALL', 'BYE', 'LEG_BYE');

-- CreateEnum
CREATE TYPE "AwardType" AS ENUM ('MAN_OF_THE_MATCH', 'PLAYER_OF_THE_SERIES', 'BEST_BATTER', 'BEST_BOWLER', 'EMERGING_PLAYER', 'BEST_FIELDER');

-- CreateEnum
CREATE TYPE "LeaderboardMetric" AS ENUM ('MOST_RUNS', 'MOST_WICKETS', 'BEST_STRIKE_RATE', 'BEST_ECONOMY', 'MOST_SIXES', 'MOST_FOURS', 'HIGHEST_SCORE', 'BEST_BOWLING', 'MOST_CATCHES', 'MOST_STUMPINGS', 'MVP');

-- CreateEnum
CREATE TYPE "MatchInterruptionType" AS ENUM ('NONE', 'RAIN_DELAY', 'INJURY_BREAK', 'DRINKS', 'INNINGS_BREAK', 'ABANDONED', 'DLS_ADJUSTED');

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "sponsorName" TEXT,
    "sponsorLogoUrl" TEXT,
    "heroBannerUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonSettings" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "oversPerInnings" INTEGER NOT NULL,
    "ballType" TEXT,
    "numberOfTeams" INTEGER NOT NULL,
    "groupStructure" TEXT,
    "knockoutStages" TEXT,
    "pointsRuleWin" INTEGER NOT NULL DEFAULT 2,
    "pointsRuleTie" INTEGER NOT NULL DEFAULT 1,
    "pointsRuleNoResult" INTEGER NOT NULL DEFAULT 1,
    "nrrRule" TEXT,
    "tieRule" TEXT,
    "bonusPointsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "playerOfSeriesFormula" TEXT,
    "rankingLogic" TEXT,
    "allowManualPointsOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Official" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Official_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "jerseyPrimary" TEXT,
    "jerseySecondary" TEXT,
    "managerName" TEXT,
    "captainPlayerId" TEXT,
    "viceCaptainPlayerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "battingHand" TEXT,
    "bowlingType" TEXT,
    "jerseyNumber" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamPlayer" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "matchNumber" TEXT NOT NULL,
    "stage" "FixtureStage" NOT NULL,
    "status" "FixtureStatus" NOT NULL DEFAULT 'UPCOMING',
    "teamAId" TEXT NOT NULL,
    "teamBId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "teamAId" TEXT NOT NULL,
    "teamBId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "matchNumber" TEXT NOT NULL,
    "stage" "FixtureStage" NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PRE_TOSS',
    "interruptionType" "MatchInterruptionType" NOT NULL DEFAULT 'NONE',
    "tossWonByTeamId" TEXT,
    "tossDecision" TEXT,
    "currentInnings" INTEGER NOT NULL DEFAULT 0,
    "targetRuns" INTEGER,
    "statusText" TEXT,
    "resultSummary" TEXT,
    "winnerTeamId" TEXT,
    "momPlayerId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Toss" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "wonByTeamId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Toss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadSelection" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "isPlayingXI" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SquadSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Innings" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "inningsNumber" INTEGER NOT NULL,
    "battingTeamId" TEXT NOT NULL,
    "bowlingTeamId" TEXT NOT NULL,
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "balls" INTEGER NOT NULL DEFAULT 0,
    "runRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Innings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Over" (
    "id" TEXT NOT NULL,
    "inningsId" TEXT NOT NULL,
    "overNumber" INTEGER NOT NULL,
    "bowlerId" TEXT NOT NULL,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "balls" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Over_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BallEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "inningsId" TEXT NOT NULL,
    "overId" TEXT,
    "sequence" INTEGER NOT NULL,
    "ballInOver" INTEGER NOT NULL,
    "runsOffBat" INTEGER NOT NULL,
    "extrasType" "ExtrasType",
    "extrasRuns" INTEGER NOT NULL DEFAULT 0,
    "wicket" BOOLEAN NOT NULL DEFAULT false,
    "wicketType" TEXT,
    "strikerId" TEXT NOT NULL,
    "nonStrikerId" TEXT NOT NULL,
    "bowlerId" TEXT NOT NULL,
    "isValidDelivery" BOOLEAN NOT NULL DEFAULT true,
    "commentary" TEXT,
    "correctionOfId" TEXT,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BallEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WicketEvent" (
    "id" TEXT NOT NULL,
    "ballEventId" TEXT NOT NULL,
    "dismissedPlayerId" TEXT,
    "dismissalType" TEXT NOT NULL,
    "fielderPlayerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WicketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtrasEvent" (
    "id" TEXT NOT NULL,
    "ballEventId" TEXT NOT NULL,
    "extrasType" "ExtrasType" NOT NULL,
    "runs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtrasEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnershipSnapshot" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "inningsNumber" INTEGER NOT NULL,
    "batterAId" TEXT NOT NULL,
    "batterBId" TEXT NOT NULL,
    "runs" INTEGER NOT NULL,
    "balls" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnershipSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScorecardProjection" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "innings1" JSONB NOT NULL,
    "innings2" JSONB,
    "summary" JSONB NOT NULL,
    "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScorecardProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsTableProjection" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "tied" INTEGER NOT NULL DEFAULT 0,
    "noResult" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "netRunRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "eliminated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointsTableProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardProjection" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "metric" "LeaderboardMetric" NOT NULL,
    "playerId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "subMetric" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Award" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "matchId" TEXT,
    "playerId" TEXT NOT NULL,
    "type" "AwardType" NOT NULL,
    "reason" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "matchId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB,
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonSettings_tournamentId_key" ON "SeasonSettings"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamPlayer_teamId_playerId_key" ON "TeamPlayer"("teamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_fixtureId_key" ON "Match"("fixtureId");

-- CreateIndex
CREATE UNIQUE INDEX "Toss_matchId_key" ON "Toss"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "SquadSelection_matchId_teamId_playerId_key" ON "SquadSelection"("matchId", "teamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Innings_matchId_inningsNumber_key" ON "Innings"("matchId", "inningsNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Over_inningsId_overNumber_key" ON "Over"("inningsId", "overNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BallEvent_matchId_sequence_key" ON "BallEvent"("matchId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "WicketEvent_ballEventId_key" ON "WicketEvent"("ballEventId");

-- CreateIndex
CREATE UNIQUE INDEX "ExtrasEvent_ballEventId_key" ON "ExtrasEvent"("ballEventId");

-- CreateIndex
CREATE UNIQUE INDEX "ScorecardProjection_matchId_key" ON "ScorecardProjection"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "PointsTableProjection_tournamentId_teamId_key" ON "PointsTableProjection"("tournamentId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardProjection_tournamentId_metric_playerId_key" ON "LeaderboardProjection"("tournamentId", "metric", "playerId");

-- AddForeignKey
ALTER TABLE "SeasonSettings" ADD CONSTRAINT "SeasonSettings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Official" ADD CONSTRAINT "Official_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPlayer" ADD CONSTRAINT "TeamPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPlayer" ADD CONSTRAINT "TeamPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Toss" ADD CONSTRAINT "Toss_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadSelection" ADD CONSTRAINT "SquadSelection_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadSelection" ADD CONSTRAINT "SquadSelection_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Innings" ADD CONSTRAINT "Innings_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Innings" ADD CONSTRAINT "Innings_battingTeamId_fkey" FOREIGN KEY ("battingTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Innings" ADD CONSTRAINT "Innings_bowlingTeamId_fkey" FOREIGN KEY ("bowlingTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Over" ADD CONSTRAINT "Over_inningsId_fkey" FOREIGN KEY ("inningsId") REFERENCES "Innings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallEvent" ADD CONSTRAINT "BallEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallEvent" ADD CONSTRAINT "BallEvent_inningsId_fkey" FOREIGN KEY ("inningsId") REFERENCES "Innings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallEvent" ADD CONSTRAINT "BallEvent_overId_fkey" FOREIGN KEY ("overId") REFERENCES "Over"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallEvent" ADD CONSTRAINT "BallEvent_strikerId_fkey" FOREIGN KEY ("strikerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallEvent" ADD CONSTRAINT "BallEvent_nonStrikerId_fkey" FOREIGN KEY ("nonStrikerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallEvent" ADD CONSTRAINT "BallEvent_bowlerId_fkey" FOREIGN KEY ("bowlerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WicketEvent" ADD CONSTRAINT "WicketEvent_ballEventId_fkey" FOREIGN KEY ("ballEventId") REFERENCES "BallEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtrasEvent" ADD CONSTRAINT "ExtrasEvent_ballEventId_fkey" FOREIGN KEY ("ballEventId") REFERENCES "BallEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipSnapshot" ADD CONSTRAINT "PartnershipSnapshot_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorecardProjection" ADD CONSTRAINT "ScorecardProjection_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsTableProjection" ADD CONSTRAINT "PointsTableProjection_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsTableProjection" ADD CONSTRAINT "PointsTableProjection_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardProjection" ADD CONSTRAINT "LeaderboardProjection_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardProjection" ADD CONSTRAINT "LeaderboardProjection_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
