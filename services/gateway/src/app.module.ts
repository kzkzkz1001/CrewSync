import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { GpsGateway } from './gps/gps.gateway';

@Module({
  imports: [AuthModule],
  providers: [GpsGateway],
})
export class AppModule {}
