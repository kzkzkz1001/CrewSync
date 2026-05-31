import { Module } from '@nestjs/common';
import { GeofenceModule } from './geofence/geofence.module';
import { FcmModule } from './fcm/fcm.module';

@Module({
  imports: [FcmModule, GeofenceModule],
})
export class AppModule {}
