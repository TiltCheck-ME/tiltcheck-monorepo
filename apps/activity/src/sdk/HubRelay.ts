// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import { io, Socket } from 'socket.io-client';
import type { SessionRound } from '../state/SessionState.js';

export interface HubRelayOptions {
  url: string;
  userId: string;
  channelId: string;
  accessToken?: string | null;
}

interface TriviaStartedPayload {
  type?: string;
  gameId?: string;
  prizePool?: number;
  roundNumber?: number;
  totalRounds?: number;
}

interface TriviaRoundStartPayload {
  gameId?: string;
  question?: {
    id: string;
    question: string;
    choices: string[];
    category?: string;
    theme?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  };
  prizePool?: number;
  roundNumber?: number;
  totalRounds?: number;
  endsAt?: number;
  leaderboard?: Array<{ username: string; score: number }>;
  players?: Array<{ userId: string; username: string; score: number; eliminated: boolean; shieldConsumed: boolean; buyBackUsed: boolean }>;
}

interface TriviaRoundRevealPayload {
  gameId?: string;
  questionId?: string;
  correctChoice?: string;
  explanation?: string;
  stats?: Record<string, { count: number; correct: boolean }>;
  leaderboard?: Array<{ username: string; score: number }>;
  players?: Array<{ userId: string; username: string; score: number; eliminated: boolean; shieldConsumed: boolean; buyBackUsed: boolean }>;
}

interface TriviaSnapshot {
  started: TriviaStartedPayload | null;
  roundStart: TriviaRoundStartPayload | null;
  roundReveal: TriviaRoundRevealPayload | null;
}

type HubEventHandler<T = unknown> = (data: T) => void;

export class HubRelay {
  private socket: Socket | null = null;
  private options: HubRelayOptions;
  private handlers: Map<string, HubEventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 30000;
  private joinedGameId: string | null = null;
  private triviaSnapshot: TriviaSnapshot = {
    started: null,
    roundStart: null,
    roundReveal: null,
  };

  constructor(options: HubRelayOptions) {
    this.options = options;
  }

  connect(): void {
    this.socket = io(this.options.url, {
      auth: this.options.accessToken ? { accessToken: this.options.accessToken } : undefined,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: this.maxReconnectDelay,
      reconnectionAttempts: Infinity,
      transports: ['websocket'],
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.socket!.emit('join-lobby');
      if (this.joinedGameId) {
        this.socket!.emit('join-game', this.joinedGameId);
      }
      this.emit('connected', true);
    });

    this.socket.on('connect_error', (error) => {
      this.emit('game.error', error.message);
      this.emit('connected', false);
    });

    this.socket.on('disconnect', () => {
      this.emit('connected', false);
    });

    this.socket.on('game-update', (data) => {
      this.emit('game.update', data);

      if (typeof data !== 'object' || data === null || !('type' in data)) {
        return;
      }

      const type = (data as { type?: string }).type;
      if (type === 'trivia-started') {
        this.triviaSnapshot.started = data as TriviaStartedPayload;
        this.emit('trivia.started', data);
      } else if (type === 'trivia-joined') {
        this.emit('trivia.joined', data);
      } else if (type === 'trivia-completed') {
        this.triviaSnapshot = { started: null, roundStart: null, roundReveal: null };
        this.emit('trivia.completed', data);
      } else if (type === 'trivia-reset') {
        this.triviaSnapshot = { started: null, roundStart: null, roundReveal: null };
      }
    });

    this.socket.on('game-error', (error) => {
      this.emit('game.error', error);
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

    this.socket.on('trivia-round-start', (data) => {
      this.triviaSnapshot.roundStart = data as TriviaRoundStartPayload;
      this.triviaSnapshot.roundReveal = null;
      this.emit('trivia.round.start', data);
    });

    this.socket.on('trivia-round-reveal', (data) => {
      this.triviaSnapshot.roundReveal = data as TriviaRoundRevealPayload;
      this.emit('trivia.round.reveal', data);
    });

    this.socket.on('trivia-ape-in-result', (data) => {
      this.emit('trivia.ape-in.result', data);
    });

    this.socket.on('trivia-shield-result', (data) => {
      this.emit('trivia.shield.result', data);
    });

    this.socket.on('tip.rain', (data) => {
      this.emit('tip.rain', data);
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
    if (game === 'trivia' && this.joinedGameId) {
      this.socket.emit('join-game', this.joinedGameId);
      return;
    }
    this.socket.emit('join-lobby');
  }

  joinGame(gameId: string): void {
    this.joinedGameId = gameId;
    if (!this.socket?.connected) return;
    this.socket.emit('join-game', gameId);
  }

  clearJoinedGame(): void {
    this.joinedGameId = null;
  }

  getTriviaSnapshot(): TriviaSnapshot {
    return {
      started: this.triviaSnapshot.started ? { ...this.triviaSnapshot.started } : null,
      roundStart: this.triviaSnapshot.roundStart
        ? {
            ...this.triviaSnapshot.roundStart,
            question: this.triviaSnapshot.roundStart.question
              ? {
                  ...this.triviaSnapshot.roundStart.question,
                  choices: [...this.triviaSnapshot.roundStart.question.choices],
                }
              : undefined,
          }
        : null,
      roundReveal: this.triviaSnapshot.roundReveal ? { ...this.triviaSnapshot.roundReveal } : null,
    };
  }

  playCard(gameId: string, cardId: string): void {
    this.socket?.emit('play-card', { gameId, cardId, userId: this.options.userId });
  }

  voteCard(gameId: string, cardId: string): void {
    this.socket?.emit('vote-card', { gameId, cardId, userId: this.options.userId });
  }

  submitTriviaAnswer(questionId: string, answer: string): void {
    this.socket?.emit('submit-trivia-answer', {
      questionId,
      answer,
      timestamp: Date.now(),
    });
  }

  requestTriviaApeIn(gameId: string, questionId: string): void {
    this.socket?.emit('request-ape-in', {
      gameId,
      questionId,
    });
  }

  requestTriviaShield(gameId: string, questionId: string): void {
    this.socket?.emit('request-shield', {
      gameId,
      questionId,
    });
  }

  buyTriviaBack(gameId: string): void {
    this.socket?.emit('buy-back', {
      gameId,
    });
  }

  scheduleTriviaGame(category: string, theme: string, totalRounds: number): void {
    this.socket?.emit('schedule-trivia-game', {
      category,
      theme,
      totalRounds,
    });
  }

  resetTriviaGame(): void {
    this.socket?.emit('reset-trivia-game');
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
