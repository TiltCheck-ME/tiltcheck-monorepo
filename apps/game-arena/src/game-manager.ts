/* Copyright (c) 2026 TiltCheck. All rights reserved. */
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
import type { SerializedGameState } from '@tiltcheck/dad';
import { eventRouter } from '@tiltcheck/event-router';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GameLobbyInfo, GameType, Platform } from './types.js';
import { redisClient } from './redis-client.js';

const REDIS_SNAPSHOT_KEY = 'game-arena:snapshot';
const REDIS_EVENTS_CHANNEL = 'game-arena:events';

interface GameArenaSnapshot {
  version: 1;
  savedAt: number;
  games: GameLobbyInfo[];
  playerGames: Array<{ userId: string; gameId: string }>;
  playerProfiles: Array<{ userId: string; username: string }>;
  dadStates: Array<{ lobbyGameId: string; state: SerializedGameState }>;
}

interface PersistenceStats {
  lastSavedAt: number | null;
  lastRestoredAt: number | null;
  restoredGames: number;
  dadImportSuccessCount: number;
  dadImportFallbackCount: number;
  persistErrorCount: number;
  restoreErrorCount: number;
}

export class GameManager {
  private games: Map<string, GameLobbyInfo> = new Map();
  private playerGames: Map<string, string> = new Map(); // userId -> gameId
  private playerProfiles: Map<string, string> = new Map(); // userId -> username
  private readonly stateFilePath: string;
  private persistenceStats: PersistenceStats = {
    lastSavedAt: null,
    lastRestoredAt: null,
    restoredGames: 0,
    dadImportSuccessCount: 0,
    dadImportFallbackCount: 0,
    persistErrorCount: 0,
    restoreErrorCount: 0,
  };

  constructor(options: { stateFilePath?: string } = {}) {
    this.stateFilePath = options.stateFilePath || 'data/game-arena-state.json';
  }

  async initialize(): Promise<void> {
    await this.restoreState();
  }

  private usernameFor(userId: string): string {
    return this.playerProfiles.get(userId) || `User-${userId.slice(0, 6)}`;
  }

  private async persistState(): Promise<void> {
    try {
      const dadStates: Array<{ lobbyGameId: string; state: SerializedGameState }> = [];
      for (const game of this.games.values()) {
        if (game.type !== 'dad') {
          continue;
        }
        const channelId = game.platform === 'web' ? `web-${game.id}` : game.id;
        const channelGames = dad.getChannelGames(channelId);
        if (channelGames.length === 0) {
          continue;
        }
        const exported = dad.exportGameState(channelGames[0].id);
        if (exported) {
          dadStates.push({ lobbyGameId: game.id, state: exported });
        }
      }

      const snapshot: GameArenaSnapshot = {
        version: 1,
        savedAt: Date.now(),
        games: Array.from(this.games.values()),
        playerGames: Array.from(this.playerGames.entries()).map(([userId, gameId]) => ({ userId, gameId })),
        playerProfiles: Array.from(this.playerProfiles.entries()).map(([userId, username]) => ({ userId, username })),
        dadStates,
      };

      const snapshotJson = JSON.stringify(snapshot);

      // Prefer Redis when available for cross-instance consistency
      if (redisClient && redisClient.isAvailable()) {
        try {
          await redisClient.setSnapshot(REDIS_SNAPSHOT_KEY, snapshotJson);
          this.persistenceStats.lastSavedAt = Date.now();

          try {
            const sizeBytes = Buffer.byteLength(snapshotJson, 'utf8');
            await redisClient.publish(REDIS_EVENTS_CHANNEL, { type: 'snapshot.updated', savedAt: this.persistenceStats.lastSavedAt, sizeBytes });
          } catch (pubErr) {
            // Non-fatal
            console.debug('[GameManager] Failed to publish snapshot update event:', pubErr);
          }

          return;
        } catch (redisErr) {
          console.debug('[GameManager] Redis persist failed, falling back to file persistence:', redisErr);
        }
      }

      // Fallback to file persistence
      await mkdir(path.dirname(this.stateFilePath), { recursive: true });
      const tempPath = `${this.stateFilePath}.tmp`;
      await writeFile(tempPath, snapshotJson, 'utf8');
      await rename(tempPath, this.stateFilePath);
      this.persistenceStats.lastSavedAt = Date.now();
    } catch (error) {
      this.persistenceStats.persistErrorCount++;
      console.warn('[GameManager] Failed to persist arena state:', error);
    }
  }

