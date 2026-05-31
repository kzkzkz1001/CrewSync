import { Injectable } from '@nestjs/common';
import { MapboxService } from './mapbox.service';
import type { OptimizeRouteRequest, OptimizeRouteResponse, PickupNode } from '@crewsync/types';

@Injectable()
export class RouteService {
  constructor(private readonly mapbox: MapboxService) {}

  async optimize(request: OptimizeRouteRequest): Promise<OptimizeRouteResponse> {
    const { shiftId, driverOrigin, destination, staffLocations } = request;

    // Build coordinate list: driver → staff[0..n] → destination
    const coordinates = [
      driverOrigin,
      ...staffLocations.map((s) => s.location),
      destination,
    ];

    // Fetch duration matrix from Mapbox
    const matrix = await this.mapbox.getMatrix(coordinates);

    // TODO: Run Modified VRP algorithm on the matrix
    // For now, assign all staff to a single pickup node near the centroid
    const pickupNodes: PickupNode[] = [
      {
        id: `node-${shiftId}-1`,
        shiftId,
        location: staffLocations[0]?.location ?? driverOrigin,
        address: 'Computed by VRP (stub)',
        estimatedArrivalTime: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        assignedStaffIds: staffLocations.map((s) => s.staffId),
      },
    ];

    return {
      shiftId,
      pickupNodes,
      totalDistanceMeters: 0, // TODO: compute from matrix
      totalDurationSeconds: 0,
    };
  }
}
