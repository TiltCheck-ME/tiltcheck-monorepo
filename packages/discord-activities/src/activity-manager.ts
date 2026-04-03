/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-02
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { eventRouter } from '@tiltcheck/event-router';
import type {
  ActivityLaunchConfig,
  ActivityInstance,
  ActivityResult,
  ActivitySessionState,
  ActivityMessage,
} from './types.js';

/**
 * Manages the lifecycle of Discord Activities
 * Handles creation, state persistence, cleanup, and communication
 */
export class DiscordActivityManager extends EventEmitter {
  private activeInstances: Map<string, ActivityInstance>;
  private sessionStore: Map<string, ActivitySessionState>;
  private readonly APPLICATION_ID: string;

  constructor(applicationId: string) {
    super();
    this.APPLICATION_ID = applicationId;
    this.activeInstances = new Map();
    this.sessionStore = new Map();
    this.setupCleanupInterval();
  }

  /**
   * Launch a new Discord Activity instance
   */
  async launchActivity(config: ActivityLaunchConfig): Promise<ActivityInstance> {
    const instanceId = config.instanceId || uuidv4();
    const expiresAt = Date.now() + 3600000; // 1 hour TTL

    const instance: ActivityInstance = {
      id: instanceId,
      userId: config.userId,
      guildId: config.guildId,
      channelId: config.channelId,
      messageId: uuidv4(), // Generated message ID for activity reference
      activityType: config.activityType,
      status: 'launching',
      sessionToken: config.sessionToken,
      createdAt: Date.now(),
      expiresAt,
    };

    this.activeInstances.set(instanceId, instance);

    // Persist session state
    const sessionState: ActivitySessionState = {
      instanceId,
      userId: config.userId,
      activityType: config.activityType,
      guildId: config.guildId,
      channelId: config.channelId,
      sessionToken: config.sessionToken,
      gameState: config.gameConfig || {},
      lastHeartbeat: Date.now(),
      expiresAt,
      reconnectCount: 0,
    };

    this.sessionStore.set(instanceId, sessionState);

    // Emit event for other services
    await eventRouter.publish('activity.launched', 'discord-bot', {
      activityId: instanceId,
      userId: config.userId,
      activityType: config.activityType,
      channelId: config.channelId,
      messageId: instance.messageId,
    });

    console.log(`[DiscordActivityManager] Activity launched: ${instanceId} (${config.activityType}) for user ${config.userId}`);

    return instance;
  }

  /**
   * Get an active Activity instance
   */
  getInstance(instanceId: string): ActivityInstance | undefined {
    return this.activeInstances.get(instanceId);
  }

  /**
   * Handle message from Activity (iFrame)
   */
  async handleActivityMessage(message: ActivityMessage): Promise<void> {
    const instance = this.activeInstances.get(message.instanceId);

    if (!instance) {
      console.warn(`[DiscordActivityManager] Received message for unknown instance: ${message.instanceId}`);
      return;
    }

    // Update last heartbeat
    const session = this.sessionStore.get(message.instanceId);
    if (session) {
      session.lastHeartbeat = Date.now();
    }

    switch (message.type) {
      case 'heartbeat':
        // Keep-alive ping from Activity
        this.emit('heartbeat', { instanceId: message.instanceId, timestamp: message.timestamp });
        break;

      case 'state-update':
        // Game state changed
        if (instance.gameState) {
          instance.gameState = { ...instance.gameState, ...message.payload };
        }
        if (session) {
          session.gameState = instance.gameState || {};
        }
        this.emit('state-update', { instanceId: message.instanceId, state: message.payload });
        break;

      case 'action':
        // User performed action in game
        await eventRouter.publish('activity.action', 'discord-bot', {
          activityId: message.instanceId,
          userId: message.userId,
          action: typeof message.payload === 'string' ? message.payload : JSON.stringify(message.payload),
          payload: typeof message.payload === 'object' ? message.payload : undefined,
        });
        break;

      case 'result':
        // Game completed with result
        await this.completeActivity(message.instanceId, message.payload as Omit<ActivityResult, 'instanceId' | 'userId'>);
        break;

      case 'error':
        // Error in Activity
        console.error(`[DiscordActivityManager] Activity error: ${message.instanceId}`, message.payload);
        instance.status = 'failed';
        await eventRouter.publish('activity.error', 'discord-bot', {
          activityId: message.instanceId,
          userId: message.userId,
          error: typeof message.payload === 'string' ? message.payload : JSON.stringify(message.payload),
          code: typeof message.payload === 'object' && 'code' in message.payload ? String(message.payload.code) : undefined,
        });
        break;
    }
  }