  private async restoreState(): Promise<void> {
    try {
      // Try Redis-first restore when available
      try {
        if (redisClient && redisClient.isAvailable()) {
          const raw = await redisClient.getSnapshot(REDIS_SNAPSHOT_KEY);
          if (raw) {
            console.debug('[GameManager] Restoring arena snapshot from Redis');
            const snapshot = JSON.parse(raw) as GameArenaSnapshot;

            if (snapshot.version !== 1) {
              console.warn('[GameManager] Ignoring unknown arena snapshot version from Redis');
            } else {
              this.games = new Map(snapshot.games.map((game) => [game.id, game]));
              this.playerGames = new Map(snapshot.playerGames.map((entry) => [entry.userId, entry.gameId]));
              this.playerProfiles = new Map(snapshot.playerProfiles.map((entry) => [entry.userId, entry.username]));
              const dadStatesByLobbyId = new Map((snapshot.dadStates || []).map((entry) => [entry.lobbyGameId, entry.state]));

              // Rebuild underlying module state so lobby metadata points to real games.
              for (const game of this.games.values()) {
                const players = snapshot.playerGames
                  .filter((entry) => entry.gameId === game.id)
                  .map((entry) => ({ userId: entry.userId, username: this.usernameFor(entry.userId) }));

                if (!players.some((player) => player.userId === game.hostId)) {
                  players.unshift({ userId: game.hostId, username: game.hostUsername });
                }

                await this.ensureUnderlyingGame(game, players, dadStatesByLobbyId.get(game.id));
              }

              await this.persistState();
              this.persistenceStats.lastRestoredAt = Date.now();
              this.persistenceStats.restoredGames = this.games.size;
              console.log(`[GameManager] Restored ${this.games.size} game(s) from Redis snapshot`);
              return;
            }
          }
        }
      } catch (redisErr) {
        this.persistenceStats.restoreErrorCount++;
        console.debug('[GameManager] Redis restore failed, falling back to file-based persistence:', redisErr);
      }

      // Migration: if no Redis snapshot exists but a file snapshot exists, copy it to Redis
      try {
        const fileStat = await stat(this.stateFilePath);
        if (fileStat && redisClient && redisClient.isAvailable()) {
          try {
            const rawFile = await readFile(this.stateFilePath, 'utf8');
            await redisClient.setSnapshot(REDIS_SNAPSHOT_KEY, rawFile);
            console.debug('[GameManager] Migrated file snapshot to Redis');
          } catch (migErr) {
            console.debug('[GameManager] Migration to Redis failed:', migErr);
          }
        }
      } catch {
        // file does not exist or cannot be read; continue to file fallback below
      }

      // File-based restore (fallback)
      try {
        const raw = await readFile(this.stateFilePath, 'utf8');
        const snapshot = JSON.parse(raw) as GameArenaSnapshot;

        if (snapshot.version !== 1) {
          console.warn('[GameManager] Ignoring unknown snapshot version');
          return;
        }

        this.games = new Map(snapshot.games.map((game) => [game.id, game]));
        this.playerGames = new Map(snapshot.playerGames.map((entry) => [entry.userId, entry.gameId]));
        this.playerProfiles = new Map(snapshot.playerProfiles.map((entry) => [entry.userId, entry.username]));
        const dadStatesByLobbyId = new Map(
          (snapshot.dadStates || []).map((entry) => [entry.lobbyGameId, entry.state])
        );

        // Rebuild underlying module state so lobby metadata points to real games.
        for (const game of this.games.values()) {
          const players = snapshot.playerGames
            .filter((entry) => entry.gameId === game.id)
            .map((entry) => ({
              userId: entry.userId,
              username: this.usernameFor(entry.userId),
            }));

          if (!players.some((player) => player.userId === game.hostId)) {
            players.unshift({ userId: game.hostId, username: game.hostUsername });
          }

          await this.ensureUnderlyingGame(game, players, dadStatesByLobbyId.get(game.id));
        }

        await this.persistState();
        this.persistenceStats.lastRestoredAt = Date.now();
        this.persistenceStats.restoredGames = this.games.size;
        console.log(`[GameManager] Restored ${this.games.size} game(s) from snapshot`);
      } catch (error: any) {
        this.persistenceStats.restoreErrorCount++;
        if (error?.code !== 'ENOENT') {
          console.warn('[GameManager] Failed to restore arena snapshot:', error);
        }
      }
    } catch (error: any) {
      this.persistenceStats.restoreErrorCount++;
      console.warn('[GameManager] Failed to restore arena snapshot (outer):', error);
    }
  }

