import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private scheduleService: ScheduleService) {}

  @Get()
  async findAll(@Query('playerId') playerId?: string, @Query('groupId') groupId?: string) {
    return this.scheduleService.findAll({ playerId, groupId });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(id);
  }

  @Post()
  async create(@Body() body: any) {
    return this.scheduleService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.scheduleService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.scheduleService.remove(id);
  }

  // Overlays
  @Post(':id/overlays')
  async addOverlay(@Param('id') id: string, @Body() body: any) {
    return this.scheduleService.addOverlay(id, body);
  }

  @Delete('overlays/:overlayId')
  async removeOverlay(@Param('overlayId') overlayId: string) {
    return this.scheduleService.removeOverlay(overlayId);
  }
}
