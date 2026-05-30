import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

interface CreateScheduleDto {
  playerId?: string;
  groupId?: string;
  layoutId?: string;
  campaignId?: string;
  startDate: string;
  endDate?: string;
  dayOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  priority?: number;
  isDefault?: boolean;
}

interface CreateOverlayDto {
  layoutId: string;
  playerId?: string;
  startDate: string;
  endDate?: string;
  dayOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  priority?: number;
}

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { playerId?: string; groupId?: string }) {
    const where: any = {};
    if (filters?.playerId) where.playerId = filters.playerId;
    if (filters?.groupId) where.groupId = filters.groupId;

    return this.prisma.schedule.findMany({
      where,
      include: {
        layout: true,
        campaign: {
          include: {
            items: {
              orderBy: { displayOrder: 'asc' },
              include: { layout: true },
            },
          },
        },
        player: true,
        overlays: {
          include: { layout: true },
        },
      },
      orderBy: [{ isDefault: 'asc' }, { priority: 'desc' }, { startDate: 'desc' }],
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        layout: true,
        campaign: {
          include: {
            items: {
              orderBy: { displayOrder: 'asc' },
              include: { layout: true },
            },
          },
        },
        overlays: { include: { layout: true } },
      },
    });
    if (!schedule) throw new NotFoundException('Agendamento não encontrado');
    return schedule;
  }

  async create(data: CreateScheduleDto) {
    return this.prisma.schedule.create({
      data: {
        playerId: data.playerId || null,
        groupId: data.groupId || null,
        layoutId: data.layoutId || null,
        campaignId: data.campaignId || null,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        dayOfWeek: data.dayOfWeek ? JSON.stringify(data.dayOfWeek) : null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        priority: data.priority || 0,
        isDefault: data.isDefault || false,
      },
      include: {
        layout: true,
        campaign: { include: { items: { include: { layout: true } } } },
      },
    });
  }

  async update(id: string, data: Partial<CreateScheduleDto>) {
    await this.findOne(id);
    return this.prisma.schedule.update({
      where: { id },
      data: {
        ...data,
        dayOfWeek: data.dayOfWeek ? JSON.stringify(data.dayOfWeek) : undefined,
      },
      include: {
        layout: true,
        campaign: { include: { items: { include: { layout: true } } } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.schedule.delete({ where: { id } });
    return { message: 'Agendamento excluído' };
  }

  // Overlay management
  async addOverlay(scheduleId: string, data: CreateOverlayDto) {
    await this.findOne(scheduleId);
    return this.prisma.overlaySchedule.create({
      data: {
        scheduleId,
        layoutId: data.layoutId,
        playerId: data.playerId || null,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        dayOfWeek: data.dayOfWeek ? JSON.stringify(data.dayOfWeek) : null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        priority: data.priority || 0,
      },
      include: { layout: true },
    });
  }

  async removeOverlay(overlayId: string) {
    const overlay = await this.prisma.overlaySchedule.findUnique({ where: { id: overlayId } });
    if (!overlay) throw new NotFoundException('Overlay não encontrado');
    await this.prisma.overlaySchedule.delete({ where: { id: overlayId } });
    return { message: 'Overlay removido' };
  }

  /**
   * Resolve the active layout(s) for a player at this moment
   */
  async getActiveScheduleForPlayer(playerId: string) {
    const now = new Date();
    const dayOfWeek = now.getDay();

    const schedules = await this.prisma.schedule.findMany({
      where: { playerId },
      include: {
        layout: true,
        campaign: {
          include: {
            items: {
              orderBy: { displayOrder: 'asc' },
              include: { layout: true },
            },
          },
        },
        overlays: {
          include: { layout: true },
          orderBy: { priority: 'desc' },
        },
      },
      orderBy: [{ isDefault: 'asc' }, { priority: 'desc' }],
    });

    const groupMemberships = await this.prisma.displayGroupMember.findMany({
      where: { playerId },
      include: { group: { include: { members: true } } },
    });

    const groupIds = groupMemberships.map((m) => m.groupId);
    let groupSchedules: any[] = [];

    if (groupIds.length > 0) {
      groupSchedules = await this.prisma.schedule.findMany({
        where: { groupId: { in: groupIds } },
        include: {
          layout: true,
          campaign: {
            include: {
              items: {
                orderBy: { displayOrder: 'asc' },
                include: { layout: true },
              },
            },
          },
          overlays: {
            include: { layout: true },
            orderBy: { priority: 'desc' },
          },
        },
        orderBy: [{ isDefault: 'asc' }, { priority: 'desc' }],
      });
    }

    const allSchedules = [...schedules, ...groupSchedules];
    const mainSchedule = allSchedules.find((s) => this.isScheduleActive(s, now, dayOfWeek));
    const defaultSchedule = allSchedules.find((s) => s.isDefault && !mainSchedule);
    const active = mainSchedule || defaultSchedule;

    if (!active) return { layout: null, overlays: [], message: 'Nenhum agendamento ativo' };

    let layouts: any[];
    if (active.campaign) {
      layouts = active.campaign.items.map((item: any) => ({
        layoutId: item.layoutId,
        layout: item.layout,
        duration: item.duration || 10,
        isCampaignItem: true,
        campaignId: active.campaignId,
        displayOrder: item.displayOrder,
      }));
    } else if (active.layout) {
      layouts = [{
        layoutId: active.layout.id,
        layout: active.layout,
        duration: null,
        isCampaignItem: false,
      }];
    } else {
      return { layout: null, overlays: [], message: 'Nenhum layout na agenda' };
    }

    const activeOverlays = (active.overlays || []).filter((o: any) =>
      this.isOverlayActive(o, now, dayOfWeek, playerId)
    );

    return {
      scheduleId: active.id,
      layouts,
      overlays: activeOverlays.map((o: any) => ({
        overlayId: o.id,
        layoutId: o.layoutId,
        layout: o.layout,
        priority: o.priority,
      })),
      isDefault: active.isDefault || false,
    };
  }

  private isScheduleActive(schedule: any, now: Date, dayOfWeek: number): boolean {
    if (schedule.isDefault) return false;
    if (schedule.startDate && new Date(schedule.startDate) > now) return false;
    if (schedule.endDate && new Date(schedule.endDate) < now) return false;

    if (schedule.dayOfWeek) {
      const days: number[] = typeof schedule.dayOfWeek === 'string'
        ? JSON.parse(schedule.dayOfWeek)
        : schedule.dayOfWeek;
      if (!days.includes(dayOfWeek)) return false;
    }

    if (schedule.startTime && schedule.endTime) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const startParts = schedule.startTime.split(':');
      const endParts = schedule.endTime.split(':');
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      if (nowMinutes < startMinutes || nowMinutes > endMinutes) return false;
    }

    return true;
  }

  private isOverlayActive(overlay: any, now: Date, dayOfWeek: number, playerId: string): boolean {
    if (overlay.startDate && new Date(overlay.startDate) > now) return false;
    if (overlay.endDate && new Date(overlay.endDate) < now) return false;
    if (overlay.playerId && overlay.playerId !== playerId) return false;

    if (overlay.dayOfWeek) {
      const days: number[] = typeof overlay.dayOfWeek === 'string'
        ? JSON.parse(overlay.dayOfWeek)
        : overlay.dayOfWeek;
      if (!days.includes(dayOfWeek)) return false;
    }

    if (overlay.startTime && overlay.endTime) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const startParts = overlay.startTime.split(':');
      const endParts = overlay.endTime.split(':');
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      if (nowMinutes < startMinutes || nowMinutes > endMinutes) return false;
    }

    return true;
  }
}
