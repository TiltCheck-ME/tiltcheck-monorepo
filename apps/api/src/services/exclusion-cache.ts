// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
/**
 * Exclusion Cache Service
 * Redis-backed cache for ForbiddenGamesProfile.
 * DB is source of truth; Redis provides sub-millisecond lookups for the
 * /rgaas/check-game hot path and the Chrome Extension poll.
 *
 * Graceful degradation: if Redis is unavailable, all operations fall through
 * to the database without surfacing an error to callers.
 */

import { buildForbiddenGamesProfile } from '@tiltcheck/db';
import type { ForbiddenGamesProfile, GameCategory } from '@tiltcheck/types';

const CACHE_TTL_SECONDS = 300; // 5 minutes
const KEY_PREFIX = 'excl:';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisClient: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getRedis(): Promise<any> {
  if (redisClient) return redisClient;
  const url = process.env['REDIS_URL'];
  if (!url) return null;
  try {
    const ioredis = await import('ioredis');
    const RedisClass = (ioredis as any).default || (ioredis as any).Redis || ioredis;
    redisClient = new (RedisClass as any)(url, { lazyConnect: true, enableReadyCheck: false });
    redisClient.on('error', () => { /* suppress — we degrade gracefully */ });
    return redisClient;
  } catch {
    return null;
  }
}

function cacheKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

/**
 * Load profile from Redis. Returns null on miss or Redis unavailability.
 */
async function loadFromCache(userId: string): Promise<ForbiddenGamesProfile | null> {
  const redis = await getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(cacheKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as ForbiddenGamesProfile;
  } catch {
    return null;
  }
}

/**
 * Persist profile to Redis with TTL. Silent on failure.
 */
async function writeToCache(profile: ForbiddenGamesProfile): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.setex(cacheKey(profile.userId), CACHE_TTL_SECONDS, JSON.stringify(profile));
  } catch {
    // degraded — no-op
  }
}

/**
 * Invalidate cached profile for a user. Called after any write to user_game_exclusions.
 */
export async function invalidateExclusionCache(userId: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.del(cacheKey(userId));
  } catch {
    // degraded — no-op
  }
}

/**
 * Get (or build and cache) the ForbiddenGamesProfile for a user.
 */
export async function getForbiddenGamesProfile(userId: string): Promise<ForbiddenGamesProfile> {
  const cached = await loadFromCache(userId);
  if (cached) return cached;

  const profile = await buildForbiddenGamesProfile(userId);
  await writeToCache(profile);
  return profile;
}

/**
 * Check whether a specific game is blocked for a user.
 * Uses cached profile so the hot path stays fast.
 */
export async function isGameBlocked(
  userId: string,
  gameId?: string | null,
  category?: GameCategory | null
): Promise<boolean> {
  if (!gameId && !category) return false;

  const profile = await getForbiddenGamesProfile(userId);

  if (gameId && profile.blockedGameIds.includes(gameId)) return true;
  if (category && profile.blockedCategories.includes(category)) return true;
  return false;
}
