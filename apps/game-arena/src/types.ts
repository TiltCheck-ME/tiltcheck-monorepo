/**
 * TypeScript type definitions for Game Arena
 */

import type { Request } from 'express';
import type { AuthUser, AuthSession } from '@tiltcheck/supabase-auth';

// Extend Express Request to include Supabase auth
export interface ExpressUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  discordId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Authenticated user from Supabase */
      user?: AuthUser;
      /** Current Supabase auth session */
      authSession?: AuthSession;
    }
  }
}

// User types - mapped from Supabase AuthUser for game usage
export interface DiscordUser {
  id: string;           // Discord ID
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Map Supabase AuthUser to DiscordUser for game logic compatibility
 */
export function mapAuthUserToDiscordUser(authUser: AuthUser): DiscordUser {
  return {
    id: authUser.discordId || authUser.id,  // Use Discord ID if available, fallback to Supabase ID
    username: authUser.discordUsername || authUser.email?.split('@')[0] || 'Unknown',
    discriminator: '0',  // Discord deprecated discriminators
    avatar: authUser.avatarUrl || null,
    email: authUser.email,
  };
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
