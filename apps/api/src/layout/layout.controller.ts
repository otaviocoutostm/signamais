import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { LayoutService } from './layout.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('layouts')
@UseGuards(JwtAuthGuard)
export class LayoutController {
  constructor(private layoutService: LayoutService) {}

  @Get()
  async findAll() {
    return this.layoutService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.layoutService.findOne(id);
  }

  @Post()
  async create(@Body() body: { name: string; width?: number; height?: number; backgroundColor?: string }) {
    return this.layoutService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.layoutService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.layoutService.remove(id);
  }
}
