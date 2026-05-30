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
  namespace: '/queue',
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private displayClients = new Set<string>();
  private deskClients = new Map<string, string>(); // deskId -> socketId
  private adminClients = new Set<string>();

  handleConnection(client: Socket) {
    const type = client.handshake.query.type as string;
    const deskId = client.handshake.query.deskId as string;

    if (type === 'display') {
      this.displayClients.add(client.id);
      client.join('queue:display');
    } else if (type === 'desk' && deskId) {
      this.deskClients.set(deskId, client.id);
      client.join(`queue:desk:${deskId}`);
    } else if (type === 'admin') {
      this.adminClients.add(client.id);
      client.join('queue:admin');
    }
  }

  handleDisconnect(client: Socket) {
    this.displayClients.delete(client.id);
    this.adminClients.delete(client.id);

    for (const [deskId, socketId] of this.deskClients.entries()) {
      if (socketId === client.id) {
        this.deskClients.delete(deskId);
        break;
      }
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong', { ok: true });
  }

  /**
   * Broadcast queue update to all connected clients
   */
  broadcastQueueUpdate() {
    this.server.emit('queue:update', { timestamp: new Date().toISOString() });
  }

  /**
   * Send a specific call to display screens
   */
  broadcastCall(data: { ticket: any; desk: any; action: string }) {
    this.server.to('queue:display').emit('queue:call', data);
    this.server.to('queue:admin').emit('queue:call', data);
  }

  /**
   * Send notification to specific desk
   */
  sendToDesk(deskId: string, event: string, data: any) {
    this.server.to(`queue:desk:${deskId}`).emit(event, data);
  }
}
