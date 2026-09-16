export enum MatchStatus {
  UPCOMING = 'UPCOMING',
  PRE_TOSS = 'PRE_TOSS',
  POST_TOSS = 'POST_TOSS',
  INNINGS_1 = 'INNINGS_1',
  INNINGS_BREAK = 'INNINGS_BREAK',
  INNINGS_2 = 'INNINGS_2',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
  ABANDONED = 'ABANDONED',
}

export enum FixtureStage {
  LEAGUE = 'LEAGUE',
  QUALIFIER = 'QUALIFIER',
  SEMI_FINAL = 'SEMI_FINAL',
  FINAL = 'FINAL',
}

export enum MatchEventType {
  MATCH_UPDATED = 'MATCH_UPDATED',
  SCORE_UPDATED = 'SCORE_UPDATED',
  RESULT_PUBLISHED = 'RESULT_PUBLISHED',
  POINTS_UPDATED = 'POINTS_UPDATED',
  LEADERBOARD_UPDATED = 'LEADERBOARD_UPDATED',
  ANNOUNCEMENT_UPDATED = 'ANNOUNCEMENT_UPDATED',
}

export interface EventEnvelope<T = unknown> {
  eventType: MatchEventType;
  entityType: string;
  entityId: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
  payload: T;
}

export interface TeamSummary {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string | null;
  jerseyPrimary?: string | null;
}

export interface LiveScoreSummary {
  runs: number;
  wickets: number;
  overs: string;
  runRate: number;
  target?: number | null;
  requiredRate?: number | null;
}

export interface MatchCard {
  id: string;
  matchNumber: string;
  venue: string;
  stage: FixtureStage;
  status: MatchStatus;
  startsAt: string;
  teamA: TeamSummary;
  teamB: TeamSummary;
  score?: LiveScoreSummary;
  teamAScore?: LiveScoreSummary | null;
  teamBScore?: LiveScoreSummary | null;
  currentBattingTeamId?: string | null;
  winnerTeamId?: string | null;
  tossText?: string | null;
  statusText?: string | null;
  lastUpdatedAt?: string | null;
}

export interface PointsTableRow {
  teamId: string;
  teamName: string;
  teamShortName?: string;
  logoUrl?: string | null;
  jerseyPrimary?: string | null;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  netRunRate: number;
  qualified: boolean;
  eliminated: boolean;
  form?: string[];
  recentForm?: string[];
}

export interface LeaderboardRow {
  playerId: string;
  playerName: string;
  teamName: string;
  metric: number;
  subMetric?: string;
}

export interface BallInput {
  inningsNumber: 1 | 2;
  runsOffBat: 0 | 1 | 2 | 3 | 4 | 6;
  extrasType?: 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | null;
  extrasRuns?: number;
  wicket?: boolean;
  wicketType?: string | null;
  dismissedPlayerId?: string | null;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  commentary?: string | null;
}

export interface DashboardPayload {
  tournamentId: string;
  tournamentName: string;
  season: string;
  ongoingMatches: MatchCard[];
  upcomingFixtures: MatchCard[];
  recentResults: MatchCard[];
  pointsPreview: PointsTableRow[];
  topBatters: LeaderboardRow[];
  topBowlers: LeaderboardRow[];
  announcement?: {
    id: string;
    title: string;
    body: string;
    publishedAt: string;
  } | null;
}

export interface TournamentSummary {
  id: string;
  name: string;
  season: string;
  sponsorName?: string | null;
  sponsorLogoUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SCORER = 'SCORER',
}

export interface AdminUserSummary {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  tournamentsCount?: number;
  createdAt: string;
}

