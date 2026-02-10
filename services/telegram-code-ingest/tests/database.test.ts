import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCodeDatabase } from '../src/database.js';
import type { PromoCode } from '../src/types.js';

describe('InMemoryCodeDatabase', () => {
  let database: InMemoryCodeDatabase;

  beforeEach(() => {
    database = new InMemoryCodeDatabase();
  });

  it('should save and retrieve a code', async () => {
    const code: PromoCode = {
      id: 'test-id-1',
      code: 'TESTCODE123',
      sourceChannel: 'test-channel',
      detectedAt: new Date(),
      status: 'active',
    };

    await database.saveCode(code);
    const retrieved = await database.getCode('TESTCODE123');

    expect(retrieved).toEqual(code);
  });

  it('should return null for non-existent code', async () => {
    const result = await database.getCode('NONEXISTENT');
    expect(result).toBeNull();
  });

  it('should get all active codes', async () => {
    const activeCode: PromoCode = {
      id: 'active-1',
      code: 'ACTIVE1',
      sourceChannel: 'test-channel',
      detectedAt: new Date(),
      status: 'active',
    };

    const expiredCode: PromoCode = {
      id: 'expired-1',
      code: 'EXPIRED1',
      sourceChannel: 'test-channel',
      detectedAt: new Date(),
      status: 'expired',
    };

    await database.saveCode(activeCode);
    await database.saveCode(expiredCode);

    const activeCodes = await database.getActiveCodes();

    expect(activeCodes).toHaveLength(1);
    expect(activeCodes[0].code).toBe('ACTIVE1');
  });

  it('should update code status', async () => {
    const code: PromoCode = {
      id: 'test-id-2',
      code: 'UPDATETEST',
      sourceChannel: 'test-channel',
      detectedAt: new Date(),
      status: 'active',
    };

    await database.saveCode(code);
    await database.updateCodeStatus('UPDATETEST', 'expired');

    const updated = await database.getCode('UPDATETEST');
    expect(updated?.status).toBe('expired');
  });

  it('should handle updating non-existent code gracefully', async () => {
    await expect(
      database.updateCodeStatus('NONEXISTENT', 'expired')
    ).resolves.not.toThrow();
  });

  it('should save code with metadata', async () => {
    const code: PromoCode = {
      id: 'test-id-3',
      code: 'METACODE',
      sourceChannel: 'test-channel',
      detectedAt: new Date(),
      status: 'active',
      metadata: {
        messageId: 'msg-123',
        messageText: 'Free code: METACODE',
        wagersRequired: 5,
        eligibilityRules: ['KYC required', 'New users only'],
      },
    };

    await database.saveCode(code);
    const retrieved = await database.getCode('METACODE');

    expect(retrieved?.metadata?.messageId).toBe('msg-123');
    expect(retrieved?.metadata?.wagersRequired).toBe(5);
    expect(retrieved?.metadata?.eligibilityRules).toHaveLength(2);
  });

  it('should handle multiple active codes', async () => {
    const codes: PromoCode[] = [
      {
        id: 'id-1',
        code: 'CODE1',
        sourceChannel: 'channel-1',
        detectedAt: new Date(),
        status: 'active',
      },
      {
        id: 'id-2',
        code: 'CODE2',
        sourceChannel: 'channel-2',
        detectedAt: new Date(),
        status: 'active',
      },
      {
        id: 'id-3',
        code: 'CODE3',
        sourceChannel: 'channel-1',
        detectedAt: new Date(),
        status: 'active',
      },
    ];

    for (const code of codes) {
      await database.saveCode(code);
    }

    const activeCodes = await database.getActiveCodes();
    expect(activeCodes).toHaveLength(3);
  });
});
