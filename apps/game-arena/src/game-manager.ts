// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Game Manager
 * Manages game lifecycle and integrates with DA&D and Poker modules
 */

import { v4 as uuidv4 } from 'uuid';
import { dad } from '@tiltcheck/dad';
import * as poker from '@tiltcheck/poker';
import { eventRouter } from '@tiltcheck/event-router';
import type { GameLobbyInfo, GameType, Platform } from './types.js';

export class GameManager {
  private games: Map<string, GameLobbyInfo> = new Map();
  private playerGames: Map<string, string> = new Map(); // userId -> gameId

  /**
   * Get all active games in the lobby
   */
  getActiveGames(): GameLobbyInfo[] {
    return Array.from(this.games.values())
      .filter(game => game.status !== 'completed')
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get a specific game
   */
  getGame(gameId: string): GameLobbyInfo | undefined {
    return this.games.get(gameId);
  }

  /**
   * Create a new game
   */
  async createGame(
    hostId: string,
    hostUsername: string,
    gameType: GameType,
    options: {
      maxPlayers?: number;
      isPrivate?: boolean;
      platform?: Platform;
    } = {}
  ): Promise<GameLobbyInfo> {
    const gameId = uuidv4();
    const platform = options.platform || 'web';
    
    // Create the actual game in the appropriate module
    if (gameType === 'dad') {
      // Create DA&D game - use a pseudo channel ID for web games
      const channelId = platform === 'web' ? `web-${gameId}` : gameId;
      await dad.createGame(channelId, ['degen-starter'], {
        maxRounds: 10,
        maxPlayers: options.maxPlayers || 10,
      });
    } else if (gameType === 'poker') {
      // Create poker game
      const channelId = platform === 'web' ? `web-${gameId}` : gameId;
      poker.createGame(
        channelId,
        hostId,
        hostUsername,
        100, // buy-in
        1,   // small blind
        2    // big blind
      );
    }

    const lobbyInfo: GameLobbyInfo = {
      id: gameId,
      type: gameType,
      platform,
      status: 'waiting',
      hostId,
      hostUsername,
      playerCount: 1,
      maxPlayers: options.maxPlayers || 10,
      isPrivate: options.isPrivate || false,
      createdAt: Date.now(),
    };

    this.games.set(gameId, lobbyInfo);
    this.playerGames.set(hostId, gameId);

    // Emit event
    await eventRouter.publish('game.created', 'game-arena', {
      gameId,
      type: gameType,
      platform,
      hostId,
    });

    return lobbyInfo;
  }

  /**
   * Join an existing game
   */
  async joinGame(
    gameId: string,
    userId: string,
    username: string
  ): Promise<void> {
    const lobbyInfo = this.games.get(gameId);
    if (!lobbyInfo) {
      throw new Error('Game not found');
    }

    if (lobbyInfo.status !== 'waiting') {
      throw new Error('Game has already started');
    }

    if (lobbyInfo.playerCount >= lobbyInfo.maxPlayers) {
      throw new Error('Game is full');
    }

    // Join the actual game
    if (lobbyInfo.type === 'dad') {
      const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
      const games = dad.getChannelGames(channelId);
      if (games.length > 0) {
        await dad.joinGame(games[0].id, userId, username);
      }
    } else if (lobbyInfo.type === 'poker') {
      const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
      const games = poker.getChannelGames(channelId);
      if (games.length > 0) {
        poker.joinGame(games[0].id, userId, username);
      }
    }

    lobbyInfo.playerCount++;
    this.playerGames.set(userId, gameId);

    await eventRouter.publish('game.player.joined', 'game-arena', {
      gameId,
      userId,
      username,
    });
  }

  /**
   * Leave a game
   */
  async leaveGame(userId: string): Promise<void> {
    const gameId = this.playerGames.get(userId);
    if (!gameId) {
      return;
    }

    const lobbyInfo = this.games.get(gameId);
    if (!lobbyInfo) {
      return;
    }

    // Leave the actual game
    if (lobbyInfo.type === 'poker') {
      const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
      const games = poker.getChannelGames(channelId);
      if (games.length > 0) {
        poker.leaveGame(games[0].id, userId);
      }
    }

    lobbyInfo.playerCount--;
    this.playerGames.delete(userId);

    // If no players left, remove game
    if (lobbyInfo.playerCount === 0) {
      this.games.delete(gameId);
    }

    await eventRouter.publish('game.player.left', 'game-arena', {
      gameId,
      userId,
    });
  }

  /**
   * Start a game
   */
  async startGame(gameId: string): Promise<void> {
    const lobbyInfo = this.games.get(gameId);
    if (!lobbyInfo) {
      throw new Error('Game not found');
    }

    if (lobbyInfo.status !== 'waiting') {
      throw new Error('Game has already started');
    }

    // Start the actual game
    if (lobbyInfo.type === 'dad') {
      const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
      const games = dad.getChannelGames(channelId);
      if (games.length > 0) {
        await dad.startGame(games[0].id);
      }
    } else if (lobbyInfo.type === 'poker') {
      const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
      const games = poker.getChannelGames(channelId);
      if (games.length > 0) {
        poker.startGame(games[0].id);
      }
    }

    lobbyInfo.status = 'active';

    await eventRouter.publish('game.started', 'game-arena', {
      gameId,
      type: lobbyInfo.type,
      platform: lobbyInfo.platform,
    });
  }

  /**
   * Get game state for a player
   */
  getGameState(gameId: string, _userId: string): any {
    const lobbyInfo = this.games.get(gameId);
    if (!lobbyInfo) {
      return null;
    }

    // Get the actual game state
    if (lobbyInfo.type === 'dad') {
      const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
      const games = dad.getChannelGames(channelId);
      return games.length > 0 ? games[0] : null;
    } else if (lobbyInfo.type === 'poker') {
      const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
      const games = poker.getChannelGames(channelId);
      return games.length > 0 ? games[0] : null;
    }

    return null;
  }

  /**
   * Process a game action from a player
   */
  async processAction(gameId: string, userId: string, action: any): Promise<any> {
    const lobbyInfo = this.games.get(gameId);
    if (!lobbyInfo) {
      throw new Error('Game not found');
    }

    // Process action in the appropriate game module
    if (lobbyInfo.type === 'dad') {
      // DA&D actions (submit card, vote, etc.)
      const { type, data } = action;
      
      if (type === 'submit-cards') {
        const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
        const games = dad.getChannelGames(channelId);
        if (games.length > 0) {
          await dad.submitCards(games[0].id, userId, data.cardIds);
        }
      } else if (type === 'vote') {
        const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
        const games = dad.getChannelGames(channelId);
        if (games.length > 0) {
          await dad.vote(games[0].id, userId, data.targetUserId);
        }
      }
    } else if (lobbyInfo.type === 'poker') {
      // Poker actions
      const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
      const games = poker.getChannelGames(channelId);
      if (games.length > 0) {
        return poker.processAction(games[0].id, {
          userId,
          action: action.action,
          amount: action.amount,
        });
      }
    }

    return { success: true };
  }

  /**
   * Get number of players online
   */
  getOnlinePlayerCount(): number {
    return this.playerGames.size;
  }

  /**
   * Clean up completed games
   */
  cleanup(): void {
    const now = Date.now();
    const timeout = 60 * 60 * 1000; // 1 hour

    for (const [gameId, game] of this.games.entries()) {
      if (
        game.status === 'completed' ||
        (game.status === 'waiting' && now - game.createdAt > timeout)
      ) {
        this.games.delete(gameId);
        
        // Remove players from this game
        for (const [userId, playerGameId] of this.playerGames.entries()) {
          if (playerGameId === gameId) {
            this.playerGames.delete(userId);
          }
        }
      }
    }
  }
}
