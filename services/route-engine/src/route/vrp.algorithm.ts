/**
 * Modified VRP for CrewSync's single-vehicle, fixed-start/end pickup problem.
 *
 * Strategy:
 *   1. K-medoids clustering  — groups staff by travel-time proximity into ≤3 clusters.
 *      Each cluster's representative (medoid) becomes a physical pickup node.
 *   2. Nearest-neighbour TSP — orders the pickup nodes greedily from driver origin,
 *      constrained to end at the event destination.
 *
 * Index convention used throughout this file:
 *   0          = driver origin
 *   1 .. N     = staff[0 .. N-1]
 *   N+1        = event destination
 */

export const MAX_PICKUP_NODES = 3;

export interface VrpCluster {
  /** Index in the duration matrix that represents this pickup node. */
  medoidIdx: number;
  /** All staff matrix indices assigned to this cluster. */
  memberIndices: number[];
}

export interface VrpResult {
  /** Clusters ordered by visit sequence (driver → node1 → node2 → … → destination). */
  orderedClusters: VrpCluster[];
  /**
   * Cumulative travel time in seconds from driver origin to each pickup node.
   * orderedClusters[i] is reached after cumulativeDurationsSeconds[i] seconds.
   */
  cumulativeDurationsSeconds: number[];
  /** Total trip duration in seconds (driver → all nodes → destination). */
  totalDurationSeconds: number;
}

// ─── K-medoids (PAM) ────────────────────────────────────────────────────────

/**
 * Symmetric distance proxy: average of both directions to reduce Mapbox asymmetry.
 */
function symDist(matrix: number[][], i: number, j: number): number {
  return (matrix[i][j] + matrix[j][i]) / 2;
}

/**
 * Assigns each staff member to the nearest medoid.
 */
function assignToClusters(
  staffIndices: number[],
  medoids: number[],
  matrix: number[][],
): Map<number, number[]> {
  const clusters = new Map<number, number[]>(medoids.map((m) => [m, []]));
  for (const staffIdx of staffIndices) {
    let nearest = medoids[0];
    let nearestDist = Infinity;
    for (const m of medoids) {
      const d = symDist(matrix, staffIdx, m);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = m;
      }
    }
    clusters.get(nearest)!.push(staffIdx);
  }
  return clusters;
}

/**
 * For a set of members, returns the one that minimises total intra-cluster distance.
 */
function bestMedoid(members: number[], matrix: number[][]): number {
  let best = members[0];
  let bestCost = Infinity;
  for (const candidate of members) {
    const cost = members.reduce((sum, m) => sum + symDist(matrix, candidate, m), 0);
    if (cost < bestCost) {
      bestCost = cost;
      best = candidate;
    }
  }
  return best;
}

function kMedoids(
  staffIndices: number[],
  matrix: number[][],
  k: number,
): VrpCluster[] {
  const n = staffIndices.length;
  k = Math.min(k, n);

  if (k >= n) {
    return staffIndices.map((idx) => ({ medoidIdx: idx, memberIndices: [idx] }));
  }

  // Initialise: evenly-spaced seeds across the staff array
  const step = Math.floor(n / k);
  let medoids: number[] = Array.from({ length: k }, (_, i) => staffIndices[i * step]);

  for (let iter = 0; iter < 50; iter++) {
    const clusters = assignToClusters(staffIndices, medoids, matrix);

    const newMedoids: number[] = [];
    for (const [, members] of clusters) {
      if (members.length > 0) newMedoids.push(bestMedoid(members, matrix));
    }

    if ([...newMedoids].sort().join() === [...medoids].sort().join()) break;
    medoids = newMedoids;
  }

  const finalClusters = assignToClusters(staffIndices, medoids, matrix);
  return Array.from(finalClusters.entries()).map(([medoidIdx, memberIndices]) => ({
    medoidIdx,
    memberIndices,
  }));
}

// ─── Nearest-Neighbour TSP ──────────────────────────────────────────────────

function nearestNeighbourOrder(
  driverIdx: number,
  medoids: number[],
  matrix: number[][],
): { orderedMedoids: number[]; cumulativeDurations: number[] } {
  const unvisited = new Set(medoids);
  const route: number[] = [];
  const cumulative: number[] = [];
  let current = driverIdx;
  let elapsed = 0;

  while (unvisited.size > 0) {
    let nearest = -1;
    let nearestDur = Infinity;
    for (const node of unvisited) {
      const d = matrix[current][node];
      if (d < nearestDur) {
        nearestDur = d;
        nearest = node;
      }
    }
    elapsed += nearestDur;
    route.push(nearest);
    cumulative.push(elapsed);
    unvisited.delete(nearest);
    current = nearest;
  }

  return { orderedMedoids: route, cumulativeDurations: cumulative };
}

// ─── Public entry point ─────────────────────────────────────────────────────

export interface VrpInput {
  /** Matrix index 0. */
  driverIdx: number;
  /** Matrix indices 1..N. */
  staffIndices: number[];
  /** Matrix index N+1. */
  destinationIdx: number;
  durationMatrix: number[][];
  maxPickupNodes?: number;
}

export function runVrp(input: VrpInput): VrpResult {
  const {
    driverIdx,
    staffIndices,
    destinationIdx,
    durationMatrix,
    maxPickupNodes = MAX_PICKUP_NODES,
  } = input;

  const clusters = kMedoids(staffIndices, durationMatrix, maxPickupNodes);
  const medoids = clusters.map((c) => c.medoidIdx);

  const { orderedMedoids, cumulativeDurations } = nearestNeighbourOrder(
    driverIdx,
    medoids,
    durationMatrix,
  );

  const lastNode = orderedMedoids.at(-1) ?? driverIdx;
  const totalDurationSeconds =
    (cumulativeDurations.at(-1) ?? 0) + durationMatrix[lastNode][destinationIdx];

  const clusterByMedoid = new Map(clusters.map((c) => [c.medoidIdx, c]));
  const orderedClusters = orderedMedoids.map((m) => clusterByMedoid.get(m)!);

  return { orderedClusters, cumulativeDurationsSeconds: cumulativeDurations, totalDurationSeconds };
}
