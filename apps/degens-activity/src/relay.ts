// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// Socket.io relay to game-arena

import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './sdk.js';

type Handler = (data: unknown) => void;

const ARENA_URL = import.meta.env.VITE_ARENA_URL || 'http://localhost:3010';

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

  socket = io(ARENA_URL, {
    auth: { token: getAccessToken() || 'activity-bypass', userId },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    transports: ['websocket'],
  });

  socket.on('connect', () => emit('connected', true));
  socket.on('disconnect', () => emit('connected', false));

  // Game events
  socket.on('game-update', (d) => emit('game.update', d));
  socket.on('game-error', (d) => emit('game.error', d));
  socket.on('dad.round', (d) => emit('dad.round', d));

  // Trivia events
  socket.on('trivia-round-start', (d) => emit('trivia.round.start', d));
  socket.on('trivia-round-reveal', (d) => emit('trivia.round.reveal', d));
  socket.on('trivia-ape-in-result', (d) => emit('trivia.ape-in.result', d));
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

export function isConnected(): boolean {
  return socket?.connected ?? false;
}
