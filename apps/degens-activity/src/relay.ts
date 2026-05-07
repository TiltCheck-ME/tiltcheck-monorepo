// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06
// Socket.io relay to game-arena + rain/tip events

import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './sdk.js';

type Handler = (data: unknown) => void;

/** Production ships without localhost — game-arena public ingress is arena.tiltcheck.me. Dev uses the Vite dev origin so `/socket.io` hits the proxy. */
function resolveArenaUrl(): string {
  const env = typeof import.meta.env.VITE_ARENA_URL === 'string' ? import.meta.env.VITE_ARENA_URL.trim() : '';
  if (env) {
    return env;
  }
  if (import.meta.env.DEV && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://arena.tiltcheck.me';
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

export function connect(userId: string): void {
  if (socket) return;

  const arenaUrl = resolveArenaUrl();

  socket = io(arenaUrl, {
    auth: { token: getAccessToken() || 'activity-bypass', userId },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    // Prefer polling-compatible path — some Discord/mobile webviews are picky about websocket-only.
    transports: ['polling', 'websocket'],
  });

  socket.on('connect', () => emit('connected', true));
  socket.on('disconnect', () => emit('connected', false));

  // Game events
  socket.on('game-update', (d) => emit('game.update', d));
  socket.on('game-error', (d) => emit('game.error', d));
  socket.on('dad.round', (d) => emit('dad.round', d));

  // Trivia lifecycle
  socket.on('trivia-round-start', (d) => emit('trivia.round.start', d));
  socket.on('trivia-round-reveal', (d) => emit('trivia.round.reveal', d));
  socket.on('trivia-ape-in-result', (d) => emit('trivia.ape-in.result', d));
  socket.on('trivia-shield-result', (d) => emit('trivia.shield.result', d));
  socket.on('trivia-player-eliminated', (d) => emit('trivia.player.eliminated', d));
  socket.on('trivia-player-reinstated', (d) => emit('trivia.player.reinstated', d));

  // Rain / tip events
  socket.on('tip.rain', (d) => emit('tip.rain', d));
  socket.on('tip.rain.claimed', (d) => emit('tip.rain.claimed', d));
  socket.on('tip.sent', (d) => emit('tip.sent', d));

  // Jackpot / prize pool
  socket.on('jackpot-update', (d) => emit('jackpot.update', d));
}

export function joinLobby(): void {
  socket?.emit('join-lobby');
}

export function joinGame(gameId: string): void {
  socket?.emit('join-game', gameId);
}

export function playCard(gameId: string, cardId: string, userId: string): void {
  socket?.emit('play-card', { gameId, cardId, userId });
}

export function voteCard(gameId: string, cardId: string, userId: string): void {
  socket?.emit('vote-card', { gameId, cardId, userId });
}

export function submitTriviaAnswer(questionId: string, answer: string): void {
  socket?.emit('submit-trivia-answer', { questionId, answer, timestamp: Date.now() });
}

export function requestApeIn(gameId: string, questionId: string): void {
  socket?.emit('request-ape-in', { gameId, questionId });
}

export function requestShield(gameId: string, questionId: string): void {
  socket?.emit('request-shield', { gameId, questionId });
}

export function buyBack(gameId: string): void {
  socket?.emit('buy-back', { gameId });
}

export function resetTriviaGame(): void {
  socket?.emit('reset-trivia-game');
}

export function scheduleTriviaGame(data: { category?: string; theme?: string; totalRounds?: number }): void {
  socket?.emit('schedule-trivia-game', data);
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}
