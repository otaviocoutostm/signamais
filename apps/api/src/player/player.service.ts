import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PlayerService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.player.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) throw new NotFoundException('Player não encontrado');
    return player;
  }

  async generatePairingCode() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    return code;
  }

  async register(name: string, pairingCode: string) {
    const player = await this.prisma.player.findFirst({
      where: { pairingCode, pairedAt: null },
    });
    if (!player) throw new NotFoundException('Código de pareamento inválido');

    return this.prisma.player.update({
      where: { id: player.id },
      data: { name, pairedAt: new Date(), pairingCode: null },
    });
  }

  async create() {
    const pairingCode = await this.generatePairingCode();
    return this.prisma.player.create({
      data: {
        name: `Player ${pairingCode}`,
        pairingCode,
      },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.player.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.player.delete({ where: { id } });
    return { message: 'Player removido' };
  }

  async updateStatus(id: string, status: string, meta?: any) {
    return this.prisma.player.update({
      where: { id },
      data: {
        status,
        lastSeenAt: new Date(),
        ...meta,
      },
    });
  }
}
