import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import axios from 'axios';
import type { GpsPayload } from '@crewsync/types';
import { WS_EVENTS } from '@crewsync/types';

/** TTL for the live vehicle position in Redis (5 minutes). */
const POSITION_TTL_SECONDS = 300;

@WebSocketGateway({ cors: true, namespace: '/gps' })
export class GpsGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GpsGateway.name);
  private redis!: Redis;
  private readonly notificationUrl =
    process.env.NOTIFICATION_SERVICE_URL ?? 'http://notification-service:3003';

  afterInit() {
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  }

  @SubscribeMessage(WS_EVENTS.GPS_UPDATE)
  async handleGpsUpdate(
    @MessageBody() payload: GpsPayload,
    @ConnectedSocket() _client: Socket,
  ) {
    // 1. Broadcast to manager dashboard (live map animation)
    this.server.emit(WS_EVENTS.GPS_UPDATE, payload);

    // 2. Overwrite the vehicle's live position in Redis
    await this.redis.set(
      `vehicle:position:${payload.vehicleId}`,
      JSON.stringify(payload),
      'EX',
      POSITION_TTL_SECONDS,
    );

    // 3. Forward to notification-service for geofence evaluation
    //    Fire-and-forget — don't block the GPS stream on this call
    axios
      .post(`${this.notificationUrl}/api/geofence/check`, payload)
      .catch((err) =>
        this.logger.warn(`Geofence check failed for ${payload.vehicleId}: ${err.message}`),
      );
  }
}