  private async ensureUnderlyingGame(
    lobbyInfo: GameLobbyInfo,
    players: Array<{ userId: string; username: string }>,
    dadSnapshot?: SerializedGameState
  ): Promise<void> {
    const channelId = lobbyInfo.platform === 'web' ? `web-${lobbyInfo.id}` : lobbyInfo.id;

    if (lobbyInfo.type === 'dad') {
      if (dadSnapshot && dadSnapshot.channelId === channelId) {
        try {
          dad.importGameState(dadSnapshot);
          this.persistenceStats.dadImportSuccessCount++;
          return;
        } catch (error) {
          this.persistenceStats.dadImportFallbackCount++;
          console.warn('[GameManager] Failed to import DA&D snapshot, falling back to reconstruction:', error);
        }
      }

      let games = dad.getChannelGames(channelId);
      if (games.length === 0) {
        await dad.createGame(channelId, ['degen-starter'], {
          maxRounds: 10,
          maxPlayers: lobbyInfo.maxPlayers,
          submitWindowMs: 60_000,
        });
        games = dad.getChannelGames(channelId);
      }
      if (games.length === 0) {
        return;
      }

      for (const player of players) {
        try {
          await dad.joinGame(games[0].id, player.userId, player.username);
        } catch {
          // Ignore duplicate joins during restore.
        }
      }

      if (lobbyInfo.status === 'active') {
        try {
          await dad.startGame(games[0].id);
        } catch {
          // Restore fallback if game cannot be restarted.
          lobbyInfo.status = 'waiting';
        }
      }
      return;
    }

    if (lobbyInfo.type === 'poker' as any) {
      // Poker has been deprecated and disabled.
      return;
    }
  }

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

  public getGameCount(): number {
    return this.games.size;
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
      const dadGame = await dad.createGame(channelId, ['degen-starter'], {
        maxRounds: 10,
        maxPlayers: options.maxPlayers || 10,
        submitWindowMs: 60_000,
      });
      await dad.joinGame(dadGame.id, hostId, hostUsername);
    } else if (gameType === 'poker' as any) {
      throw new Error('Poker is currently disabled for maintenance.');
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
    this.playerProfiles.set(hostId, hostUsername);

    // Emit event
    await eventRouter.publish('game.created', 'game-arena', {
      gameId,
      type: gameType,
      platform,
      hostId,
    });

    await this.persistState();

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
    const existingGameId = this.playerGames.get(userId);
    if (existingGameId === gameId) {
      // Idempotent join for reconnect/reload.
      return;
    }
    if (existingGameId && existingGameId !== gameId) {
      throw new Error('Leave your current game before joining another');
    }

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
    } else if (lobbyInfo.type === 'poker' as any) {
      throw new Error('Poker is currently disabled.');
    }

