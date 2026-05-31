import { Module } from '@nestjs/common';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';
import { MapboxService } from './mapbox.service';

@Module({
  controllers: [RouteController],
  providers: [RouteService, MapboxService],
})
export class RouteModule {}
