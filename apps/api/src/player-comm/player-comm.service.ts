import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ScheduleService } from '../schedule/schedule.service';
import { PlayerGateway } from '../websocket/player.gateway';

// Resolve region media IDs
function extractMediaIds(layout: any): string[] {
  if (!layout) return [];
  const regions: any[] = (typeof layout.regions === 'string'
    ? JSON.parse(layout.regions)
    : layout.regions || []) as any[];
  return regions
    .filter((r) => r.type === 'media' && r.mediaId)
    .map((r) => r.mediaId)
    .filter(Boolean);
}

@Injectable()
export class PlayerCommService {
  constructor(
    private prisma: PrismaService,
    private scheduleService: ScheduleService,
    private playerGateway: PlayerGateway,
  ) {}

  async register(playerId: string) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return { success: false, message: 'Player não encontrado' };

    await this.prisma.player.update({
      where: { id: playerId },
      data: { lastSeenAt: new Date(), status: 'online' },
    });

    this.playerGateway.broadcastStatus(playerId, 'online');

    return { success: true, playerId: player.id, name: player.name };
  }

  async getSchedule(playerId: string) {
    const result = await this.scheduleService.getActiveScheduleForPlayer(playerId);

    if (!result.layouts || result.layouts.length === 0) {
      return { layouts: [], overlays: [], message: 'Nenhum agendamento ativo' };
    }

    return {
      scheduleId: result.scheduleId,
      layouts: result.layouts,
      overlays: result.overlays || [],
      isDefault: result.isDefault || false,
    };
  }

  async getRequiredFiles(playerId: string) {
    const result = await this.scheduleService.getActiveScheduleForPlayer(playerId);
    if (!result.layouts?.length) return { files: [] };

    const mediaIds: string[] = [];
    for (const item of result.layouts) {
      const ids = extractMediaIds(item.layout);
      mediaIds.push(...ids);
    }
    // Overlay layouts
    for (const overlay of result.overlays || []) {
      const ids = extractMediaIds(overlay.layout);
      mediaIds.push(...ids);
    }

    const files = await this.prisma.media.findMany({
      where: { id: { in: [...new Set(mediaIds)] } },
    });

    return { files, playerId };
  }

  async submitStatus(playerId: string, status: string, meta?: any) {
    await this.prisma.player.update({
      where: { id: playerId },
      data: {
        status,
        lastSeenAt: new Date(),
        ...(meta?.version ? { version: meta.version } : {}),
        ...(meta?.os ? { os: meta.os } : {}),
      },
    });

    this.playerGateway.broadcastStatus(playerId, status);

    return { success: true };
  }

  async submitStats(playerId: string, stats: any[]) {
    if (!stats?.length) return { success: true };

    await this.prisma.proofOfPlay.createMany({
      data: stats.map((s) => ({
        playerId,
        layoutId: s.layoutId,
        mediaId: s.mediaId,
        startedAt: new Date(s.startedAt),
        endedAt: s.endedAt ? new Date(s.endedAt) : null,
        duration: s.duration,
      })),
    });
    return { success: true };
  }

  async submitLogs(playerId: string, logs: any[]) {
    if (!logs?.length) return { success: true };

    await this.prisma.playerLog.createMany({
      data: logs.map((l) => ({
        playerId,
        level: l.level || 'info',
        message: l.message,
      })),
    });
    return { success: true };
  }
}
