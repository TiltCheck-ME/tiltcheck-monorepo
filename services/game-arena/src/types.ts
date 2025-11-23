/**
 * TypeScript type definitions for Game Arena
 */

import type { Request } from 'express';

// Extend Express Request user globally
declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
      email?: string;
    }
  }
}

// User types
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: DiscordUser;
}

// Game types
export type GameType = 'dad' | 'poker';
export type GameStatus = 'waiting' | 'active' | 'completed';
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
}

export interface CreateGameRequest {
  gameType: GameType;
  maxPlayers?: number;
  isPrivate?: boolean;
}

// WebSocket event types
export interface ClientToServerEvents {
  'join-lobby': () => void;
  'leave-lobby': () => void;
  'join-game': (gameId: string) => void;
  'leave-game': () => void;
  'game-action': (action: any) => void;
  'chat-message': (message: string) => void;
}

export interface ServerToClientEvents {
  'lobby-update': (data: { games: GameLobbyInfo[]; playersOnline: number }) => void;
  'game-update': (gameState: any) => void;
  'game-error': (error: string) => void;
  'chat-message': (data: { userId: string; username: string; message: string; timestamp: number }) => void;
  'player-joined': (data: { userId: string; username: string }) => void;
  'player-left': (data: { userId: string }) => void;
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
