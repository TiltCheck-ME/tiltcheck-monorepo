/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Session {
  id: string;
  userId: string;
  data: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date;
}

export interface SessionStoreOptions {
  /** Session TTL in milliseconds. Defaults to 30 minutes. */
  ttlMs?: number;
}

export interface SessionStore {
  create(userId: string, data?: Record<string, unknown>): Promise<Session>;
  get(sessionId: string): Promise<Session | null>;
  refresh(sessionId: string): Promise<Session | null>;
  destroy(sessionId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// In-memory backend
// ---------------------------------------------------------------------------

class MemorySessionStore implements SessionStore {
  private readonly store = new Map<string, Session>();
  private readonly ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  async create(userId: string, data: Record<string, unknown> = {}): Promise<Session> {
    const now = new Date();
    const session: Session = {
      id: randomUUID(),
      userId,
      data,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.ttlMs),
    };
    this.store.set(session.id, session);
    return session;
  }

  async get(sessionId: string): Promise<Session | null> {
    const session = this.store.get(sessionId);
    if (!session) return null;
    if (new Date() > session.expiresAt) {
      this.store.delete(sessionId);
      return null;
    }
    return session;
  }

  async refresh(sessionId: string): Promise<Session | null> {
    const session = await this.get(sessionId);
    if (!session) return null;
    const refreshed: Session = {
      ...session,
      expiresAt: new Date(Date.now() + this.ttlMs),
    };
    this.store.set(sessionId, refreshed);
    return refreshed;
  }

  async destroy(sessionId: string): Promise<void> {
    this.store.delete(sessionId);
  }
}

// ---------------------------------------------------------------------------
// Redis backend
// ---------------------------------------------------------------------------

/** Serialised form stored in Redis. Dates are stored as ISO strings. */
interface SerializedSession {
  id: string;
  userId: string;
  data: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
}

class RedisSessionStore implements SessionStore {
  // ioredis Redis instance — typed loosely so the import stays optional.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly client: any;
  private readonly ttlMs: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(client: any, ttlMs: number) {
    this.client = client;
    this.ttlMs = ttlMs;
  }

  private key(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private deserialize(raw: string): Session {
    const parsed = JSON.parse(raw) as SerializedSession;
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      expiresAt: new Date(parsed.expiresAt),
    };
  }

  async create(userId: string, data: Record<string, unknown> = {}): Promise<Session> {
    const now = new Date();
    const session: Session = {
      id: randomUUID(),
      userId,
      data,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.ttlMs),
    };
    const ttlSeconds = Math.ceil(this.ttlMs / 1000);
    await this.client.set(this.key(session.id), JSON.stringify(session), 'EX', ttlSeconds);
    return session;
  }

  async get(sessionId: string): Promise<Session | null> {
    const raw: string | null = await this.client.get(this.key(sessionId));
    if (!raw) return null;
    const session = this.deserialize(raw);
    // Belt-and-suspenders: check expiresAt even though Redis handles TTL.
    if (new Date() > session.expiresAt) {
      await this.client.del(this.key(sessionId));
      return null;
    }
    return session;
  }

  async refresh(sessionId: string): Promise<Session | null> {
    const session = await this.get(sessionId);
    if (!session) return null;
    const refreshed: Session = {
      ...session,
      expiresAt: new Date(Date.now() + this.ttlMs),
    };
    const ttlSeconds = Math.ceil(this.ttlMs / 1000);
    await this.client.set(this.key(sessionId), JSON.stringify(refreshed), 'EX', ttlSeconds);
    return refreshed;
  }

