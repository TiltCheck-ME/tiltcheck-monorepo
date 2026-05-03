// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03
/**
 * TypeScript type definitions for Game Arena
 */

import type { SessionData } from '@tiltcheck/auth';

// Extend Express Request to include shared auth
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Authenticated user from @tiltcheck/auth */
      user?: SessionData;
    }
  }
}

// User types - mapped from shared SessionData for game usage
export interface DiscordUser {
  id: string;           // Discord ID
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

/**
 * Map ecosystem SessionData to DiscordUser for game logic compatibility
 */
export function mapAuthUserToDiscordUser(session: SessionData): DiscordUser {
  return {
    id: session.discordId || session.userId,  // Use Discord ID if available
    username: session.discordUsername || 'Degen',
    discriminator: '0',  // Discord deprecated discriminators
    avatar: null, // Shared session doesn't currently carry avatar URL directly
    email: undefined,
  };
}

// Game types
export type GameType = 'dad' | 'poker' | 'trivia';
export type GameStatus = 'waiting' | 'active' | 'completed' | 'scheduled';
export type Platform = 'web' | 'discord';

export interface GameLobbyInfo {
  id: string;
  type: GameType;
  platform: Platform;
  status: GameStatus;
  hostId: string;
  hostUsername: string;
  playerCount: number;
  maxPlayers: number;
  isPrivate: boolean;
  createdAt: number;
  startTime?: number; // Scheduled start time for Trivia
}

export interface CreateGameRequest {
  gameType: GameType;
  maxPlayers?: number;
  isPrivate?: boolean;
}

// WebSocket event types
export interface ClientToServerEvents {
  'join-lobby': () => void;
  'request-lobby-update': () => void;
  'leave-lobby': () => void;
  'join-game': (gameId: string) => void;
  'spectate-game': (gameId: string) => void;
  'leave-game': () => void;
  'play-card': (data: { gameId: string; cardId: string; userId: string }) => void;
  'vote-card': (data: { gameId: string; cardId: string; userId: string }) => void;
  'claim-rain': (data: { rainId: string; timestamp: number }) => void;
  'game-action': (action: any) => void;
  'chat-message': (message: string) => void;
  // Trivia specific
  'submit-trivia-answer': (data: { questionId: string; answer: string; timestamp: number }) => void;
  'buy-back': (data: { gameId: string }) => void;
  'request-ape-in': (data: { gameId: string; questionId: string }) => void;
  'request-shield': (data: { gameId: string; questionId: string }) => void;
  'schedule-trivia-game': (data: { category?: string; theme?: string; totalRounds?: number }) => void;
  'reset-trivia-game': () => void;
}

export interface ServerToClientEvents {
  'lobby-update': (data: { games: GameLobbyInfo[]; playersOnline: number }) => void;
  'game-update': (gameState: any) => void;
  'spectator-mode': (enabled: boolean) => void;
  'game-error': (error: string) => void;
  'dad.round': (data: any) => void;
  'chat-message': (data: { userId: string; username: string; message: string; timestamp: number }) => void;
  'player-joined': (data: { userId: string; username: string }) => void;
  'player-left': (data: { userId: string }) => void;
  'jackpot-update': (data: { pool: number; entries: number; lastWinner?: string | null; lastPayout?: number }) => void;
  'trivia-player-eliminated': (data: { userId: string; username: string }) => void;
  'trivia-player-reinstated': (data: { userId: string; username: string }) => void;
  // Trivia specific
  'trivia-round-start': (data: { gameId: string; question: any; roundNumber: number; totalRounds: number; endsAt: number; prizePool?: number; leaderboard?: Array<{ username: string; score: number }>; players?: TriviaLivePlayerState[] }) => void;
  'trivia-round-reveal': (data: { gameId: string; questionId: string; correctChoice: string; explanation?: string; stats: any; leaderboard?: Array<{ username: string; score: number }>; players?: TriviaLivePlayerState[] }) => void;
  'trivia-ape-in-result': (data: { questionId: string; distribution: Record<string, number> }) => void;
  'trivia-shield-result': (data: { questionId: string; eliminated: string[] }) => void;
  // Tip events forwarded from discord-bot via event router
  'tip.rain': (data: { id: string; fromUserId: string; fromUsername: string; amountSol: number; amountUsd: number; message: string; expiresAt: number; claimable: boolean }) => void;
  'tip.rain.claimed': (data: { rainId: string; userId: string; success: boolean }) => void;
  'tip.sent': (data: { id: string; fromUsername: string; toUsername: string; amountSol: number; message: string; timestamp: number; claimed: boolean }) => void;
  'tip.claimed': (data: { rainId: string; claimerId: string }) => void;
}

export interface TriviaLivePlayerState {
  userId: string;
  username: string;
  score: number;
  eliminated: boolean;
  shieldConsumed: boolean;
  buyBackUsed: boolean;
}

// Stats types
export interface UserStats {
  discordId: string;
  username: string;
  avatar: string | null;
  
  // Global
  totalGames: number;
  totalWins: number;
  totalScore: number;
  
  // DA&D
  dadGames: number;
  dadWins: number;
  dadScore: number;
  
  // Poker
  pokerGames: number;
  pokerWins: number;
  pokerChipsWon: number;
  
  lastPlayedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Trivia Event Types
export interface TriviaGameSettings {
  startTime: number;
  category: string;
  theme: string;
  totalRounds: number;
  prizePool: number;
}

export interface TriviaQuestion {
    id: string;
    question: string;
    choices: string[];
    category: string;
    theme?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
}

export interface TriviaStartedEventData extends TriviaGameSettings {
  gameId: string;
}

export interface TriviaRoundStartEventData {
  question: TriviaQuestion;
  roundNumber: number;
  totalRounds: number;
  endsAt: number; // Timestamp
  prizePool?: number;
  leaderboard?: Array<{ username: string; score: number }>;
  players?: TriviaLivePlayerState[];
}

export interface TriviaRoundRevealEventData {
  questionId: string;
  correctChoice: string;
  explanation?: string;
  stats: Record<string, { count: number; correct: boolean }>; // choice -> { count, correct }
  leaderboard?: Array<{ username: string; score: number }>;
  players?: TriviaLivePlayerState[];
}

export interface TriviaWinner {
  userId: string;
  username: string;
  score: number;
  rank: number;
  prize?: number;
}

export interface TriviaCompletedEventData {
  gameId: string;
  winners: TriviaWinner[];
  finalScores: { userId: string; username: string; score: number }[];
}
