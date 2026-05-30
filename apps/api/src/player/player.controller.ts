import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { PlayerService } from './player.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('players')
export class PlayerController {
  constructor(private playerService: PlayerService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.playerService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.playerService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create() {
    return this.playerService.create();
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.playerService.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.playerService.remove(id);
  }
}
