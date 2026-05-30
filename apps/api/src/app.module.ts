import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MediaModule } from './media/media.module';
import { LayoutModule } from './layout/layout.module';
import { ScheduleModule } from './schedule/schedule.module';
import { PlayerModule } from './player/player.module';
import { PlayerCommModule } from './player-comm/player-comm.module';
import { WebSocketModule } from './websocket/websocket.module';
import { CampaignModule } from './campaign/campaign.module';
import { DisplayGroupModule } from './display-group/display-group.module';
import { QueueModule } from './queue/queue.module';
import { SeedService } from './seed.service';

@Module({
  providers: [SeedService],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MediaModule,
    LayoutModule,
    ScheduleModule,
    PlayerModule,
    PlayerCommModule,
    WebSocketModule,
    CampaignModule,
    DisplayGroupModule,
    QueueModule,
  ],
})
export class AppModule {}
