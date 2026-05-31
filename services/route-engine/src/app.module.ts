import { Module } from '@nestjs/common';
import { RouteModule } from './route/route.module';

@Module({
  imports: [RouteModule],
})
export class AppModule {}
