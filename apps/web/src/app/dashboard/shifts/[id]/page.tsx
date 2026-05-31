'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { format } from 'date-fns';
import * as api from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';

// Map must be client-side only (no SSR) — mapbox-gl uses window/document
const LiveMap = dynamic(() => import('@/components/LiveMap'), { ssr: false });

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: shift, mutate, isLoading } = useSWR(
    id ? `shift-${id}` : null,
    () => api.getShift(id),
    { refreshInterval: 5_000 },
  );

  async function handleOptimize() {
    await api.optimizeShift(id);
    mutate();
  }

  async function handleStatusChange(status: string) {
    await api.updateShiftStatus(id, status);
    mutate();
  }

  if (isLoading) return <div className="p-8 text-sm text-gray-500">Loading…</div>;
  if (!shift)    return <div className="p-8 text-sm text-red-500">Shift not found.</div>;

  const s = shift as any;
  const destination = { lat: s.destLat, lng: s.destLng };
  const pickupNodes = (s.pickupNodes ?? []).map((n: any) => ({
    id: n.id,
    shiftId: n.shiftId,
    location: { lat: n.lat, lng: n.lng },
    address: n.address,
    estimatedArrivalTime: n.estimatedAt,
    assignedStaffIds: (n.staff ?? []).map((ss: any) => ss.userId),
  }));

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-80 shrink-0 border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <h1 className="font-bold text-gray-900 text-lg leading-tight">{s.eventName}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <StatusBadge status={s.status} />
            <span className="text-xs text-gray-400">
              {format(new Date(s.startTime), 'EEE d MMM, HH:mm')}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-2">
          {s.status === 'DRAFT' && (
            <button
              onClick={handleOptimize}
              className="w-full bg-brand text-white text-sm font-medium py-2 rounded-lg hover:bg-brand-dark transition"
            >
              Optimize Route
            </button>
          )}
          {s.status === 'OPTIMIZED' && (
            <button
              onClick={() => handleStatusChange('ACTIVE')}
              className="w-full bg-green-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-green-700 transition"
            >
              Activate Shift
            </button>
          )}
          {s.status === 'ACTIVE' && (
            <button
              onClick={() => handleStatusChange('COMPLETED')}
              className="w-full bg-purple-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-purple-700 transition"
            >
              Mark Completed
            </button>
          )}
          {!['COMPLETED', 'CANCELLED'].includes(s.status) && (
            <button
              onClick={() => handleStatusChange('CANCELLED')}
              className="w-full text-red-500 border border-red-200 text-sm font-medium py-2 rounded-lg hover:bg-red-50 transition"
            >
              Cancel Shift
            </button>
          )}
        </div>

        {/* Pickup nodes */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Pickup Nodes ({pickupNodes.length})
          </h2>
          {pickupNodes.length === 0 && (
            <p className="text-xs text-gray-400">Run optimization to generate pickup nodes.</p>
          )}
          {pickupNodes.map((node: any, i: number) => (
            <div key={node.id} className="mb-3 last:mb-0">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 bg-brand rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-white">{i + 1}</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-800 leading-snug">{node.address}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    ETA {new Date(node.estimatedArrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                    {node.assignedStaffIds.length} staff
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Staff list */}
        <div className="px-5 py-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Staff ({s.staff?.length ?? 0})
          </h2>
          {s.staff?.map((ss: any) => (
            <div key={ss.userId} className="flex items-center justify-between mb-2 last:mb-0">
              <span className="text-sm text-gray-800">{ss.user?.name ?? ss.userId}</span>
              {ss.pickupNode && (
                <span className="text-xs text-gray-400">Node {pickupNodes.findIndex((n: any) => n.id === ss.pickupNodeId) + 1}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <LiveMap
          destination={destination}
          pickupNodes={pickupNodes}
          vehicleId={s.vehicleId}
        />
      </div>
    </div>
  );
}