  /**
   * Complete an Activity and emit result
   */
  async completeActivity(
    instanceId: string,
    result: Omit<ActivityResult, 'instanceId' | 'userId' | 'activityType'>
  ): Promise<void> {
    const instance = this.activeInstances.get(instanceId);

    if (!instance) {
      console.warn(`[DiscordActivityManager] Attempted to complete unknown instance: ${instanceId}`);
      return;
    }

    instance.status = result.status === 'won' ? 'completed' : result.status === 'abandoned' ? 'completed' : 'completed';

    const fullResult: ActivityResult = {
      instanceId,
      userId: instance.userId,
      activityType: instance.activityType,
      status: result.status,
      completedAt: result.completedAt,
      ...(result.score !== undefined && { score: result.score }),
      ...(result.prizeAmount !== undefined && { prizeAmount: result.prizeAmount }),
      ...(result.entitlementConsumed !== undefined && { entitlementConsumed: result.entitlementConsumed }),
    };

    // Publish result event
    const startTime = instance.createdAt;
    const duration = Date.now() - startTime;
    await eventRouter.publish('activity.completed', 'discord-bot', {
      activityId: instanceId,
      userId: instance.userId,
      result: result,
      duration: duration,
    });

    console.log(`[DiscordActivityManager] Activity completed: ${instanceId} - Status: ${result.status}`);

    // Schedule cleanup in 5 minutes
    setTimeout(() => this.cleanupInstance(instanceId), 300000);
  }

  /**
   * Pause an Activity
   */
  async pauseActivity(instanceId: string): Promise<boolean> {
    const instance = this.activeInstances.get(instanceId);

    if (!instance) {
      return false;
    }

    instance.status = 'paused';
    await eventRouter.publish('activity.paused', 'discord-bot', { 
      activityId: instanceId,
      userId: instance.userId,
    });
    return true;
  }

  /**
   * Resume a paused Activity
   */
  async resumeActivity(instanceId: string): Promise<boolean> {
    const instance = this.activeInstances.get(instanceId);

    if (!instance || instance.status !== 'paused') {
      return false;
    }

    instance.status = 'active';
    await eventRouter.publish('activity.resumed', 'discord-bot', { 
      activityId: instanceId,
      userId: instance.userId,
    });
    return true;
  }

  /**
   * End an Activity prematurely
   */
  async endActivity(instanceId: string): Promise<boolean> {
    const instance = this.activeInstances.get(instanceId);

    if (!instance) {
      return false;
    }

    await this.completeActivity(instanceId, {
      status: 'abandoned',
      completedAt: Date.now(),
    });

    return true;
  }

  /**
   * Get all active instances for a user
   */
  getActiveInstancesForUser(userId: string): ActivityInstance[] {
    return Array.from(this.activeInstances.values()).filter((i) => i.userId === userId && i.status === 'active');
  }

  /**
   * Clean up an expired instance
   */
  private cleanupInstance(instanceId: string): void {
    this.activeInstances.delete(instanceId);
    this.sessionStore.delete(instanceId);
    console.log(`[DiscordActivityManager] Cleaned up instance: ${instanceId}`);
  }

  /**
   * Periodic cleanup of expired instances
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const toDelete: string[] = [];

      for (const [instanceId, instance] of this.activeInstances.entries()) {
        if (instance.expiresAt < now) {
          toDelete.push(instanceId);
        }
      }

      for (const instanceId of toDelete) {
        this.cleanupInstance(instanceId);
      }

      if (toDelete.length > 0) {
        console.log(`[DiscordActivityManager] Cleaned up ${toDelete.length} expired instances`);
      }
    }, 60000); // Run every minute
  }

  /**
   * Get session state for reconnection
   */
  getSessionState(instanceId: string): ActivitySessionState | undefined {
    return this.sessionStore.get(instanceId);
  }

  /**
   * Update session state (e.g., after reconnection)
   */
  updateSessionState(instanceId: string, updates: Partial<ActivitySessionState>): void {
    const session = this.sessionStore.get(instanceId);
    if (session) {
      Object.assign(session, updates);
      session.reconnectCount = (session.reconnectCount || 0) + 1;
    }
  }
}
