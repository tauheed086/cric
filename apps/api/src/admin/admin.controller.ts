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
import { CurrentAdmin } from '../common/current-admin.js';
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
  dashboard() {
    return this.adminService.getDashboard();
  }

  @Post('tournament')
  upsertTournament(
    @Body() body: { tournament: UpsertTournamentDto; settings?: UpdateSettingsDto },
    @CurrentAdmin() admin: string,
  ) {
    return this.adminService.upsertTournament(body.tournament, body.settings ?? null, String(admin));
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(dto);
  }

  @Post('recompute')
  recompute() {
    return this.adminService.forceRecompute();
  }

  @Get('teams')
  listTeams() {
    return this.adminService.listTeams();
  }

  @Post('teams')
  createTeam(@Body() dto: TeamDto) {
    return this.adminService.createTeam(dto);
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
  listPlayers() {
    return this.adminService.listPlayers();
  }

  @Post('players')
  createPlayer(@Body() dto: PlayerDto) {
    return this.adminService.createPlayer(dto);
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
  listVenues() {
    return this.adminService.listVenues();
  }

  @Post('venues')
  createVenue(@Body() dto: VenueDto) {
    return this.adminService.createVenue(dto);
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
  listFixtures() {
    return this.adminService.listFixtures();
  }

  @Get('matches')
  listMatches() {
    return this.adminService.listMatches();
  }

  @Post('fixtures')
  createFixture(@Body() dto: FixtureDto) {
    return this.adminService.createFixture(dto);
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
  getMatch(@Param('matchId') matchId: string) {
    return this.adminService.getMatch(matchId);
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
  listAwards() {
    return this.adminService.listAwards();
  }

  @Post('awards')
  upsertAward(@Body() dto: AwardDto, @CurrentAdmin() admin: string) {
    return this.adminService.upsertAward(dto, String(admin));
  }

  @Get('announcements')
  listAnnouncements() {
    return this.adminService.listAnnouncements();
  }

  @Post('announcements')
  createAnnouncement(@Body() dto: AnnouncementDto, @CurrentAdmin() admin: string) {
    return this.adminService.createAnnouncement(dto, String(admin));
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
