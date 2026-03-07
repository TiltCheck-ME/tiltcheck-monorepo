/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * TiltCheck Event Router
 * 
 * Central event bus for the TiltCheck ecosystem.
 * Modules communicate through events, not direct calls.
 * 
 * Philosophy:
 * - Loose coupling between modules
 * - Async by default
 * - Failed handlers don't crash the system
 * - Event history for debugging
 * - Easy to test and monitor
 */

import type {
  TiltCheckEvent,
  EventType,
  EventHandler,
  EventSubscription,
  ModuleId,
} from '@tiltcheck/types';
import { EventEmitter } from 'events';

// Simple UUID generator
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export class EventRouter {
  private emitter: EventEmitter;
  private subscriptions: Map<EventType, EventSubscription[]>;
  private eventHistory: TiltCheckEvent[];
  private maxHistorySize: number;

  constructor(maxHistorySize = 1000) {
    this.emitter = new EventEmitter();
    this.subscriptions = new Map();
    this.eventHistory = [];
    this.maxHistorySize = maxHistorySize;

    // Increase listener limit for high-traffic systems
    this.emitter.setMaxListeners(100);
  }

  /**
   * Subscribe to an event type
   */
  subscribe(
    eventType: EventType,
    handler: EventHandler,
    moduleId: ModuleId
  ): () => void {
    const subscription: EventSubscription = {
      eventType,
      handler,
      moduleId,
    };

    // Get or create subscription array for this event type
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const subs = this.subscriptions.get(eventType)!;
    subs.push(subscription);

    // Set up EventEmitter listener
    this.emitter.on(eventType, handler);

    console.log(`[EventRouter] ${moduleId} subscribed to ${eventType}`);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(eventType, handler, moduleId);
    };
  }

  /**
   * Unsubscribe from an event type
   */
  private unsubscribe(
    eventType: EventType,
    handler: EventHandler,
    moduleId: ModuleId
  ): void {
    const subs = this.subscriptions.get(eventType);
    if (!subs) return;

    const index = subs.findIndex(
      (s) => s.handler === handler && s.moduleId === moduleId
    );

    if (index !== -1) {
      subs.splice(index, 1);
      this.emitter.off(eventType, handler);
      console.log(`[EventRouter] ${moduleId} unsubscribed from ${eventType}`);
    }
  }

  /**
   * Publish an event to all subscribers
   */
  async publish<T = any>(
    type: EventType,
    source: ModuleId,
    data: T,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: TiltCheckEvent<T> = {
      id: generateId(),
      type,
      timestamp: Date.now(),
      source,
      userId,
      data,
      metadata,
    };

    // Store in history
    this.addToHistory(event);

    // Log the event
    console.log(`[EventRouter] Publishing: ${type} from ${source}`, {
      eventId: event.id,
      userId,
    });

    // Emit to all subscribers
    // Handlers are called asynchronously and errors are caught
    const subscribers = this.subscriptions.get(type) || [];

    for (const sub of subscribers) {
      try {
        await Promise.resolve(sub.handler(event));
      } catch (error) {
        console.error(
          `[EventRouter] Error in ${sub.moduleId} handling ${type}:`,
          error
        );
        // Don't let one failed handler crash others
      }
    }
  }

  /**
   * Get event history (useful for debugging)
   */
  getHistory(filter?: {
    eventType?: EventType;
    source?: ModuleId;
    userId?: string;
    limit?: number;
  }): TiltCheckEvent[] {
    let filtered = this.eventHistory;

    if (filter?.eventType) {
      filtered = filtered.filter((e) => e.type === filter.eventType);
    }

    if (filter?.source) {
      filtered = filtered.filter((e) => e.source === filter.source);
    }

    if (filter?.userId) {
      filtered = filtered.filter((e) => e.userId === filter.userId);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  /**
   * Get active subscriptions (for monitoring)
   */
  getSubscriptions(): Map<EventType, EventSubscription[]> {
    return new Map(this.subscriptions);
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
    console.log('[EventRouter] Event history cleared');
  }

  /**
   * Add event to history with size limit
   */
  private addToHistory(event: TiltCheckEvent): void {
    this.eventHistory.push(event);

    // Keep history size manageable
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get stats about the event router
   */
  getStats() {
    const subscriptionCount = Array.from(this.subscriptions.values()).reduce(
      (sum, subs) => sum + subs.length,
      0
    );

    return {
      totalSubscriptions: subscriptionCount,
      eventTypes: this.subscriptions.size,
      historySize: this.eventHistory.length,
      maxHistorySize: this.maxHistorySize,
    };
  }
}

// Singleton instance for easy import
export const eventRouter = new EventRouter();
