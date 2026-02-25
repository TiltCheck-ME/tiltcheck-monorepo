/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

/** A single cache entry holding a value and its absolute expiry timestamp (ms). */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Generic in-memory TTL cache backed purely by Node built-ins (Map + Date.now).
 *
 * Expired entries are evicted lazily on read; no background timer is required
 * for correctness, keeping the implementation dependency-free and GC-friendly.
 */
export class TtlCache {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly store = new Map<string, CacheEntry<any>>();
  private readonly defaultTtlMs: number;

  /**
   * @param defaultTtlMs - TTL used when none is supplied to `set()`.
   *                       Defaults to 30 000 ms (30 seconds).
   */
  constructor(defaultTtlMs = 30_000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Return the cached value for `key`, or `undefined` if it is absent or
   * has already expired.  An expired entry is removed eagerly on access.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Store `value` under `key` with an optional per-entry TTL.
   *
   * @param key    - Cache key.
   * @param value  - Value to cache (any serialisable type).
   * @param ttlMs  - How long the entry is valid in milliseconds.
   *                 Falls back to the instance `defaultTtlMs` when omitted.
   */
  set<T>(key: string, value: T, ttlMs: number = this.defaultTtlMs): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Remove a single entry regardless of whether it has expired.
   * Silently ignores missing keys.
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Remove every entry from the cache. */
  clear(): void {
    this.store.clear();
  }

  /** Number of entries currently held (includes entries that may have expired
   *  but have not yet been evicted by a `get` call). */
  get size(): number {
    return this.store.size;
  }
}

/**
 * Shared singleton cache for the pricing-oracle module.
 *
 * Default TTL: 30 seconds — appropriate for price data that is refreshed
 * frequently but should not hammer the upstream Jupiter API on every request.
 */
export const priceCache = new TtlCache(30_000);
