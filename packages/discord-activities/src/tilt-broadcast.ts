/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Tilt Broadcast Manager
 *
 * Handles real-time broadcasting of tilt data to Discord Activities
 * and maintains active session state for peer visibility
 */

import { EventEmitter } from 'events';
import type { TiltCheckBaseEvent, TiltDetectedPayload } from '@tiltcheck/event-types';

export interface TiltBroadcast {
  userId: string;
  tiltScore: number;
  timestamp: number;
  sessionMetrics: {
    pnl: number;
    currentStreak: { wins: number; losses: number };
    rtp: number;
    timeInSession: number;
  };
}

export interface ActiveSession {
  userId: string;
  discordUsername: string;
  tiltScore: number;
  sessionStarted: number;
  lastUpdate: number;
  sessionMetrics: TiltBroadcast['sessionMetrics'];
}

/**
 * Manager for broadcasting tilt data to Discord Activities
 * Uses EventEmitter for WebSocket-like pub/sub
 */
export class TiltBroadcaster extends EventEmitter {
  private activeSessions = new Map<string, ActiveSession>();
  private readonly MAX_SESSION_AGE_MS = 3600000; // 1 hour

  constructor() {
    super();
    // Clean up stale sessions every 30 seconds
    setInterval(() => this.cleanupStaleSessions(), 30000);
  }

  /**
   * Process tilt event and broadcast to subscribed Activities
   */
  broadcastTilt(event: TiltCheckBaseEvent<'safety.tilt.detected', TiltDetectedPayload>): void {
    const { userId, tiltScore } = event.payload;

    // Update or create session
    const session: ActiveSession = {
      userId,
      discordUsername: '', // Will be set by activity or API call
      tiltScore,
      sessionStarted: this.activeSessions.get(userId)?.sessionStarted || Date.now(),
      lastUpdate: Date.now(),
      sessionMetrics: event.payload.sessionMetrics,
    };

    this.activeSessions.set(userId, session);

    // Emit event for Activity subscribers
    this.emit('tilt-update', {
      type: 'tilt-update',
      data: {
        userId,
        tiltScore,
        sessionMetrics: event.payload.sessionMetrics,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Get current tilt state for a user
   */
  getTiltState(userId: string): TiltBroadcast | null {
    const session = this.activeSessions.get(userId);
    if (!session) return null;

    return {
      userId,
      tiltScore: session.tiltScore,
      timestamp: session.lastUpdate,
      sessionMetrics: session.sessionMetrics,
    };
  }

  /**
   * Get all active sessions (for peer visibility)
   */
  getActiveSessions(): ActiveSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get active users in tilt state (tiltScore >= threshold)
   */
  getTiltedUsers(threshold: number = 60): ActiveSession[] {
    return Array.from(this.activeSessions.values()).filter((s) => s.tiltScore >= threshold);
  }

  /**
   * Mark session as ended
   */
  endSession(userId: string): void {
    this.activeSessions.delete(userId);
    this.emit('session-ended', { userId, timestamp: Date.now() });
  }

  /**
   * Get peer visibility list (all active users)
   */
  getPeerVisibility(): Array<{ userId: string; username: string; tiltScore: number }> {
    return Array.from(this.activeSessions.values()).map((s) => ({
      userId: s.userId,
      username: s.discordUsername,
      tiltScore: s.tiltScore,
    }));
  }

  /**
   * Update session username (called when user joins Activity)
   */
  updateSessionUsername(userId: string, username: string): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.discordUsername = username;
    }
  }

  /**
   * Clean up sessions older than MAX_SESSION_AGE_MS
   */
  private cleanupStaleSessions(): void {
    const now = Date.now();
    const staleUsers: string[] = [];

    for (const [userId, session] of this.activeSessions.entries()) {
      if (now - session.lastUpdate > this.MAX_SESSION_AGE_MS) {
        staleUsers.push(userId);
      }
    }

    if (staleUsers.length > 0) {
      staleUsers.forEach((userId) => this.activeSessions.delete(userId));
      console.log(`[TiltBroadcaster] Cleaned up ${staleUsers.length} stale sessions`);
    }
  }

  /**
   * Export session state (for debugging)
   */
  exportState(): Record<string, ActiveSession> {
    return Object.fromEntries(this.activeSessions);
  }

  /**
   * Clear all sessions (for testing)
   */
  clearAll(): void {
    this.activeSessions.clear();
  }
}

// Singleton instance
export const tiltBroadcaster = new TiltBroadcaster();
