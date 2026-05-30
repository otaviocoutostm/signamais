import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class QueueService {
  constructor(private prisma: PrismaService) {}

  // ===== Services (Types) =====
  async findAllServices() {
    return this.prisma.queueService.findMany({ orderBy: { priority: 'desc' } });
  }

  async findService(id: string) {
    const s = await this.prisma.queueService.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Serviço não encontrado');
    return s;
  }

  async createService(data: { name: string; prefix: string; description?: string; color?: string; priority?: number }) {
    return this.prisma.queueService.create({ data });
  }

  async updateService(id: string, data: any) {
    await this.findService(id);
    return this.prisma.queueService.update({ where: { id }, data });
  }

  async removeService(id: string) {
    await this.findService(id);
    await this.prisma.queueService.delete({ where: { id } });
    return { message: 'Serviço removido' };
  }

  // ===== Desks =====
  async findAllDesks() {
    return this.prisma.queueDesk.findMany({
      orderBy: { number: 'asc' },
      include: {
        tickets: { where: { status: { in: ['called', 'in_progress'] } }, take: 1 },
      },
    });
  }

  async findDesk(id: string) {
    const d = await this.prisma.queueDesk.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Guichê não encontrado');
    return d;
  }

  async createDesk(data: { name: string; number: number; location?: string }) {
    return this.prisma.queueDesk.create({ data });
  }

  async updateDesk(id: string, data: any) {
    await this.findDesk(id);
    return this.prisma.queueDesk.update({ where: { id }, data });
  }

  async removeDesk(id: string) {
    await this.findDesk(id);
    await this.prisma.queueDesk.delete({ where: { id } });
    return { message: 'Guichê removido' };
  }

  async toggleDeskPause(id: string) {
    const desk = await this.findDesk(id);
    return this.prisma.queueDesk.update({
      where: { id },
      data: { isPaused: !desk.isPaused },
    });
  }

  // ===== Tickets =====
  async issueTicket(serviceId: string) {
    const service = await this.findService(serviceId);
    if (!service.isActive) throw new BadRequestException('Serviço inativo');

    // Get next number for this service
    const lastTicket = await this.prisma.queueTicket.findFirst({
      where: { serviceId },
      orderBy: { number: 'desc' },
    });

    const nextNumber = (lastTicket?.number || 0) + 1;
    const displayNumber = `${service.prefix}${String(nextNumber).padStart(3, '0')}`;

    const ticket = await this.prisma.queueTicket.create({
      data: {
        serviceId,
        number: nextNumber,
        displayNumber,
      },
      include: { service: true },
    });

    return ticket;
  }

  async callNextTicket(deskId: string) {
    const desk = await this.findDesk(deskId);
    if (!desk.isActive) throw new BadRequestException('Guichê inativo');
    if (desk.isPaused) throw new BadRequestException('Guichê pausado');

    // Find desk's current in-progress ticket
    const currentTicket = await this.prisma.queueTicket.findFirst({
      where: { deskId, status: { in: ['called', 'in_progress'] } },
    });
    if (currentTicket) throw new BadRequestException('Guichê já possui um atendimento em andamento');

    // Get all active services ordered by priority
    const services = await this.prisma.queueService.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });

    // Find the next waiting ticket (by priority, then FIFO)
    for (const service of services) {
      const ticket = await this.prisma.queueTicket.findFirst({
        where: { serviceId: service.id, status: 'waiting' },
        orderBy: { issuedAt: 'asc' },
        include: { service: true },
      });
      if (ticket) {
        const updated = await this.prisma.queueTicket.update({
          where: { id: ticket.id },
          data: { status: 'called', deskId, calledAt: new Date() },
          include: { service: true },
        });

        // Log the call
        await this.prisma.queueCall.create({
          data: { ticketId: ticket.id, deskId, action: 'call' },
        });

        return updated;
      }
    }

    throw new NotFoundException('Nenhuma senha aguardando');
  }

  async recallTicket(ticketId: string) {
    const ticket = await this.findTicket(ticketId);
    if (ticket.status !== 'called') throw new BadRequestException('Senha não está em chamada');

    await this.prisma.queueCall.create({
      data: { ticketId, deskId: ticket.deskId!, action: 'recall' },
    });

    return { message: 'Rechamada enviada', ticket };
  }

  async finishTicket(ticketId: string) {
    const ticket = await this.findTicket(ticketId);
    if (ticket.status !== 'called' && ticket.status !== 'in_progress') {
      throw new BadRequestException('Senha não está em atendimento');
    }

    const updated = await this.prisma.queueTicket.update({
      where: { id: ticketId },
      data: { status: 'finished', finishedAt: new Date() },
      include: { service: true },
    });

    await this.prisma.queueCall.create({
      data: { ticketId, deskId: ticket.deskId!, action: 'finish' },
    });

    return updated;
  }

  async noShowTicket(ticketId: string) {
    const ticket = await this.findTicket(ticketId);
    if (ticket.status !== 'called') throw new BadRequestException('Senha não está em chamada');

    const updated = await this.prisma.queueTicket.update({
      where: { id: ticketId },
      data: { status: 'no_show', finishedAt: new Date() },
      include: { service: true },
    });

    await this.prisma.queueCall.create({
      data: { ticketId, deskId: ticket.deskId!, action: 'no_show' },
    });

    return updated;
  }

  async transferTicket(ticketId: string, targetDeskId: string) {
    const ticket = await this.findTicket(ticketId);
    if (ticket.status !== 'called' && ticket.status !== 'in_progress') {
      throw new BadRequestException('Senha não está em atendimento');
    }

    // Return ticket to waiting queue and assign to new desk
    const updated = await this.prisma.queueTicket.update({
      where: { id: ticketId },
      data: { status: 'waiting', deskId: null, calledAt: null },
      include: { service: true },
    });

    await this.prisma.queueCall.create({
      data: { ticketId, deskId: ticket.deskId!, action: 'transfer' },
    });

    return updated;
  }

  async findTicket(id: string) {
    const t = await this.prisma.queueTicket.findUnique({
      where: { id },
      include: { service: true, desk: true, calls: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    if (!t) throw new NotFoundException('Senha não encontrada');
    return t;
  }

  // ===== Queue Status =====
  async getQueueStatus() {
    const services = await this.prisma.queueService.findMany({ where: { isActive: true } });
    const waiting = await this.prisma.queueTicket.count({ where: { status: 'waiting' } });
    const called = await this.prisma.queueTicket.count({ where: { status: 'called' } });
    const inProgress = await this.prisma.queueTicket.count({ where: { status: 'in_progress' } });
    const finishedToday = await this.prisma.queueTicket.count({
      where: { finishedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    });

    const serviceStatus = await Promise.all(
      services.map(async (s) => ({
        service: s,
        waiting: await this.prisma.queueTicket.count({ where: { serviceId: s.id, status: 'waiting' } }),
        nextTicket: await this.prisma.queueTicket.findFirst({
          where: { serviceId: s.id, status: 'waiting' },
          orderBy: { issuedAt: 'asc' },
        }),
      })),
    );

    return { waiting, called, inProgress, finishedToday, services: serviceStatus };
  }

  async getQueueForDisplay() {
    // Current call
    const currentCalls = await this.prisma.queueTicket.findMany({
      where: { status: { in: ['called', 'in_progress'] } },
      include: { service: true, desk: true },
      orderBy: { calledAt: 'desc' },
    });

    // Waiting count
    const waitingCount = await this.prisma.queueTicket.count({ where: { status: 'waiting' } });

    // Recent history (last 10)
    const recentCalls = await this.prisma.queueCall.findMany({
      where: { action: 'call' },
      include: { ticket: { include: { service: true } }, desk: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return { currentCalls, waitingCount, recentCalls };
  }

  async getHistory(limit = 50) {
    return this.prisma.queueTicket.findMany({
      where: { status: { not: 'waiting' } },
      include: { service: true, desk: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTickets = await this.prisma.queueTicket.findMany({
      where: { issuedAt: { gte: today } },
      include: { service: true },
      orderBy: { issuedAt: 'desc' },
    });

    const total = todayTickets.length;
    const finished = todayTickets.filter((t) => t.status === 'finished').length;
    const noShow = todayTickets.filter((t) => t.status === 'no_show').length;

    // Average wait time (in minutes)
    const withWaitTime = todayTickets
      .filter((t) => t.calledAt && t.issuedAt)
      .map((t) => (t.calledAt!.getTime() - t.issuedAt.getTime()) / 60000);

    const avgWaitTime = withWaitTime.length > 0
      ? Math.round(withWaitTime.reduce((a, b) => a + b, 0) / withWaitTime.length)
      : 0;

    // By service
    const serviceStats = await this.prisma.queueService.findMany({
      where: { isActive: true },
      include: {
        tickets: {
          where: { issuedAt: { gte: today } },
        },
      },
    });

    return { total, finished, noShow, avgWaitTime, serviceStats };
  }
}
