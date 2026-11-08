/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  recordActivityFeedEvent,
  getActivityFeed,
  clearActivityFeed,
  ACTIVITY_FEED_STORAGE_KEY,
  MAX_ACTIVITY_FEED_ITEMS,
} from '../../src/activity-feed.js';

describe('activity-feed', () => {
  let mockStore: Record<string, unknown> = {};

  beforeEach(() => {
    mockStore = {};
    (globalThis as unknown as { chrome: unknown }).chrome = {
      storage: {
        local: {
          get: vi.fn((keys: string[]) => {
            const result: Record<string, unknown> = {};
            for (const k of keys) {
              if (k in mockStore) result[k] = mockStore[k];
            }
            return Promise.resolve(result);
          }),
          set: vi.fn((obj: Record<string, unknown>) => {
            Object.assign(mockStore, obj);
            return Promise.resolve();
          }),
          remove: vi.fn((keys: string[]) => {
            for (const k of keys) {
              delete mockStore[k];
            }
            return Promise.resolve();
          }),
        },
      },
    };
  });

  it('records an activity event with timestamp', async () => {
    await recordActivityFeedEvent('Spin brake locked spin button', 'info');
    const feed = await getActivityFeed();
    expect(feed).toHaveLength(1);
    expect(feed[0].msg).toBe('Spin brake locked spin button');
    expect(feed[0].type).toBe('info');
    expect(typeof feed[0].ts).toBe('number');
  });

  it('caps the feed at MAX_ACTIVITY_FEED_ITEMS', async () => {
    for (let i = 0; i < MAX_ACTIVITY_FEED_ITEMS + 10; i++) {
      await recordActivityFeedEvent(`Event ${i}`, 'warn');
    }
    const feed = await getActivityFeed();
    expect(feed).toHaveLength(MAX_ACTIVITY_FEED_ITEMS);
    expect(feed[feed.length - 1].msg).toBe(`Event ${MAX_ACTIVITY_FEED_ITEMS + 9}`);
  });

  it('clears the activity feed', async () => {
    await recordActivityFeedEvent('Test event', 'danger');
    expect(await getActivityFeed()).toHaveLength(1);
    await clearActivityFeed();
    expect(await getActivityFeed()).toHaveLength(0);
  });

  it('handles missing storage API gracefully without throwing', async () => {
    (globalThis as unknown as { chrome: unknown }).chrome = {};
    await expect(recordActivityFeedEvent('Safe fallback', 'info')).resolves.toBeUndefined();
    await expect(getActivityFeed()).resolves.toEqual([]);
    await expect(clearActivityFeed()).resolves.toBeUndefined();
  });
});
