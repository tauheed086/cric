import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { AwardType, FixtureStage, MatchInterruptionType } from '@prisma/client';

export class UpsertTournamentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  season!: string;

  @IsOptional()
  @IsString()
  sponsorName?: string;

  @IsOptional()
  @IsString()
  sponsorLogoUrl?: string;

  @IsOptional()
  @IsString()
  heroBannerUrl?: string;
}

export class UpdateSettingsDto {
  @IsString()
  format!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  oversPerInnings!: number;

  @IsOptional()
  @IsString()
  ballType?: string;

  @IsInt()
  @Min(2)
  numberOfTeams!: number;

  @IsOptional()
  @IsString()
  groupStructure?: string;

  @IsOptional()
  @IsString()
  knockoutStages?: string;

  @IsOptional()
  @IsInt()
  pointsRuleWin?: number;

  @IsOptional()
  @IsInt()
  pointsRuleTie?: number;

  @IsOptional()
  @IsInt()
  pointsRuleNoResult?: number;

  @IsOptional()
  @IsString()
  nrrRule?: string;

  @IsOptional()
  @IsString()
  tieRule?: string;

  @IsOptional()
  @IsBoolean()
  bonusPointsEnabled?: boolean;

  @IsOptional()
  @IsString()
  playerOfSeriesFormula?: string;

  @IsOptional()
  @IsString()
  rankingLogic?: string;

  @IsOptional()
  @IsBoolean()
  allowManualPointsOverride?: boolean;
}

export class TeamDto {
  @IsString()
  name!: string;

  @IsString()
  shortName!: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  jerseyPrimary?: string;

  @IsOptional()
  @IsString()
  jerseySecondary?: string;

  @IsOptional()
  @IsString()
  managerName?: string;
}

export class PlayerDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  displayName!: string;

  @IsString()
  role!: string;

  @IsOptional()
  @IsString()
  battingHand?: string;

  @IsOptional()
  @IsString()
  bowlingType?: string;

  @IsOptional()
  @IsString()
  jerseyNumber?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsString()
  teamId!: string;
}

export class VenueDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class FixtureDto {
  @IsString()
  matchNumber!: string;

  @IsEnum(FixtureStage)
  stage!: FixtureStage;

  @IsString()
  teamAId!: string;

  @IsString()
  teamBId!: string;

  @IsString()
  venueId!: string;

  @IsDateString()
  startsAt!: string;
}

export class TossDto {
  @IsString()
  wonByTeamId!: string;

  @IsString()
  decision!: string;
}

export class PlayingXiDto {
  @IsString()
  teamId!: string;

  @IsArray()
  @ArrayMinSize(11)
  @ArrayMaxSize(11)
  @IsString({ each: true })
  playerIds!: string[];
}

export class BallInputDto {
  @IsInt()
  @Min(1)
  @Max(2)
  inningsNumber!: 1 | 2;

  @IsInt()
  @Min(0)
  @Max(6)
  runsOffBat!: 0 | 1 | 2 | 3 | 4 | 6;

  @IsOptional()
  @IsString()
  extrasType?: 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  extrasRuns?: number;

  @IsOptional()
  @IsBoolean()
  wicket?: boolean;

  @IsOptional()
  @IsString()
  wicketType?: string;

  @IsOptional()
  @IsString()
  dismissedPlayerId?: string;

  @IsString()
  strikerId!: string;

  @IsString()
  nonStrikerId!: string;

  @IsString()
  bowlerId!: string;

  @IsOptional()
  @IsString()
  commentary?: string;
}

export class StartInningsDto {
  @IsInt()
  @Min(1)
  @Max(2)
  inningsNumber!: 1 | 2;
}

export class InterruptionDto {
  @IsEnum(MatchInterruptionType)
  type!: MatchInterruptionType;

  @IsString()
  statusText!: string;
}

export class DeclareResultDto {
  @IsOptional()
  @IsString()
  winnerTeamId?: string | null;

  @IsString()
  resultSummary!: string;

  @IsOptional()
  @IsString()
  momPlayerId?: string | null;
}

export class ManOfMatchDto {
  @IsString()
  playerId!: string;
}

export class AwardDto {
  @IsEnum(AwardType)
  type!: AwardType;

  @IsString()
  playerId!: string;

  @IsOptional()
  @IsString()
  matchId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  locked?: boolean;
}

export class AnnouncementDto {
  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class AdminLoginDto {
  // Legacy master-token login
  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  adminName?: string;

  // Username/password login (registered admin users)
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;
}
