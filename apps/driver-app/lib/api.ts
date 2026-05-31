import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const BASE = Constants.expoConfig?.extra?.gatewayUrl ?? 'http://localhost:3000';

async function token() {
  return SecureStore.getItemAsync('crewsync_driver_token');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const t = await token();
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const login = (email: string, password: string) =>
  request<{ accessToken: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const getShifts = () => request<any[]>('/shifts');
export const getShift  = (id: string) => request<any>(`/shifts/${id}`);

export const updateShiftStatus = (id: string, status: string) =>
  request<any>(`/shifts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
