// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { redisClient } from '../src/redis-client.js';
import { triviaManager } from '../src/trivia-manager.js';

describe('triviaManager persistence status', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T00:00:00.000Z'));
    // Mock redis client to appear available and return a snapshot
    vi.spyOn(redisClient, 'isAvailable').mockReturnValue(true as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('prefers Redis snapshot when available', async () => {
    const raw = JSON.stringify({ version: 1, savedAt: Date.now(), activeGame: null, completedGames: [], auditLog: [] });
    vi.spyOn(redisClient, 'getSnapshot').mockResolvedValue(raw as any);

    await triviaManager.initialize();

    const status = await triviaManager.getPersistenceStatus();
    expect(status.snapshotExists).toBe(true);
    expect(status.snapshotSizeBytes).toBe(Buffer.byteLength(raw, 'utf8'));
    expect(typeof status.stateFilePath).toBe('string');
    expect(status.stateFilePath.startsWith('redis://')).toBe(true);
  });
});