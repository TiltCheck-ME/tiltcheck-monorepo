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
 * Stats Service
 * Listens to game events and updates user statistics in Supabase
 */

import { eventRouter } from '@tiltcheck/event-router';
import { db } from '@tiltcheck/db';
import type { TiltCheckEvent, GameCompletedEventData } from '@tiltcheck/types';

export class StatsService {
  private isInitialized = false;

  /**
   * Initialize the stats service and subscribe to game events
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[StatsService] Already initialized');
      return;
    }

    if (!db.isConnected()) {
      console.warn('[StatsService] Database not connected - stats tracking disabled');
      return;
    }

    // Subscribe to game completion events
    eventRouter.subscribe(
      'game.completed',
      async (event: TiltCheckEvent<'game.completed'>) => {
        await this.handleGameCompleted(event);
      },
      'game-arena'
    );

    this.isInitialized = true;
    console.log('[StatsService] Initialized and listening for game events');
  }

  /**
   * Handle game.completed event
   */
  private async handleGameCompleted(event: TiltCheckEvent<'game.completed'>): Promise<void> {
    try {
      const { gameId, type, platform, winnerId, playerIds, duration } = event.data;

      console.log(`[StatsService] Processing game completion: ${gameId} (${type} on ${platform})`);

      // Record game in history
      await db.recordGame({
        game_id: gameId,
        game_type: type,
        platform: platform || 'web',
        channel_id: event.data.channelId || null,
        winner_id: winnerId || null,
        player_ids: playerIds || [],
        duration: duration || null,
      });

      // Update stats for all players
      if (playerIds && Array.isArray(playerIds)) {
        for (const playerId of playerIds) {
          await this.updatePlayerStats(playerId, type, playerId === winnerId, event.data);
        }
      }

      console.log(`[StatsService] Updated stats for ${playerIds?.length || 0} players`);
    } catch (error) {
      console.error('[StatsService] Error handling game completion:', error);
    }
  }

  /**
   * Update stats for a single player
   */
  private async updatePlayerStats(
    discordId: string,
    gameType: 'dad' | 'poker',
    won: boolean,
    gameData: GameCompletedEventData
  ): Promise<void> {
    try {
      // Check if user exists, create if not
      let stats = await db.getUserStats(discordId);
      
      if (!stats) {
        // Try to get username from game data
        const username = 'Unknown';
        stats = await db.createUserStats(discordId, username, null);
        
        if (!stats) {
          console.error(`[StatsService] Failed to create stats for user ${discordId}`);
          return;
        }
      }

      // Calculate score/chips updates
      const updates: { won: boolean; score?: number; chipsWon?: number } = { won };

      if (gameType === 'dad') {
        // DA&D score from game data
        updates.score = 0;
      } else if (gameType === 'poker') {
        // Poker chips won
        updates.chipsWon = gameData.result?.winners?.find((w: { userId: string; }) => w.userId === discordId)?.winnings || 0;
      }

      // Update user stats
      await db.updateUserStats(discordId, gameType, updates);
    } catch (error) {
      console.error(`[StatsService] Error updating stats for user ${discordId}:`, error);
    }
  }

  /**
   * Manually update stats for a player (for admin or corrections)
   */
  async manualUpdateStats(
    discordId: string,
    gameType: 'dad' | 'poker',
    updates: {
      won?: boolean;
      score?: number;
      chipsWon?: number;
    }
  ): Promise<void> {
    if (!db.isConnected()) {
      throw new Error('Database not connected');
    }

    await db.updateUserStats(discordId, gameType, updates);
  }

  /**
   * Get user stats
   */
  async getUserStats(discordId: string) {
    if (!db.isConnected()) {
      return null;
    }

    return await db.getUserStats(discordId);
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(gameType?: 'dad' | 'poker', limit: number = 100) {
    if (!db.isConnected()) {
      return [];
    }

    return await db.getLeaderboard(gameType, limit);
  }

  /**
   * Get game history for a user
   */
  async getUserGameHistory(discordId: string, limit: number = 50) {
    if (!db.isConnected()) {
      return [];
    }

    return await db.getUserGameHistory(discordId, limit);
  }
}

// Export singleton instance
export const statsService = new StatsService();
