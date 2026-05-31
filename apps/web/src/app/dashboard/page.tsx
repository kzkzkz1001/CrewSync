'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { format } from 'date-fns';
import * as api from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import type { Shift } from '@crewsync/types';

export default function DashboardPage() {
  const { data: shifts, error, isLoading, mutate } = useSWR<Shift[]>('shifts', api.getShifts, {
    refreshInterval: 10_000,
  });

  async function handleOptimize(id: string) {
    await api.optimizeShift(id);
    mutate();
  }

  async function handleActivate(id: string) {
    await api.updateShiftStatus(id, 'ACTIVE');
    mutate();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shifts</h1>
        <Link
          href="/dashboard/shifts/new"
          className="bg-brand text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-dark transition"
        >
          + New Shift
        </Link>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {error    && <p className="text-sm text-red-600">Failed to load shifts.</p>}

      <div className="space-y-3">
        {shifts?.map((shift: any) => (
          <div
            key={shift.id}
            className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 truncate">{shift.eventName}</span>
                <StatusBadge status={shift.status} />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {format(new Date(shift.startTime), 'EEE d MMM, HH:mm')} ·{' '}
                {shift.staff?.length ?? 0} staff · {shift.pickupNodes?.length ?? 0} pickup nodes
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {shift.status === 'DRAFT' && (
                <button
                  onClick={() => handleOptimize(shift.id)}
                  className="text-xs font-medium text-brand border border-brand px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
                >
                  Optimize Route
                </button>
              )}
              {shift.status === 'OPTIMIZED' && (
                <button
                  onClick={() => handleActivate(shift.id)}
                  className="text-xs font-medium text-white bg-green-600 px-3 py-1.5 rounded-lg hover:bg-green-700 transition"
                >
                  Activate
                </button>
              )}
              <Link
                href={`/dashboard/shifts/${shift.id}`}
                className="text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
              >
                View
              </Link>
            </div>
          </div>
        ))}
        {shifts?.length === 0 && (
          <p className="text-sm text-gray-500">No shifts yet. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}

