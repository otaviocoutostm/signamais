import { Module } from '@nestjs/common';
import { PlayerGateway } from './player.gateway';

@Module({
  providers: [PlayerGateway],
})
export class WebSocketModule {}
