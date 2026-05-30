import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignController {
  constructor(private campaignService: CampaignService) {}

  @Get()
  async findAll() {
    return this.campaignService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.campaignService.findOne(id);
  }

  @Post()
  async create(@Body() body: { name: string; description?: string }) {
    return this.campaignService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.campaignService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.campaignService.remove(id);
  }

  // Campaign Items
  @Post(':id/items')
  async addItem(@Param('id') id: string, @Body() body: { layoutId: string; displayOrder: number; duration?: number }) {
    return this.campaignService.addItem(id, body);
  }

  @Put('items/:itemId')
  async updateItem(@Param('itemId') itemId: string, @Body() body: { displayOrder?: number; duration?: number }) {
    return this.campaignService.updateItem(itemId, body);
  }

  @Delete('items/:itemId')
  async removeItem(@Param('itemId') itemId: string) {
    return this.campaignService.removeItem(itemId);
  }
}
