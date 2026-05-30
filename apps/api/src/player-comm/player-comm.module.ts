import { Module } from '@nestjs/common';
import { PlayerCommController } from './player-comm.controller';
import { PlayerCommService } from './player-comm.service';
import { ScheduleModule } from '../schedule/schedule.module';
import { PlayerGateway } from '../websocket/player.gateway';

@Module({
  imports: [ScheduleModule],
  controllers: [PlayerCommController],
  providers: [PlayerCommService, PlayerGateway],
  exports: [PlayerCommService],
})
export class PlayerCommModule {}
