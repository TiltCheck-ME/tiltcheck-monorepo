/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * @tiltcheck/test-utils
 * Shared mocks and testing helpers for TiltCheck monorepo
 */

import { vi } from 'vitest';
import type { 
  TiltCheckEvent, 
  EventType, 
  AuthContext, 
  SessionType, 
  User 
} from '@tiltcheck/types';

/**
 * Mock Event Router
 * Collects published events for verification in tests
 */
export class MockEventRouter {
  public publishedEvents: TiltCheckEvent[] = [];
  public subscribers: Map<string, Function[]> = new Map();

  publish = vi.fn(async (type: string, source: string, data: any, userId?: string) => {
    const event: TiltCheckEvent = {
      id: `test-evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: type as any,
      timestamp: Date.now(),
      source: source as any,
      userId,
      data
    };
    this.publishedEvents.push(event);
    
    // Call subscribers
    const handlers = this.subscribers.get(type) || [];
    for (const handler of handlers) {
      try { await handler(event); } catch (e) { console.error(`MockEventRouter handler failed for ${type}`, e); }
    }
    return event;
  });

  subscribe = vi.fn((type: string, handler: Function, _name?: string) => {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, []);
    }
    this.subscribers.get(type)!.push(handler);
    return () => {
      const handlers = this.subscribers.get(type) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    };
  });

  clear() {
    this.publishedEvents = [];
    this.publish.mockClear();
    this.subscribe.mockClear();
  }

  getLastEvent<T extends EventType>(type: T): TiltCheckEvent<T> | undefined {
    return this.publishedEvents.reverse().find(e => e.type === type) as any;
  }
}

/**
 * Mock Database client
 */
export class MockDatabase {
  public stores: Map<string, Map<string, any>> = new Map();

  constructor() {
    this.stores.set('users', new Map());
    this.stores.set('trust_scores', new Map());
    this.stores.set('tips', new Map());
  }

  getUser = vi.fn(async (id: string) => this.stores.get('users')!.get(id) || null);
  updateUser = vi.fn(async (id: string, data: any) => {
    const current = this.stores.get('users')!.get(id) || {};
    const updated = { ...current, ...data, id };
    this.stores.get('users')!.set(id, updated);
    return updated;
  });

  updateTrustScore = vi.fn(async (userId: string, score: number) => {
    this.stores.get('trust_scores')!.set(userId, score);
    return { userId, score };
  });

  clear() {
    this.stores.forEach(s => s.clear());
    this.getUser.mockClear();
    this.updateUser.mockClear();
    this.updateTrustScore.mockClear();
  }
}

/**
 * Creates a mock AuthContext for testing authenticated routes
 */
export function createAuthContextMock(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    userId: 'test-user-id',
    sessionType: 'user' as SessionType,
    discordId: 'test-discord-id',
    roles: ['user'],
    isAdmin: false,
    session: {
      userId: 'test-user-id',
      type: 'user' as SessionType,
      createdAt: Date.now()
    },
    ...overrides
  };
}

/**
 * Standard mock user
 */
export const MOCK_USER: User = {
  id: 'test-discord-id',
  walletAddress: '0x1234567890abcdef',
  createdAt: new Date(),
  updatedAt: new Date(),
  trustScore: 75
};
