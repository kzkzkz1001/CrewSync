import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MapboxService } from './mapbox.service';
import { runVrp } from './vrp.algorithm';
import type { OptimizeRouteRequest, OptimizeRouteResponse, PickupNode, Coordinates } from '@crewsync/types';

@Injectable()
export class RouteService {
  constructor(private readonly mapbox: MapboxService) {}

  async optimize(request: OptimizeRouteRequest): Promise<OptimizeRouteResponse> {
    const { shiftId, driverOrigin, destination, staffLocations } = request;

    if (staffLocations.length === 0) {
      throw new BadRequestException('At least one staff location is required');
    }

    // ── 1. Build coordinate array ──────────────────────────────────────────
    // Index 0        = driver origin
    // Index 1..N     = staff[0..N-1]
    // Index N+1      = destination
    const coordinates: Coordinates[] = [
      driverOrigin,
      ...staffLocations.map((s) => s.location),
      destination,
    ];
    const driverIdx = 0;
    const destIdx = coordinates.length - 1;
    const staffIndices = staffLocations.map((_, i) => i + 1);

    // ── 2. Fetch duration + distance matrix from Mapbox ────────────────────
    const { durations, distances } = await this.mapbox.getMatrix(coordinates);

    // ── 3. Run VRP: k-medoids clustering + nearest-neighbour ordering ──────
    const vrpResult = runVrp({
      driverIdx,
      staffIndices,
      destinationIdx: destIdx,
      durationMatrix: durations,
    });

    // ── 4. Build PickupNode objects ────────────────────────────────────────
    // Compute total distance by summing driver→node1→node2→…→destination
    let totalDistanceMeters = 0;
    let prevIdx = driverIdx;

    const pickupNodes: PickupNode[] = await Promise.all(
      vrpResult.orderedClusters.map(async (cluster, i) => {
        const nodeCoords = coordinates[cluster.medoidIdx];
        const assignedStaffIds = cluster.memberIndices.map(
          (matrixIdx) => staffLocations[matrixIdx - 1].staffId,
        );

        // Accumulate distance leg
        totalDistanceMeters += distances[prevIdx][cluster.medoidIdx];
        if (i === vrpResult.orderedClusters.length - 1) {
          totalDistanceMeters += distances[cluster.medoidIdx][destIdx];
        }
        prevIdx = cluster.medoidIdx;

        // Shift startTime + cumulative travel duration = ETA at this node
        const shiftStartMs = request.startTime
          ? new Date(request.startTime).getTime()
          : Date.now();
        const etaMs = shiftStartMs + vrpResult.cumulativeDurationsSeconds[i] * 1000;

        const address = await this.mapbox.reverseGeocode(nodeCoords.lat, nodeCoords.lng);

        return {
          id: randomUUID(),
          shiftId,
          location: nodeCoords,
          address,
          estimatedArrivalTime: new Date(etaMs).toISOString(),
          assignedStaffIds,
        };
      }),
    );

    return {
      shiftId,
      pickupNodes,
      totalDistanceMeters: Math.round(totalDistanceMeters),
      totalDurationSeconds: Math.round(vrpResult.totalDurationSeconds),
    };
  }
}
