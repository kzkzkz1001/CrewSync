// ─── User & Auth ───────────────────────────────────────────────────────────────

export type UserRole = 'manager' | 'driver' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

// ─── Coordinates ───────────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

// ─── Shift & Event ─────────────────────────────────────────────────────────────

export type ShiftStatus = 'draft' | 'optimized' | 'active' | 'completed' | 'cancelled';

export interface Shift {
  id: string;
  eventName: string;
  destination: Coordinates;
  vehicleId: string;
  staffIds: string[];
  status: ShiftStatus;
  pickupNodes: PickupNode[];
  startTime: string; // ISO 8601
  createdAt: string;
}

// ─── Pickup Node ───────────────────────────────────────────────────────────────

export interface PickupNode {
  id: string;
  shiftId: string;
  location: Coordinates;
  address: string;
  estimatedArrivalTime: string; // ISO 8601
  assignedStaffIds: string[];
}

// ─── Vehicle & GPS ─────────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  plateNumber: string;
  driverId: string;
}

export interface GpsPayload {
  vehicleId: string;
  lat: number;
  lng: number;
  timestamp: string; // ISO 8601
}

// ─── Route Optimization ────────────────────────────────────────────────────────

export interface OptimizeRouteRequest {
  shiftId: string;
  startTime: string; // ISO 8601 — shift departure time, used to compute per-node ETAs
  driverOrigin: Coordinates;
  destination: Coordinates;
  staffLocations: { staffId: string; location: Coordinates }[];
}

export interface OptimizeRouteResponse {
  shiftId: string;
  pickupNodes: PickupNode[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
}

// ─── Notifications ─────────────────────────────────────────────────────────────

export interface GeofenceAlert {
  staffId: string;
  pickupNodeId: string;
  vehicleId: string;
  distanceMeters: number;
  estimatedSecondsAway: number;
}

// ─── WebSocket Events ──────────────────────────────────────────────────────────

export const WS_EVENTS = {
  GPS_UPDATE: 'gps:update',
  GEOFENCE_BREACH: 'geofence:breach',
  SHIFT_UPDATED: 'shift:updated',
} as const;
