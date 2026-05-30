import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class DisplayGroupService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.displayGroup.findMany({
      include: {
        members: {
          include: { player: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.displayGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: { player: true },
        },
      },
    });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    return group;
  }

  async create(data: { name: string; description?: string }) {
    return this.prisma.displayGroup.create({ data });
  }

  async update(id: string, data: { name?: string; description?: string }) {
    await this.findOne(id);
    return this.prisma.displayGroup.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.displayGroup.delete({ where: { id } });
    return { message: 'Grupo excluído' };
  }

  // Members
  async addMember(groupId: string, playerId: string) {
    await this.findOne(groupId);
    return this.prisma.displayGroupMember.create({
      data: { groupId, playerId },
      include: { player: true },
    });
  }

  async removeMember(groupId: string, playerId: string) {
    const member = await this.prisma.displayGroupMember.findUnique({
      where: { groupId_playerId: { groupId, playerId } },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');
    await this.prisma.displayGroupMember.delete({
      where: { groupId_playerId: { groupId, playerId } },
    });
    return { message: 'Membro removido do grupo' };
  }
}
