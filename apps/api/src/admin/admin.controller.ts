import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../common/admin-auth.guard.js';
import { CurrentAdmin, CurrentAdminUser } from '../common/current-admin.js';
import type { RequestAdminUser } from '../common/current-admin.js';
import { AdminService } from './admin.service.js';
import {
  AnnouncementDto,
  AwardDto,
  BallInputDto,
  DeclareResultDto,
  FixtureDto,
  InterruptionDto,
  ManOfMatchDto,
  PlayerDto,
  PlayingXiDto,
  StartInningsDto,
  TeamDto,
  TossDto,
  UpdateSettingsDto,
  UpsertTournamentDto,
  VenueDto,
} from './dto.js';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  dashboard(@CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.getDashboard(user);
  }

  @Post('tournament')
  upsertTournament(
    @Body() body: { tournament: UpsertTournamentDto; settings?: UpdateSettingsDto },
    @CurrentAdminUser() user: RequestAdminUser,
  ) {
    return this.adminService.upsertTournament(body.tournament, body.settings ?? null, user);
  }

  @Get('settings')
  getSettings(@CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.getSettings(user);
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateSettingsDto, @CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.updateSettings(dto, user);
  }

  @Post('recompute')
  recompute(@CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.forceRecompute(user);
  }

  @Get('teams')
  listTeams(@CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.listTeams(user);
  }

  @Post('teams')
  createTeam(@Body() dto: TeamDto, @CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.createTeam(dto, user);
  }

  @Patch('teams/:id')
  updateTeam(@Param('id') id: string, @Body() dto: TeamDto) {
    return this.adminService.updateTeam(id, dto);
  }

  @Delete('teams/:id')
  deleteTeam(@Param('id') id: string) {
    return this.adminService.deleteTeam(id);
  }

  @Get('players')
  listPlayers(@CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.listPlayers(user);
  }

  @Post('players')
  createPlayer(@Body() dto: PlayerDto, @CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.createPlayer(dto, user);
  }

  @Patch('players/:id')
  updatePlayer(@Param('id') id: string, @Body() dto: PlayerDto) {
    return this.adminService.updatePlayer(id, dto);
  }

  @Delete('players/:id')
  deletePlayer(@Param('id') id: string) {
    return this.adminService.deletePlayer(id);
  }

  @Get('venues')
  listVenues(@CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.listVenues(user);
  }

  @Post('venues')
  createVenue(@Body() dto: VenueDto, @CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.createVenue(dto, user);
  }

  @Patch('venues/:id')
  updateVenue(@Param('id') id: string, @Body() dto: VenueDto) {
    return this.adminService.updateVenue(id, dto);
  }

  @Delete('venues/:id')
  deleteVenue(@Param('id') id: string) {
    return this.adminService.deleteVenue(id);
  }

  @Get('fixtures')
  listFixtures(@CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.listFixtures(user);
  }

  @Get('matches')
  listMatches(@CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.listMatches(user);
  }

  @Post('fixtures')
  createFixture(@Body() dto: FixtureDto, @CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.createFixture(dto, user);
  }

  @Patch('fixtures/:id')
  updateFixture(@Param('id') id: string, @Body() dto: FixtureDto) {
    return this.adminService.updateFixture(id, dto);
  }

  @Delete('fixtures/:id')
  deleteFixture(@Param('id') id: string) {
    return this.adminService.deleteFixture(id);
  }

  @Get('matches/:matchId')
  getMatch(@Param('matchId') matchId: string, @CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.getMatch(matchId, user);
  }

  @Post('matches/:matchId/toss')
  updateToss(@Param('matchId') matchId: string, @Body() dto: TossDto, @CurrentAdmin() admin: string) {
    return this.adminService.updateToss(matchId, dto, String(admin));
  }

  @Post('matches/:matchId/xi')
  setXI(@Param('matchId') matchId: string, @Body() dto: PlayingXiDto, @CurrentAdmin() admin: string) {
    return this.adminService.setPlayingXI(matchId, dto, String(admin));
  }

  @Post('matches/:matchId/start-innings')
  startInnings(@Param('matchId') matchId: string, @Body() dto: StartInningsDto, @CurrentAdmin() admin: string) {
    return this.adminService.startInnings(matchId, dto, String(admin));
  }

  @Post('matches/:matchId/score')
  addBall(@Param('matchId') matchId: string, @Body() dto: BallInputDto, @CurrentAdmin() admin: string) {
    return this.adminService.addBall(matchId, dto, String(admin));
  }

  @Post('matches/:matchId/undo')
  undoBall(@Param('matchId') matchId: string, @CurrentAdmin() admin: string) {
    return this.adminService.undoBall(matchId, String(admin));
  }

  @Post('matches/:matchId/edit-last-ball')
  editLastBall(@Param('matchId') matchId: string, @Body() dto: BallInputDto, @CurrentAdmin() admin: string) {
    return this.adminService.editLastBall(matchId, dto, String(admin));
  }

  @Post('matches/:matchId/end-innings')
  endInnings(@Param('matchId') matchId: string, @CurrentAdmin() admin: string) {
    return this.adminService.endInnings(matchId, String(admin));
  }

  @Post('matches/:matchId/interruption')
  setInterruption(@Param('matchId') matchId: string, @Body() dto: InterruptionDto, @CurrentAdmin() admin: string) {
    return this.adminService.setInterruption(matchId, dto, String(admin));
  }

  @Post('matches/:matchId/declare-result')
  declareResult(@Param('matchId') matchId: string, @Body() dto: DeclareResultDto, @CurrentAdmin() admin: string) {
    return this.adminService.declareResult(matchId, dto, String(admin));
  }

  @Post('matches/:matchId/man-of-match')
  manOfMatch(@Param('matchId') matchId: string, @Body() dto: ManOfMatchDto, @CurrentAdmin() admin: string) {
    return this.adminService.setManOfMatch(matchId, dto, String(admin));
  }

  @Get('awards')
  listAwards(@CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.listAwards(user);
  }

  @Post('awards')
  upsertAward(@Body() dto: AwardDto, @CurrentAdmin() admin: string, @CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.upsertAward(dto, String(admin), user);
  }

  @Get('announcements')
  listAnnouncements(@CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.listAnnouncements(user);
  }

  @Post('announcements')
  createAnnouncement(@Body() dto: AnnouncementDto, @CurrentAdmin() admin: string, @CurrentAdminUser() user: RequestAdminUser) {
    return this.adminService.createAnnouncement(dto, String(admin), user);
  }

  @Patch('announcements/:id')
  updateAnnouncement(@Param('id') id: string, @Body() dto: AnnouncementDto, @CurrentAdmin() admin: string) {
    return this.adminService.updateAnnouncement(id, dto, String(admin));
  }

  @Delete('announcements/:id')
  deleteAnnouncement(@Param('id') id: string) {
    return this.adminService.deleteAnnouncement(id);
  }
}
