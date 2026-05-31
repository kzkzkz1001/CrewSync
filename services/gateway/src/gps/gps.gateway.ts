import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { GpsPayload } from '@crewsync/types';
import { WS_EVENTS } from '@crewsync/types';

@WebSocketGateway({ cors: true, namespace: '/gps' })
export class GpsGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage(WS_EVENTS.GPS_UPDATE)
  async handleGpsUpdate(
    @MessageBody() payload: GpsPayload,
    @ConnectedSocket() client: Socket,
  ) {
    // TODO: write to Redis + forward to notification-service
    console.log(`GPS update from vehicle ${payload.vehicleId}:`, payload);
    this.server.emit(WS_EVENTS.GPS_UPDATE, payload);
  }
}
