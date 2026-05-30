import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from './common/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    await this.seedAdminUser();
    await this.seedQueueDefaults();
  }

  private async seedAdminUser() {
    const hash = await bcrypt.hash('123456', 10);
    
    // Upsert: always ensure admin exists with correct password
    await this.prisma.user.upsert({
      where: { email: 'admin@signamais.com' },
      update: { password: hash },
      create: {
        name: 'Admin',
        email: 'admin@signamais.com',
        password: hash,
        role: 'admin',
      },
    });
    
    // Also recreate the test user
    await this.prisma.user.upsert({
      where: { email: 'teste@teste.com' },
      update: { password: hash },
      create: {
        name: 'Teste',
        email: 'teste@teste.com',
        password: hash,
        role: 'admin',
      },
    });
    
    this.logger.log('✅ Usuários seedados: admin@signamais.com / 123456');
  }

  private async seedQueueDefaults() {
    const serviceCount = await this.prisma.queueService.count();
    if (serviceCount === 0) {
      await this.prisma.queueService.create({
        data: {
          name: 'Convencional',
          prefix: 'N',
          color: '#0055FF',
          priority: 0,
        },
      });
      await this.prisma.queueService.create({
        data: {
          name: 'Prioritário',
          prefix: 'P',
          color: '#FF0044',
          priority: 10,
        },
      });

      await this.prisma.queueDesk.create({
        data: { name: 'Guichê 1', number: 1 },
      });
      await this.prisma.queueDesk.create({
        data: { name: 'Guichê 2', number: 2 },
      });

      this.logger.log('✅ Serviços e guichês padrão criados');
    }
  }
}
