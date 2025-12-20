import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryClaimerDatabase } from '../src/database.js';
import type { ClaimHistory } from '../src/types.js';

describe('InMemoryClaimerDatabase', () => {
  let database: InMemoryClaimerDatabase;

  beforeEach(() => {
    database = new InMemoryClaimerDatabase();
  });

  it('should store and retrieve user API key', async () => {
    const userId = 'user-123';
    const apiKey = 'test-api-key-456';

    await database.storeUserApiKey(userId, apiKey);
    const retrieved = await database.getUserApiKey(userId);

    expect(retrieved).toBe(apiKey);
  });

  it('should return null for non-existent API key', async () => {
    const result = await database.getUserApiKey('non-existent-user');
    expect(result).toBeNull();
  });

  it('should save and retrieve claim history', async () => {
    const history: ClaimHistory = {
      id: 'claim-1',
      userId: 'user-123',
      code: 'TESTCODE',
      status: 'claimed',
      rewardType: 'bonus',
      rewardAmount: 10,
      rewardCurrency: 'USD',
      attemptedAt: new Date(),
    };

    await database.saveClaimHistory(history);
    const retrieved = await database.getClaimHistory('user-123');

    expect(retrieved).toHaveLength(1);
    expect(retrieved[0]).toEqual(history);
  });

  it('should retrieve empty history for new user', async () => {
    const history = await database.getClaimHistory('new-user');
    expect(history).toEqual([]);
  });

  it('should limit claim history results', async () => {
    const userId = 'user-456';

    // Add 10 claim records
    for (let i = 0; i < 10; i++) {
      const history: ClaimHistory = {
        id: `claim-${i}`,
        userId,
        code: `CODE${i}`,
        status: 'claimed',
        attemptedAt: new Date(),
      };
      await database.saveClaimHistory(history);
    }

    const limited = await database.getClaimHistory(userId, 5);
    expect(limited).toHaveLength(5);
  });

  it('should check rate limit allows first request', async () => {
    const userId = 'user-789';
    const allowed = await database.checkRateLimit(userId);
    expect(allowed).toBe(true);
  });

  it('should increment rate limit counter', async () => {
    const userId = 'user-789';

    await database.incrementRateLimit(userId);
    const allowed = await database.checkRateLimit(userId);

    expect(allowed).toBe(true);
  });

  it('should enforce rate limit after max requests', async () => {
    const userId = 'user-999';
    process.env.CLAIMS_PER_MINUTE_PER_USER = '3';

    // Increment 3 times (at limit)
    for (let i = 0; i < 3; i++) {
      await database.incrementRateLimit(userId);
    }

    const allowed = await database.checkRateLimit(userId);
    expect(allowed).toBe(false);

    delete process.env.CLAIMS_PER_MINUTE_PER_USER;
  });

  it('should reset rate limit after window expires', async () => {
    const userId = 'user-time';
    const realDateNow = Date.now;
    let currentTime = Date.now();

    // Mock Date.now() to control time
    vi.spyOn(Date, 'now').mockImplementation(() => currentTime);
    
    // Increment to limit
    for (let i = 0; i < 5; i++) {
      await database.incrementRateLimit(userId);
    }

    // Should be at limit
    expect(await database.checkRateLimit(userId)).toBe(false);

    // Advance time by more than 60 seconds (rate limit window)
    currentTime += 61000;
    
    // Window should have expired, allowing new requests
    const allowed = await database.checkRateLimit(userId);
    expect(allowed).toBe(true);

    // Restore Date.now
    vi.spyOn(Date, 'now').mockRestore();
  });

  it('should save failed claim history', async () => {
    const history: ClaimHistory = {
      id: 'claim-failed',
      userId: 'user-123',
      code: 'FAILCODE',
      status: 'failed',
      reason: 'API key invalid',
      attemptedAt: new Date(),
    };

    await database.saveClaimHistory(history);
    const retrieved = await database.getClaimHistory('user-123');

    expect(retrieved[0].status).toBe('failed');
    expect(retrieved[0].reason).toBe('API key invalid');
  });

  it('should save skipped claim history', async () => {
    const history: ClaimHistory = {
      id: 'claim-skipped',
      userId: 'user-456',
      code: 'SKIPCODE',
      status: 'skipped',
      reason: 'Not eligible',
      attemptedAt: new Date(),
    };

    await database.saveClaimHistory(history);
    const retrieved = await database.getClaimHistory('user-456');

    expect(retrieved[0].status).toBe('skipped');
    expect(retrieved[0].reason).toBe('Not eligible');
  });

  it('should store claim history in reverse chronological order', async () => {
    const userId = 'user-chrono';

    const history1: ClaimHistory = {
      id: 'claim-1',
      userId,
      code: 'CODE1',
      status: 'claimed',
      attemptedAt: new Date(2024, 0, 1),
    };

    const history2: ClaimHistory = {
      id: 'claim-2',
      userId,
      code: 'CODE2',
      status: 'claimed',
      attemptedAt: new Date(2024, 0, 2),
    };

    await database.saveClaimHistory(history1);
    await database.saveClaimHistory(history2);

    const retrieved = await database.getClaimHistory(userId);

    // Most recent should be first
    expect(retrieved[0].code).toBe('CODE2');
    expect(retrieved[1].code).toBe('CODE1');
  });
});
