// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06
// Socket.io relay to TiltCheck hub (same Socket.IO surface as apps/activity Railway host)

import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './sdk.js';

export interface SessionRound {
  bet: number;
  win: number;
  timestamp: number;
}

type Handler = (data: unknown) => void;

function resolveHubUrl(): string {
  const env = typeof import.meta.env.VITE_HUB_URL === 'string' ? import.meta.env.VITE_HUB_URL.trim() : '';
  if (env) {
    return env;
  }
  if (import.meta.env.DEV && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://activity.tiltcheck.me';
}

let socket: Socket | null = null;
const handlers = new Map<string, Handler[]>();

function emit(event: string, data: unknown): void {
  handlers.get(event)?.forEach((h) => h(data));
}

export function on(event: string, handler: Handler): void {
  if (!handlers.has(event)) handlers.set(event, []);
  handlers.get(event)!.push(handler);
}

export function connect(userId: string, channelId: string): void {
  if (socket) return;

  const hubUrl = resolveHubUrl();

  socket = io(hubUrl, {
    auth: { accessToken: getAccessToken(), userId },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    transports: ['polling', 'websocket'],
    withCredentials: true,
  });

  socket.on('connect', () => {
    socket!.emit('join-lobby');
    emit('connected', true);
  });
  socket.on('disconnect', () => emit('connected', false));

  // Session events
  socket.on('session.update', (d) => emit('session.update', d));
  socket.on('trust.updated', (d) => emit('trust.updated', d));
  socket.on('bonus.available', (d) => emit('bonus.available', d));

  // Tilt events
  socket.on('tilt.update', (d) => emit('tilt.update', d));
}

export function pushRound(userId: string, channelId: string, round: SessionRound): void {
  if (!socket?.connected) return;
  socket.emit('round', { userId, channelId, ...round });
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}
