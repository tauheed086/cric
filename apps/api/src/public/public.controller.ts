import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicService } from './public.service.js';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('home')
  home() {
    return this.publicService.homeDashboard();
  }

  @Get('fixtures')
  fixtures(@Query('status') status?: string, @Query('date') date?: string) {
    return this.publicService.fixtures(status, date);
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
  results() {
    return this.publicService.results();
  }

  @Get('points-table')
  pointsTable() {
    return this.publicService.pointsTable();
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
  leaderboards() {
    return this.publicService.leaderboards();
  }

  @Get('awards')
  awards() {
    return this.publicService.awards();
  }

  @Get('announcements')
  announcements() {
    return this.publicService.announcements();
  }

  @Get('search')
  search(@Query('q') q = '') {
    return this.publicService.search(q);
  }
}
