import { Injectable } from '@nestjs/common';
import { FcmService } from '../fcm/fcm.service';
import type { GpsPayload, GeofenceAlert } from '@crewsync/types';

const GEOFENCE_RADIUS_METERS = 1000;

@Injectable()
export class GeofenceService {
  constructor(private readonly fcm: FcmService) {}

  /**
   * Called on every GPS update. Checks if the vehicle has breached
   * any active pickup node geofences for the current shift.
   */
  async checkGeofence(payload: GpsPayload): Promise<void> {
    // TODO: load active pickup nodes from DB (PostGIS ST_Distance query)
    // TODO: for each node within GEOFENCE_RADIUS_METERS, fire FCM alert
    console.log(`Checking geofence for vehicle ${payload.vehicleId}`);
  }

  /** Haversine distance in meters between two lat/lng points. */
  haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
