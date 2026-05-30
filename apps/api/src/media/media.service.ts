import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MediaService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async findAll(search?: string) {
    const where = search
      ? { name: { contains: search, mode: 'insensitive' as const } }
      : {};
    return this.prisma.media.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Mídia não encontrada');
    return media;
  }

  async upload(file: any) {
    // Save file to disk (will migrate to MinIO later)
    const filePath = path.join(this.uploadDir, file.filename);
    
    const media = await this.prisma.media.create({
      data: {
        name: file.originalname.replace(/\.[^/.]+$/, ''),
        fileName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        width: null, // Will be extracted for images
        height: null,
      },
    });

    return media;
  }

  async remove(id: string) {
    const media = await this.findOne(id);
    const filePath = path.join(this.uploadDir, media.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await this.prisma.media.delete({ where: { id } });
    return { message: 'Mídia excluída' };
  }

  getFilePath(fileName: string): string {
    return path.join(this.uploadDir, fileName);
  }
}
