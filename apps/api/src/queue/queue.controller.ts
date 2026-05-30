import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QueueGateway } from './queue.gateway';

@Controller('queue')
export class QueueController {
  constructor(
    private queueService: QueueService,
    private queueGateway: QueueGateway,
  ) {}

  // ===== Admin: Services =====
  @Get('services')
  async findAllServices() {
    return this.queueService.findAllServices();
  }

  @Get('services/:id')
  async findService(@Param('id') id: string) {
    return this.queueService.findService(id);
  }

  @Post('services')
  async createService(@Body() body: any) {
    return this.queueService.createService(body);
  }

  @Put('services/:id')
  async updateService(@Param('id') id: string, @Body() body: any) {
    return this.queueService.updateService(id, body);
  }

  @Delete('services/:id')
  async removeService(@Param('id') id: string) {
    return this.queueService.removeService(id);
  }

  // ===== Admin: Desks =====
  @Get('desks')
  async findAllDesks() {
    return this.queueService.findAllDesks();
  }

  @Get('desks/:id')
  async findDesk(@Param('id') id: string) {
    return this.queueService.findDesk(id);
  }

  @Post('desks')
  async createDesk(@Body() body: any) {
    return this.queueService.createDesk(body);
  }

  @Put('desks/:id')
  async updateDesk(@Param('id') id: string, @Body() body: any) {
    return this.queueService.updateDesk(id, body);
  }

  @Delete('desks/:id')
  async removeDesk(@Param('id') id: string) {
    return this.queueService.removeDesk(id);
  }

  @Post('desks/:id/pause')
  async togglePause(@Param('id') id: string) {
    return this.queueService.toggleDeskPause(id);
  }

  // ===== Public/Agent: Tickets =====
  @Post('ticket/issue')
  async issueTicket(@Body() body: { serviceId: string }) {
    const ticket = await this.queueService.issueTicket(body.serviceId);
    this.queueGateway.broadcastQueueUpdate();
    return ticket;
  }

  @Get('ticket/:id')
  async findTicket(@Param('id') id: string) {
    return this.queueService.findTicket(id);
  }

  // ===== Agent: Call Actions =====
  @Post('call/next')
  async callNext(@Body() body: { deskId: string }) {
    const ticket = await this.queueService.callNextTicket(body.deskId);
    this.queueGateway.broadcastQueueUpdate();
    return ticket;
  }

  @Post('call/recall')
  async recall(@Body() body: { ticketId: string }) {
    const result = await this.queueService.recallTicket(body.ticketId);
    this.queueGateway.broadcastQueueUpdate();
    return result;
  }

  @Post(':id/finish')
  async finish(@Param('id') id: string) {
    const result = await this.queueService.finishTicket(id);
    this.queueGateway.broadcastQueueUpdate();
    return result;
  }

  @Post(':id/no-show')
  async noShow(@Param('id') id: string) {
    const result = await this.queueService.noShowTicket(id);
    this.queueGateway.broadcastQueueUpdate();
    return result;
  }

  @Post(':id/transfer')
  async transfer(@Param('id') id: string, @Body() body: { targetDeskId: string }) {
    const result = await this.queueService.transferTicket(id, body.targetDeskId);
    this.queueGateway.broadcastQueueUpdate();
    return result;
  }

  // ===== Display & Status =====
  @Get('status')
  async getStatus() {
    return this.queueService.getQueueStatus();
  }

  @Get('display')
  async getForDisplay() {
    return this.queueService.getQueueForDisplay();
  }

  @Get('history')
  async getHistory(@Query('limit') limit?: string) {
    return this.queueService.getHistory(limit ? parseInt(limit) : 50);
  }

  @Get('stats')
  async getStats() {
    return this.queueService.getStats();
  }
}
