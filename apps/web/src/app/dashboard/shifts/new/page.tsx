'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import * as api from '@/lib/api';

export default function NewShiftPage() {
  const router = useRouter();
  const { data: users }    = useSWR('users',    api.getUsers);
  const { data: vehicles } = useSWR('vehicles', api.getVehicles);

  const [form, setForm] = useState({
    eventName: '',
    destLat:   '',
    destLng:   '',
    startTime: '',
    vehicleId: '',
  });
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function toggleStaff(id: string) {
    setSelectedStaff((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (selectedStaff.length === 0) { setError('Select at least one staff member.'); return; }
    setLoading(true);
    try {
      const shift = await api.createShift({
        eventName: form.eventName,
        destLat:   parseFloat(form.destLat),
        destLng:   parseFloat(form.destLng),
        startTime: new Date(form.startTime).toISOString(),
        vehicleId: form.vehicleId,
        staffIds:  selectedStaff,
      });
      router.push(`/dashboard/shifts/${(shift as any).id}`);
    } catch (err: any) {
      setError(err.message ?? 'Failed to create shift');
    } finally {
      setLoading(false);
    }
  }

  const staffOnly = (users as any[])?.filter((u) => u.role === 'STAFF') ?? [];

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Shift</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {/* Event name */}
        <Field label="Event Name">
          <input
            value={form.eventName}
            onChange={(e) => setForm({ ...form, eventName: e.target.value })}
            required placeholder="e.g. Marlay Park Food Festival"
            className={inputCls}
          />
        </Field>

        {/* Destination coordinates */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Destination Latitude">
            <input
              type="number" step="any" value={form.destLat}
              onChange={(e) => setForm({ ...form, destLat: e.target.value })}
              required placeholder="53.2893" className={inputCls}
            />
          </Field>
          <Field label="Destination Longitude">
            <input
              type="number" step="any" value={form.destLng}
              onChange={(e) => setForm({ ...form, destLng: e.target.value })}
              required placeholder="-6.2655" className={inputCls}
            />
          </Field>
        </div>

        {/* Start time */}
        <Field label="Departure Time">
          <input
            type="datetime-local" value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            required className={inputCls}
          />
        </Field>

        {/* Vehicle */}
        <Field label="Vehicle">
          <select
            value={form.vehicleId}
            onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
            required className={inputCls}
          >
            <option value="">Select vehicle…</option>
            {(vehicles as any[])?.map((v) => (
              <option key={v.id} value={v.id}>{v.plateNumber}</option>
            ))}
          </select>
        </Field>

        {/* Staff selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Staff ({selectedStaff.length} selected)
          </label>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {staffOnly.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">No staff found.</p>
            )}
            {staffOnly.map((u: any) => (
              <label key={u.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedStaff.includes(u.id)}
                  onChange={() => toggleStaff(u.id)}
                  className="accent-brand"
                />
                <span className="text-sm text-gray-800">{u.name}</span>
                {!u.homeLat && (
                  <span className="text-xs text-amber-500 ml-auto">no home coords</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit" disabled={loading}
            className="bg-brand text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-brand-dark transition disabled:opacity-60"
          >
            {loading ? 'Creating…' : 'Create Shift'}
          </button>
          <button
            type="button" onClick={() => router.back()}
            className="text-sm font-medium text-gray-500 px-5 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white';
