import { Injectable, Logger } from '@nestjs/common';
import { FcmService } from '../fcm/fcm.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import type { GpsPayload } from '@crewsync/types';

const GEOFENCE_RADIUS_METERS = 1000;
/** How long to suppress repeat alerts for the same vehicle+node pair (30 min). */
const ALERT_DEDUP_TTL_SECONDS = 30 * 60;

interface NearbyStaff {
  nodeId: string;
  nodeAddress: string;
  estimatedAt: Date;
  userId: string;
  fcmToken: string;
  distanceMeters: number;
}

@Injectable()
export class GeofenceService {
  private readonly logger = new Logger(GeofenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly fcm: FcmService,
  ) {}

  /**
   * Called on every GPS tick from the gateway.
   * Queries PostGIS for active pickup nodes within GEOFENCE_RADIUS_METERS,
   * deduplicates via Redis, then fires FCM to each waiting staff member.
   */
  async checkGeofence(payload: GpsPayload): Promise<void> {
    const { vehicleId, lat, lng } = payload;

    const nearby = await this.queryNearbyStaff(vehicleId, lng, lat);

    if (nearby.length === 0) return;

    await Promise.all(
      nearby.map((row) => this.maybeAlert(vehicleId, row)),
    );
  }

  // ── PostGIS query ────────────────────────────────────────────────────────

  private async queryNearbyStaff(
    vehicleId: string,
    vehicleLng: number,
    vehicleLat: number,
  ): Promise<NearbyStaff[]> {
    /**
     * ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
     * uses the WGS-84 geography type so ST_Distance returns metres directly.
     */
    return this.prisma.$queryRaw<NearbyStaff[]>`
      SELECT
        pn.id                                       AS "nodeId",
        pn.address                                  AS "nodeAddress",
        pn."estimatedAt"                            AS "estimatedAt",
        ss."userId"                                 AS "userId",
        u."fcmToken"                                AS "fcmToken",
        ST_Distance(
          ST_SetSRID(ST_MakePoint(pn.lng, pn.lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${vehicleLng}, ${vehicleLat}), 4326)::geography
        )                                           AS "distanceMeters"
      FROM "PickupNode" pn
      JOIN "ShiftStaff" ss ON ss."pickupNodeId" = pn.id
      JOIN "User"        u  ON u.id = ss."userId"
      JOIN "Shift"       s  ON s.id = pn."shiftId"
      WHERE s.status    = 'ACTIVE'
        AND s."vehicleId" = ${vehicleId}
        AND u."fcmToken" IS NOT NULL
        AND ST_Distance(
          ST_SetSRID(ST_MakePoint(pn.lng, pn.lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${vehicleLng}, ${vehicleLat}), 4326)::geography
        ) <= ${GEOFENCE_RADIUS_METERS}
    `;
  }

  // ── Dedup + FCM ──────────────────────────────────────────────────────────

  private async maybeAlert(vehicleId: string, row: NearbyStaff): Promise<void> {
    const dedupKey = `geofence:alerted:${vehicleId}:${row.nodeId}:${row.userId}`;

    // setAlertIfAbsent returns true only if this is the first alert for this combo
    const isFirstAlert = await this.redis.setAlertIfAbsent(dedupKey, ALERT_DEDUP_TTL_SECONDS);
    if (!isFirstAlert) return;

    const distanceKm = (row.distanceMeters / 1000).toFixed(1);
    const etaMinutes = this.etaMinutes(row.estimatedAt, row.distanceMeters);
    const etaText = etaMinutes > 0 ? `~${etaMinutes} min` : 'arriving now';

    const title = 'Your pickup truck is nearby!';
    const body =
      `Your truck is ${distanceKm} km away (${etaText}). ` +
      `Please make your way to: ${row.nodeAddress}`;

    try {
      await this.fcm.sendPush(row.fcmToken, title, body);
      this.logger.log(
        `Alert sent → user ${row.userId} | node ${row.nodeId} | ${distanceKm} km`,
      );
    } catch (err) {
      this.logger.error(`FCM failed for user ${row.userId}: ${err}`);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Prefers the stored estimatedAt ETA. Falls back to a rough estimate
   * based on distance / assumed 40 km/h urban speed.
   */
  private etaMinutes(estimatedAt: Date, distanceMeters: number): number {
    const fromEstimate = Math.round((estimatedAt.getTime() - Date.now()) / 60_000);
    if (fromEstimate > 0) return fromEstimate;
    // Fallback: 40 km/h = 666 m/min
    return Math.round(distanceMeters / 666);
  }
}
