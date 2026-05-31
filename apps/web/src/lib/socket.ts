import { io, Socket } from 'socket.io-client';
import { WS_EVENTS } from '@crewsync/types';
import type { GpsPayload } from '@crewsync/types';

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${GATEWAY}/gps`, { autoConnect: false });
  }
  return socket;
}

export function connectSocket() {
  getSocket().connect();
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function onGpsUpdate(handler: (payload: GpsPayload) => void) {
  getSocket().on(WS_EVENTS.GPS_UPDATE, handler);
  return () => getSocket().off(WS_EVENTS.GPS_UPDATE, handler);
}
