import { Controller, Post, Get, Body, Param, Headers } from '@nestjs/common';
import { PlayerCommService } from './player-comm.service';

@Controller('player')
export class PlayerCommController {
  constructor(private commService: PlayerCommService) {}

  private getPlayerId(headers: any): string {
    return headers['x-player-id'] || '';
  }

  @Post('register')
  async register(@Headers() headers) {
    const playerId = this.getPlayerId(headers);
    if (!playerId) return { success: false, message: 'x-player-id header required' };
    return this.commService.register(playerId);
  }

  @Get('schedule')
  async getSchedule(@Headers() headers) {
    const playerId = this.getPlayerId(headers);
    if (!playerId) return { layout: null, message: 'x-player-id header required' };
    return this.commService.getSchedule(playerId);
  }

  @Get('required-files')
  async getRequiredFiles(@Headers() headers) {
    const playerId = this.getPlayerId(headers);
    if (!playerId) return { files: [] };
    return this.commService.getRequiredFiles(playerId);
  }

  @Post('status')
  async submitStatus(@Headers() headers, @Body() body: any) {
    const playerId = this.getPlayerId(headers);
    return this.commService.submitStatus(playerId, body.status, body);
  }

  @Post('stats')
  async submitStats(@Headers() headers, @Body() body: any) {
    const playerId = this.getPlayerId(headers);
    return this.commService.submitStats(playerId, body.stats || []);
  }

  @Post('logs')
  async submitLogs(@Headers() headers, @Body() body: any) {
    const playerId = this.getPlayerId(headers);
    return this.commService.submitLogs(playerId, body.logs || []);
  }
}
