import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class PlayerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private adminSockets = new Map<string, string>();
  private playerSockets = new Map<string, string>();

  handleConnection(client: Socket) {
    const playerId = client.handshake.query.playerId as string;
    if (playerId) {
      if (playerId.startsWith('admin-')) {
        this.adminSockets.set(playerId, client.id);
      } else {
        this.playerSockets.set(playerId, client.id);
      }
    }
  }

  handleDisconnect(client: Socket) {
    for (const [key, socketId] of this.adminSockets.entries()) {
      if (socketId === client.id) { this.adminSockets.delete(key); break; }
    }
    for (const [key, socketId] of this.playerSockets.entries()) {
      if (socketId === client.id) { this.playerSockets.delete(key); break; }
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  @SubscribeMessage('command')
  handleCommand(client: Socket, payload: { playerId: string; command: string; data?: any }) {
    const socketId = this.playerSockets.get(payload.playerId);
    if (socketId) {
      this.server.to(socketId).emit('command', { command: payload.command, data: payload.data });
    }
  }

  broadcastStatus(playerId: string, status: string) {
    this.server.emit('player:status', { playerId, status });
  }

  sendCommand(playerId: string, command: string, data?: any) {
    const socketId = this.playerSockets.get(playerId);
    if (socketId) {
      this.server.to(socketId).emit('command', { command, data });
      return true;
    }
    return false;
  }

  notifyScheduleUpdate(playerId: string) {
    return this.sendCommand(playerId, 'schedule_update');
  }

  requestScreenshot(playerId: string) {
    return this.sendCommand(playerId, 'screenshot');
  }
}
