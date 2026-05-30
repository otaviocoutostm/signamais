import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DisplayGroupService } from './display-group.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('display-groups')
@UseGuards(JwtAuthGuard)
export class DisplayGroupController {
  constructor(private displayGroupService: DisplayGroupService) {}

  @Get()
  async findAll() {
    return this.displayGroupService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.displayGroupService.findOne(id);
  }

  @Post()
  async create(@Body() body: { name: string; description?: string }) {
    return this.displayGroupService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.displayGroupService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.displayGroupService.remove(id);
  }

  // Members
  @Post(':id/members')
  async addMember(@Param('id') id: string, @Body() body: { playerId: string }) {
    return this.displayGroupService.addMember(id, body.playerId);
  }

  @Delete(':id/members/:playerId')
  async removeMember(@Param('id') id: string, @Param('playerId') playerId: string) {
    return this.displayGroupService.removeMember(id, playerId);
  }
}
