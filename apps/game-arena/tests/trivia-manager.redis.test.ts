// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { eventRouter } from '@tiltcheck/event-router';
import { redisClient } from '../src/redis-client.js';

import { triviaManager } from '../src/trivia-manager.js';

const TEST_STATE_FILE = path.resolve(process.cwd(), 'data/trivia-manager.test-state.json');

describe('triviaManager (redis)', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T00:00:00.000Z'));
    vi.spyOn(eventRouter, 'publish').mockImplementation(() => undefined);

    // Spy on redis client methods to avoid real Redis calls and to assert behavior
    vi.spyOn(redisClient, 'isAvailable').mockReturnValue(true as any);
    vi.spyOn(redisClient, 'getSnapshot').mockResolvedValue(null as any);
    vi.spyOn(redisClient, 'setSnapshot').mockResolvedValue(undefined as any);
    vi.spyOn(redisClient, 'publish').mockResolvedValue(undefined as any);

    process.env.TRIVIA_FORCE_REDIS = 'true';
    await triviaManager.initialize();
  });

  afterEach(async () => {
    delete process.env.TRIVIA_FORCE_REDIS;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('persists snapshot to Redis when enabled', async () => {
    await triviaManager.scheduleGame({ category: 'casino', totalRounds: 1, startTime: Date.now() + 1000 });
    // scheduleGame triggers persistState; ensure setSnapshot was called
    expect((redisClient.setSnapshot as any).mock.calls.length).toBeGreaterThan(0);
    expect((redisClient.publish as any).mock.calls.length).toBeGreaterThan(0);
  });
});
