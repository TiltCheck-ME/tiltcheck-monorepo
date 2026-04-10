// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

import { io, Socket } from 'socket.io-client';
import type { SessionRound } from '../state/SessionState.js';

export interface HubRelayOptions {
  url: string;
  userId: string;
  channelId: string;
}

type HubEventHandler<T = unknown> = (data: T) => void;

export class HubRelay {
  private socket: Socket | null = null;
  private options: HubRelayOptions;
  private handlers: Map<string, HubEventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 30000;

  constructor(options: HubRelayOptions) {
    this.options = options;
  }

  connect(): void {
    this.socket = io(this.options.url, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: this.maxReconnectDelay,
      reconnectionAttempts: Infinity,
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.socket!.emit('join-channel', {
        channelId: this.options.channelId,
        userId: this.options.userId
      });
      this.emit('connected', true);
    });

    this.socket.on('disconnect', () => {
      this.emit('connected', false);
    });

    this.socket.on('session.update', (data) => {
      this.emit('session.update', data);
    });

    this.socket.on('bonus.available', (data) => {
      this.emit('bonus.available', data);
    });

    this.socket.on('trust.updated', (data) => {
      this.emit('trust.updated', data);
    });

    this.socket.on('vault.locked', (data) => {
      this.emit('vault.locked', data);
    });

    this.socket.on('dad.round', (data) => {
      this.emit('dad.round', data);
    });

    this.socket.on('trivia.question', (data) => {
      this.emit('trivia.question', data);
    });

    this.socket.on('trivia.result', (data) => {
      this.emit('trivia.result', data);
    });

    this.socket.on('tip.drop', (data) => {
      this.emit('tip.drop', data);
    });

    this.socket.on('tip.claimed', (data) => {
      this.emit('tip.claimed', data);
    });

    this.socket.on('tip.sent', (data) => {
      this.emit('tip.sent', data);
    });
  }

  pushRound(round: SessionRound): void {
    if (!this.socket?.connected) return;
    this.socket.emit('round', {
      userId: this.options.userId,
      channelId: this.options.channelId,
      ...round
    });
  }

  joinLobby(game: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('join-lobby', {
      game,
      userId: this.options.userId,
      channelId: this.options.channelId
    });
  }

  playCard(gameId: string, cardId: string): void {
    this.socket?.emit('play-card', { gameId, cardId, userId: this.options.userId });
  }

  voteCard(gameId: string, cardId: string): void {
    this.socket?.emit('vote-card', { gameId, cardId, userId: this.options.userId });
  }

  submitTriviaAnswer(questionId: string, answerId: string): void {
    this.socket?.emit('trivia.answer', { questionId, answerId, userId: this.options.userId });
  }

  sendTip(toUsername: string, amountSol: number, message: string): void {
    this.socket?.emit('tip.send', {
      fromUserId: this.options.userId,
      channelId: this.options.channelId,
      toUsername,
      amountSol,
      message
    });
  }

  getChannelId(): string {
    return this.options.channelId;
  }

  on(event: string, handler: HubEventHandler): void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
  }

  off(event: string, handler: HubEventHandler): void {
    const list = this.handlers.get(event);
    if (list) {
      const idx = list.indexOf(handler);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  private emit(event: string, data: unknown): void {
    this.handlers.get(event)?.forEach(h => h(data));
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
