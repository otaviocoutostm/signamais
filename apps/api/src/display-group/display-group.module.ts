import { Module } from '@nestjs/common';
import { DisplayGroupController } from './display-group.controller';
import { DisplayGroupService } from './display-group.service';
import { PrismaModule } from '../common/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DisplayGroupController],
  providers: [DisplayGroupService],
  exports: [DisplayGroupService],
})
export class DisplayGroupModule {}