    lobbyInfo.playerCount++;
    this.playerGames.set(userId, gameId);
    this.playerProfiles.set(userId, username);

    await eventRouter.publish('game.player.joined', 'game-arena', {
      gameId,
      userId,
      username,
    });

    await this.persistState();
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
    // (poker module not currently available - code kept for future use)
    // if (lobbyInfo.type === 'poker') {
    //   const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
    //   const games = poker.getChannelGames(channelId);
    //   if (games.length > 0) {
    //     poker.leaveGame(games[0].id, userId);
    //   }
    // }

    lobbyInfo.playerCount--;
    this.playerGames.delete(userId);
    this.playerProfiles.delete(userId);

    // If no players left, remove game
    if (lobbyInfo.playerCount === 0) {
      this.games.delete(gameId);
    }

    await eventRouter.publish('game.player.left', 'game-arena', {
      gameId,
      userId,
    });

    await this.persistState();
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
    } else if (lobbyInfo.type === 'poker' as any) {
      throw new Error('Poker is disabled.');
    }

    lobbyInfo.status = 'active';

    await eventRouter.publish('game.started', 'game-arena', {
      gameId,
      type: lobbyInfo.type,
      platform: lobbyInfo.platform,
    });

    await this.persistState();
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
      if (games.length === 0) {
        return null;
      }
      const game = games[0];
      const round = game.rounds[game.rounds.length - 1];
      const players = Array.from(game.players.values());
      const scores: Record<string, number> = {};
      const playerHands: Record<string, Array<{ id: string; text: string }>> = {};
      for (const player of players) {
        scores[player.userId] = player.score;
        playerHands[player.userId] = player.hand.map((card) => ({ id: card.id, text: card.text }));
      }

      const revealedSubmissions = (round?.revealedSubmissions || []).map((submission) => ({
        playerId: submission.userId,
        cards: submission.cards,
        card: submission.cards[0],
      }));

      return {
        id: game.id,
        type: 'degens-against-decency',
        status: game.status === 'completed' ? 'finished' : game.status === 'active' ? 'playing' : 'waiting',
        maxPlayers: game.maxPlayers,
        currentRound: game.currentRound,
        rounds: game.maxRounds,
        phase: round?.phase || 'submitting',
        submitDeadlineAt: round?.submitDeadlineAt,
        players: players.map((player) => ({ id: player.userId, username: player.username })),
        scores,
        playerHands,
        cardCzar: round ? { id: round.judgeUserId, username: game.players.get(round.judgeUserId)?.username || 'Judge' } : null,
        currentQuestion: round ? { text: round.blackCard.text, blanks: round.blackCard.blanks } : null,
        submissions: revealedSubmissions,
      };
    } else if (lobbyInfo.type === 'poker' as any) {
      return null;
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
      const { type } = action;
      const data = action.data || {};
      
      if (type === 'start-game') {
        await this.startGame(gameId);
      } else if (type === 'submit-cards') {
        const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
        const games = dad.getChannelGames(channelId);
        if (games.length > 0) {
          await dad.submitCards(games[0].id, userId, data.cardIds);
        }
      } else if (type === 'submit-card') {
        const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
        const games = dad.getChannelGames(channelId);
        if (games.length > 0) {
          await dad.submitCards(games[0].id, userId, [action.cardId]);
        }
      } else if (type === 'judge-pick' || type === 'vote') {
        const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
        const games = dad.getChannelGames(channelId);
        if (games.length > 0) {
          await dad.pickWinner(games[0].id, userId, data.targetUserId);
        }
      } else if (type === 'judge-submission') {
        const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
        const games = dad.getChannelGames(channelId);
        if (games.length > 0) {
          await dad.pickWinner(games[0].id, userId, action.playerId);
        }
      }
    } else if (lobbyInfo.type === 'poker' as any) {
      throw new Error('Poker is disabled.');
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
    dad.advanceAllTimers();

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

    void this.persistState();
  }

  async shutdown(): Promise<void> {
    await this.persistState();
  }

  async getPersistenceStatus(): Promise<{
    stateFilePath: string;
    snapshotExists: boolean;
    snapshotSizeBytes: number | null;
    snapshotModifiedAt: number | null;
    activeGames: number;
    trackedPlayers: number;
    stats: PersistenceStats;
  }> {
    let snapshotExists = false;
    let snapshotSizeBytes: number | null = null;
    let snapshotModifiedAt: number | null = null;

    try {
      const fileStat = await stat(this.stateFilePath);
      snapshotExists = true;
      snapshotSizeBytes = fileStat.size;
      snapshotModifiedAt = fileStat.mtimeMs;
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        console.warn('[GameManager] Failed to stat snapshot file:', error);
      }
    }

    return {
      stateFilePath: this.stateFilePath,
      snapshotExists,
      snapshotSizeBytes,
      snapshotModifiedAt,
      activeGames: this.games.size,
      trackedPlayers: this.playerGames.size,
      stats: { ...this.persistenceStats },
    };
  }

  /**
   * Force-end a lobby game immediately. Marks lobby as completed and attempts
   * to mark any underlying module game (e.g., DA&D) as completed as well.
   */
  public async forceEndGame(gameId: string): Promise<void> {
    const lobbyInfo = this.games.get(gameId);
    if (!lobbyInfo) {
      throw new Error('Game not found');
    }

    lobbyInfo.status = 'completed';

    // Try to end underlying DA&D game state if present
    if (lobbyInfo.type === 'dad') {
      const channelId = lobbyInfo.platform === 'web' ? `web-${gameId}` : gameId;
      const games = dad.getChannelGames(channelId);
      for (const g of games) {
        try {
          // Mutate underlying module state to indicate completion
          (g as any).status = 'completed';
          (g as any).completedAt = Date.now();
        } catch (e) {
          // Best-effort only
          console.warn('[GameManager] Failed to force-complete underlying game:', e);
        }
      }

      // Emit a high-level event so operators and listeners can react
      try {
        await eventRouter.publish('dad.game.completed', 'game-arena', {
          gameId,
          reason: 'admin_forced_end',
        } as any);
      } catch (e) {
        console.warn('[GameManager] Failed to publish forced-end event:', e);
      }
    }

    await this.persistState();
  }

  /**
   * Reload persisted state from disk into memory (admin action)
   */
  public async reloadState(): Promise<void> {
    // Restore from the configured state file
    await this.restoreState();
  }

  /**
   * Replay an in-memory snapshot: import snapshot state and rebuild underlying
   * games. Useful for debugging or restoring from a provided snapshot object.
   */
  public async replaySnapshot(snapshot: any): Promise<void> {
    try {
      if (snapshot?.version !== 1) {
        throw new Error('Unsupported snapshot version');
      }

      // Rehydrate maps
      this.games = new Map((snapshot.games || []).map((g: any) => [g.id, g]));
      this.playerGames = new Map((snapshot.playerGames || []).map((e: any) => [e.userId, e.gameId]));
      this.playerProfiles = new Map((snapshot.playerProfiles || []).map((e: any) => [e.userId, e.username]));

      const dadStatesByLobbyId = new Map((snapshot.dadStates || []).map((entry: any) => [entry.lobbyGameId, entry.state]));

      // Rebuild underlying module state so lobby metadata points to real games.
      for (const game of this.games.values()) {
        const players = (snapshot.playerGames || [])
          .filter((entry: any) => entry.gameId === game.id)
          .map((entry: any) => ({ userId: entry.userId, username: this.usernameFor(entry.userId) }));

        if (!players.some((p: any) => p.userId === game.hostId)) {
          players.unshift({ userId: game.hostId, username: game.hostUsername });
        }

        await this.ensureUnderlyingGame(game, players, dadStatesByLobbyId.get(game.id));
      }

      await this.persistState();
    } catch (error) {
      this.persistenceStats.restoreErrorCount++;
      throw error;
    }
  }
}
