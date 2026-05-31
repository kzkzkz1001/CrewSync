import { runVrp, MAX_PICKUP_NODES } from './vrp.algorithm';

/**
 * Synthetic 7-node duration matrix (seconds):
 *   0 = driver origin
 *   1..5 = staff (two Dublin clusters + one outlier)
 *   6 = destination
 *
 * Staff 1,2,3 are close together (~5 min between them).
 * Staff 4,5 are close together (~4 min between them).
 * Cross-cluster travel is ~20 min.
 */
function buildMatrix(): number[][] {
  const INF = 99999;
  // 7x7 matrix — rows = from, cols = to
  return [
    // from\to  0     1     2     3     4     5     6
    /* 0 drv */ [0,   600,  620,  580,  1800, 1750, 3600],
    /* 1 s1  */ [600,  0,   300,  350,  1200, 1250, 2800],
    /* 2 s2  */ [620, 300,   0,   280,  1180, 1210, 2820],
    /* 3 s3  */ [580, 350,  280,   0,   1150, 1200, 2750],
    /* 4 s4  */ [1800,1200, 1180, 1150,  0,   240,  1800],
    /* 5 s5  */ [1750,1250, 1210, 1200, 240,   0,   1820],
    /* 6 dst */ [INF, INF,  INF,  INF,  INF,  INF,   0  ],
  ];
}

describe('runVrp', () => {
  const matrix = buildMatrix();
  const input = {
    driverIdx: 0,
    staffIndices: [1, 2, 3, 4, 5],
    destinationIdx: 6,
    durationMatrix: matrix,
  };

  it('returns at most MAX_PICKUP_NODES clusters', () => {
    const result = runVrp(input);
    expect(result.orderedClusters.length).toBeLessThanOrEqual(MAX_PICKUP_NODES);
  });

  it('assigns every staff member to exactly one cluster', () => {
    const result = runVrp(input);
    const allAssigned = result.orderedClusters.flatMap((c) => c.memberIndices);
    expect(allAssigned.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('naturally separates the two geographic clusters', () => {
    const result = runVrp(input);
    // Staff 1,2,3 should be in one cluster; 4,5 in another
    const cluster1Members = result.orderedClusters.find((c) =>
      c.memberIndices.includes(1),
    )?.memberIndices ?? [];
    const cluster2Members = result.orderedClusters.find((c) =>
      c.memberIndices.includes(4),
    )?.memberIndices ?? [];

    // The two distant staff should not share a cluster
    expect(cluster1Members).not.toEqual(expect.arrayContaining([4, 5]));
    expect(cluster2Members).not.toEqual(expect.arrayContaining([1, 2, 3]));
  });

  it('returns cumulative durations in ascending order', () => {
    const result = runVrp(input);
    const durations = result.cumulativeDurationsSeconds;
    for (let i = 1; i < durations.length; i++) {
      expect(durations[i]).toBeGreaterThanOrEqual(durations[i - 1]);
    }
  });

  it('totalDurationSeconds includes the last-node → destination leg', () => {
    const result = runVrp(input);
    const lastNodeIdx = result.orderedClusters.at(-1)!.medoidIdx;
    const lastLeg = matrix[lastNodeIdx][6];
    const lastCumulative = result.cumulativeDurationsSeconds.at(-1)!;
    expect(result.totalDurationSeconds).toBeCloseTo(lastCumulative + lastLeg, 0);
  });

  it('handles a single staff member (k=1)', () => {
    const result = runVrp({ ...input, staffIndices: [1] });
    expect(result.orderedClusters).toHaveLength(1);
    expect(result.orderedClusters[0].memberIndices).toEqual([1]);
  });
});
