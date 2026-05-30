import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class CampaignService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.campaign.findMany({
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
          include: { layout: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
          include: { layout: true },
        },
      },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    return campaign;
  }

  async create(data: { name: string; description?: string }) {
    return this.prisma.campaign.create({ data });
  }

  async update(id: string, data: { name?: string; description?: string }) {
    await this.findOne(id);
    return this.prisma.campaign.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.campaign.delete({ where: { id } });
    return { message: 'Campanha excluída' };
  }

  // Campaign Items
  async addItem(campaignId: string, data: { layoutId: string; displayOrder: number; duration?: number }) {
    await this.findOne(campaignId);
    return this.prisma.campaignItem.create({
      data: { campaignId, ...data },
      include: { layout: true },
    });
  }

  async updateItem(itemId: string, data: { displayOrder?: number; duration?: number }) {
    const item = await this.prisma.campaignItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item não encontrado');
    return this.prisma.campaignItem.update({
      where: { id: itemId },
      data,
      include: { layout: true },
    });
  }

  async removeItem(itemId: string) {
    const item = await this.prisma.campaignItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item não encontrado');
    await this.prisma.campaignItem.delete({ where: { id: itemId } });
    return { message: 'Item removido da campanha' };
  }
}