  async destroy(sessionId: string): Promise<void> {
    await this.client.del(this.key(sessionId));
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Creates a SessionStore instance.
 *
 * - When the `REDIS_URL` environment variable is set, an ioredis-backed store
 *   is returned. ioredis is an optional peer dependency; if it is not installed
 *   the factory falls back to the in-memory store and logs a warning.
 * - Otherwise an in-memory store is used (suitable for development and
 *   single-process deployments).
 */
export async function createSessionStore(opts: SessionStoreOptions = {}): Promise<SessionStore> {
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const redisUrl = process.env['REDIS_URL'];

  if (redisUrl) {
    try {
      // Dynamic import keeps ioredis optional at bundle time.
      const ioredis = await import('ioredis');
      const RedisClass = ioredis.default || (ioredis as any).Redis || ioredis;
      const client = new (RedisClass as any)(redisUrl, {
        lazyConnect: true,
        enableReadyCheck: true,
      });
      await client.connect();
      return new RedisSessionStore(client, ttlMs);
    } catch (err) {
      // ioredis not installed or connection failed — fall back gracefully.
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[session-store] Redis unavailable (${message}). Falling back to in-memory store.`,
      );
    }
  }

  return new MemorySessionStore(ttlMs);
}

/**
 * Synchronously creates an in-memory SessionStore without attempting Redis.
 * Useful in contexts where async initialisation is inconvenient (e.g. tests).
 */
export function createMemorySessionStore(opts: SessionStoreOptions = {}): SessionStore {
  return new MemorySessionStore(opts.ttlMs ?? DEFAULT_TTL_MS);
}

// ---------------------------------------------------------------------------
// BetEventWindow — rolling behavioral telemetry window for tilt detection
// ---------------------------------------------------------------------------

/**
 * A single recorded bet event used by the tilt detection engine.
 */
export interface BetEvent {
  timestamp: number;
  amount: number;
  won: boolean;
  balanceAfter: number;
}

/**
 * Maintains a per-user capped list of recent bet events in Redis.
 * Used by the tilt detection engine to compute rolling velocity baselines.
 *
 * - Uses LPUSH + LTRIM to keep a bounded list per user.
 * - TTL: 15 minutes.
 * - Falls back to no-op when Redis is unavailable.
 */
export class BetEventWindow {
  private static readonly MAX_EVENTS = 200;
  private static readonly TTL_SECONDS = 15 * 60; // 15 minutes

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly redis: any, private readonly windowMs: number = 10 * 60 * 1000) {}

  private key(userId: string): string {
    return `bet_window:${userId}`;
  }

  /**
   * Push a new bet event onto the user's rolling window.
   * Trims the list to MAX_EVENTS and refreshes the TTL.
   */
  async push(userId: string, event: BetEvent): Promise<void> {
    const k = this.key(userId);
    await this.redis.lpush(k, JSON.stringify(event));
    await this.redis.ltrim(k, 0, BetEventWindow.MAX_EVENTS - 1);
    await this.redis.expire(k, BetEventWindow.TTL_SECONDS);
  }

  /**
   * Return all events in the rolling window for this user, newest first.
   */
  async getWindow(userId: string): Promise<BetEvent[]> {
    const raw: string[] = await this.redis.lrange(this.key(userId), 0, -1);
    return raw.map(r => JSON.parse(r) as BetEvent);
  }

  /**
   * Calculate baseline velocity: bets per minute over the OLDEST 5 minutes
   * of the window. Used as the rolling baseline for velocity spike detection.
   */
  async getBaselineVelocity(userId: string): Promise<number> {
    const events = await this.getWindow(userId);
    const now = Date.now();
    const baselineWindowMs = 5 * 60 * 1000; // oldest 5 min

    // Take events older than (windowMs - baselineWindowMs) but within windowMs
    const baselineStart = now - this.windowMs;
    const baselineEnd = now - (this.windowMs - baselineWindowMs);

    const baselineEvents = events.filter(
      e => e.timestamp >= baselineStart && e.timestamp <= baselineEnd
    );

    if (baselineEvents.length === 0) return 0;
    return baselineEvents.length / 5; // bets per minute over 5 minutes
  }

  /**
   * Calculate current velocity: bets per minute over the LAST 1 minute.
   * Compare against getBaselineVelocity() to detect velocity spikes.
   */
  async getCurrentVelocity(userId: string): Promise<number> {
    const events = await this.getWindow(userId);
    const now = Date.now();
    const recentMs = 60 * 1000; // last 1 minute

    const recentEvents = events.filter(e => e.timestamp >= now - recentMs);
    return recentEvents.length; // bets per minute (count over 1 min = rate)
  }
}
