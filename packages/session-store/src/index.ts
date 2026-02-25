/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

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
      const { default: Redis } = await import('ioredis');
      const client = new Redis(redisUrl, {
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
