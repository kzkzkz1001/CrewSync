import type { Shift, User, Vehicle } from '@crewsync/types';

const BASE = process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:3000';

function token() {
  return typeof window !== 'undefined' ? localStorage.getItem('crewsync_token') : null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  request<{ accessToken: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

// ── Shifts ────────────────────────────────────────────────────────────────────
export const getShifts   = () => request<Shift[]>('/shifts');
export const getShift    = (id: string) => request<Shift>(`/shifts/${id}`);

export const createShift = (body: {
  eventName: string;
  destLat: number;
  destLng: number;
  startTime: string;
  vehicleId: string;
  staffIds: string[];
}) => request<Shift>('/shifts', { method: 'POST', body: JSON.stringify(body) });

export const optimizeShift = (id: string) =>
  request<Shift>(`/shifts/${id}/optimize`, { method: 'PATCH' });

export const updateShiftStatus = (id: string, status: string) =>
  request<Shift>(`/shifts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

// ── Users & Vehicles ──────────────────────────────────────────────────────────
export const getUsers    = () => request<User[]>('/users');
export const getVehicles = () => request<Vehicle[]>('/vehicles');
