import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class LayoutService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.layout.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const layout = await this.prisma.layout.findUnique({ where: { id } });
    if (!layout) throw new NotFoundException('Layout não encontrado');
    return layout;
  }

  async create(data: { name: string; width?: number; height?: number; backgroundColor?: string; regions?: any }) {
    return this.prisma.layout.create({
      data: {
        name: data.name,
        width: data.width || 1920,
        height: data.height || 1080,
        backgroundColor: data.backgroundColor || '#000000',
        regions: JSON.stringify(data.regions || []),
      },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.layout.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.layout.delete({ where: { id } });
    return { message: 'Layout excluído' };
  }
}
