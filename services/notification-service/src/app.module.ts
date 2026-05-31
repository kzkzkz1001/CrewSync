import { Module } from '@nestjs/common';
import { GeofenceModule } from './geofence/geofence.module';
import { FcmModule } from './fcm/fcm.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { DeviceModule } from './device/device.module';

@Module({
  imports: [PrismaModule, RedisModule, FcmModule, GeofenceModule, DeviceModule],
})
export class AppModule {}
