import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicService } from './public.service.js';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('tournaments')
  tournaments() {
    return this.publicService.listTournaments();
  }

  @Get('home')
  home(@Query('tournamentId') tournamentId?: string) {
    return this.publicService.homeDashboard(tournamentId);
  }

  @Get('fixtures')
  fixtures(
    @Query('status') status?: string,
    @Query('date') date?: string,
    @Query('tournamentId') tournamentId?: string,
  ) {
    return this.publicService.fixtures(status, date, tournamentId);
  }

  @Get('matches/:matchId/overview')
  matchOverview(@Param('matchId') matchId: string) {
    return this.publicService.matchOverview(matchId);
  }

  @Get('matches/:matchId/scorecard')
  matchScorecard(@Param('matchId') matchId: string) {
    return this.publicService.matchScorecard(matchId);
  }

  @Get('matches/:matchId/commentary')
  matchCommentary(@Param('matchId') matchId: string) {
    return this.publicService.matchCommentary(matchId);
  }

  @Get('matches/:matchId/squads')
  matchSquads(@Param('matchId') matchId: string) {
    return this.publicService.matchSquads(matchId);
  }

  @Get('matches/:matchId/stats')
  matchStats(@Param('matchId') matchId: string) {
    return this.publicService.matchStats(matchId);
  }

  @Get('results')
  results(@Query('tournamentId') tournamentId?: string) {
    return this.publicService.results(tournamentId);
  }

  @Get('points-table')
  pointsTable(@Query('tournamentId') tournamentId?: string) {
    return this.publicService.pointsTable(tournamentId);
  }

  @Get('teams/:teamId')
  teamPage(@Param('teamId') teamId: string) {
    return this.publicService.teamPage(teamId);
  }

  @Get('players/:playerId')
  playerPage(@Param('playerId') playerId: string) {
    return this.publicService.playerPage(playerId);
  }

  @Get('leaderboards')
  leaderboards(@Query('tournamentId') tournamentId?: string) {
    return this.publicService.leaderboards(tournamentId);
  }

  @Get('awards')
  awards(@Query('tournamentId') tournamentId?: string) {
    return this.publicService.awards(tournamentId);
  }

  @Get('announcements')
  announcements(@Query('tournamentId') tournamentId?: string) {
    return this.publicService.announcements(tournamentId);
  }

  @Get('search')
  search(@Query('q') q = '', @Query('tournamentId') tournamentId?: string) {
    return this.publicService.search(q, tournamentId);
  }
}
