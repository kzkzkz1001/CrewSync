import { Body, Controller, Post } from '@nestjs/common';
import { GeofenceService } from './geofence.service';
import type { GpsPayload } from '@crewsync/types';

@Controller('geofence')
export class GeofenceController {
  constructor(private readonly geofenceService: GeofenceService) {}

  @Post('check')
  check(@Body() payload: GpsPayload) {
    return this.geofenceService.checkGeofence(payload);
  }
}
