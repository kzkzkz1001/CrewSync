import { Body, Controller, Post } from '@nestjs/common';
import { RouteService } from './route.service';
import type { OptimizeRouteRequest } from '@crewsync/types';

@Controller('optimize')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Post()
  optimize(@Body() request: OptimizeRouteRequest) {
    return this.routeService.optimize(request);
  }
}
