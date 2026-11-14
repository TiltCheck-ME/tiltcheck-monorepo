// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
/**
 * Short cache and rate limiting.
 * Cache: Workers KV when ASK_KV is bound, else memory in this isolate (the Cache API does
 * nothing on workers.dev, so it is not used).
 * Rate limit: the Workers rate-limit binding ASK_LIMITER when bound, else a memory window.
 */

const memory = new Map();
const MEMORY_MAX = 500;

export function memoryStore() {
  return {
    async get(key) {
      const hit = memory.get(key);
      if (!hit) return null;
      if (hit.exp < Date.now()) {
        memory.delete(key);
        return null;
      }
      return hit.value;
    },
    async put(key, value, ttlSec) {
      if (memory.size >= MEMORY_MAX) memory.delete(memory.keys().next().value);
      memory.set(key, { value, exp: Date.now() + ttlSec * 1000 });
    },
  };
}

export function makeStore(env) {
  const kv = env && env.ASK_KV;
  if (!kv) return memoryStore();
  return {
    async get(key) {
      return kv.get(key);
    },
    async put(key, value, ttlSec) {
      await kv.put(key, value, { expirationTtl: Math.max(60, ttlSec) });
    },
  };
}

export async function cached(store, key, ttlSec, fn) {
  const hit = await store.get(key);
  if (hit !== null && hit !== undefined) return { value: JSON.parse(hit), cached: true };
  const value = await fn();
  await store.put(key, JSON.stringify(value), ttlSec);
  return { value, cached: false };
}

const windows = new Map();

/**
 * @returns {Promise<boolean>} true when the caller may go ahead
 */
export async function allow(env, key, { limit = 6, windowMs = 60_000, now = Date.now() } = {}) {
  if (env && env.ASK_LIMITER && typeof env.ASK_LIMITER.limit === 'function') {
    try {
      const { success } = await env.ASK_LIMITER.limit({ key });
      return Boolean(success);
    } catch {
      // Fall through to the memory window.
    }
  }
  const list = (windows.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= limit) {
    windows.set(key, list);
    return false;
  }
  list.push(now);
  windows.set(key, list);
  if (windows.size > 5000) windows.clear();
  return true;
}

export function resetMemory() {
  memory.clear();
  windows.clear();
}
