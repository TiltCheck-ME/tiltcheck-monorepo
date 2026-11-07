/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-06 */
/**
 * @vitest-environment jsdom
 * Automated high-tilt cooldown vault tests.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildAutoLockVaultUrl,
  shouldTriggerAutoLock,
  executeTiltAutoLock,
  checkAndTriggerAutoLock,
} from '../../src/tilt-auto-lock.js';
import {
  TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY,
  TILTCHECK_COOLDOWN_WALLET_KEY,
  TILTCHECK_COOLDOWN_SOURCE_KEY,
  TILTCHECK_AUTO_LOCK_ON_TILT_KEY,
  TILTCHECK_AUTO_LOCK_THRESHOLD_KEY,
  TILTCHECK_AUTO_LOCK_DURATION_KEY,
} from '../../src/core-options.js';

describe('tilt-auto-lock module', () => {
  const testWallet = '7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2';
  let storageData: Record<string, any>;

  beforeEach(() => {
    storageData = {};
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn((keys: string[]) => {
            const res: Record<string, any> = {};
            for (const k of keys) res[k] = storageData[k];
            return Promise.resolve(res);
          }),
          set: vi.fn((items: Record<string, any>) => {
            Object.assign(storageData, items);
            return Promise.resolve();
          }),
        },
      },
      runtime: {
        sendMessage: vi.fn(),
      },
    });
  });

  describe('buildAutoLockVaultUrl', () => {
    it('constructs complete vault URL with wallet and parameters', () => {
      const url = buildAutoLockVaultUrl({
        wallet: testWallet,
        duration: 86400,
        source: 'auto_tilt',
      });
      expect(url).toContain('https://tiltcheck.me/cooldown?');
      expect(url).toContain(`wallet=${encodeURIComponent(testWallet)}`);
      expect(url).toContain('scope=all');
      expect(url).toContain('duration=86400');
      expect(url).toContain('source=auto_tilt');
    });

    it('constructs vault URL without wallet when null', () => {
      const url = buildAutoLockVaultUrl({
        wallet: null,
        duration: 3600,
      });
      expect(url).toContain('https://tiltcheck.me/cooldown?');
      expect(url).not.toContain('wallet=');
      expect(url).toContain('scope=all');
      expect(url).toContain('duration=3600');
      expect(url).toContain('source=auto_tilt');
    });
  });

  describe('shouldTriggerAutoLock', () => {
    it('returns false when autoLockEnabled is false', () => {
      const result = shouldTriggerAutoLock({
        tiltRisk: 85,
        threshold: 75,
        autoLockEnabled: false,
      });
      expect(result).toBe(false);
    });

    it('returns false when tiltRisk is below threshold', () => {
      const result = shouldTriggerAutoLock({
        tiltRisk: 74,
        threshold: 75,
        autoLockEnabled: true,
      });
      expect(result).toBe(false);
    });

    it('returns true when tiltRisk reaches threshold and no lock is active', () => {
      const result = shouldTriggerAutoLock({
        tiltRisk: 75,
        threshold: 75,
        autoLockEnabled: true,
        cooldownActiveUntil: 0,
        now: 1000,
      });
      expect(result).toBe(true);
    });

    it('returns false when an active cooldown lock is already running', () => {
      const now = 10000;
      const result = shouldTriggerAutoLock({
        tiltRisk: 90,
        threshold: 75,
        autoLockEnabled: true,
        cooldownActiveUntil: 20000,
        now,
      });
      expect(result).toBe(false);
    });

    it('returns true when prior lock has expired', () => {
      const now = 20000;
      const result = shouldTriggerAutoLock({
        tiltRisk: 80,
        threshold: 75,
        autoLockEnabled: true,
        cooldownActiveUntil: 15000,
        now,
      });
      expect(result).toBe(true);
    });
  });

  describe('executeTiltAutoLock', () => {
    it('updates storage, dispatches DOM events, and notifies background', async () => {
      const now = 1700000000000;
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      const postMessageSpy = vi.spyOn(window, 'postMessage');

      const result = await executeTiltAutoLock({
        tiltRisk: 85,
        wallet: testWallet,
        indicators: ['rage_betting', 'loss_chasing'],
        duration: 86400,
        now,
        openPrompt: true,
      });

      expect(result.triggered).toBe(true);
      expect(result.activeUntil).toBe(now + 86400 * 1000);
      expect(result.wallet).toBe(testWallet);
      expect(result.duration).toBe(86400);

      // Verify chrome.storage.local
      expect(storageData[TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]).toBe(now + 86400 * 1000);
      expect(storageData[TILTCHECK_COOLDOWN_WALLET_KEY]).toBe(testWallet);
      expect(storageData[TILTCHECK_COOLDOWN_SOURCE_KEY]).toBe('auto_tilt');
      expect(storageData['tiltcheck_last_auto_lock']).toEqual({
        timestamp: now,
        tiltRisk: 85,
        indicators: ['rage_betting', 'loss_chasing'],
        duration: 86400,
      });

      // Verify DOM CustomEvent
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TILTCHECK_COOLDOWN_LOCK_UPDATED',
        })
      );

      // Verify window postMessage
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'COOLDOWN_AUTO_LOCK_TRIGGERED',
          source: 'TILTCHECK_CONTENT_SCRIPT',
        }),
        '*'
      );

      // Verify runtime message
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'trigger_tilt_auto_lock',
        wallet: testWallet,
        duration: 86400,
        tiltRisk: 85,
        indicators: ['rage_betting', 'loss_chasing'],
        openPrompt: true,
      });
    });
  });

  describe('checkAndTriggerAutoLock', () => {
    it('returns null when tiltRisk does not satisfy threshold', async () => {
      storageData[TILTCHECK_AUTO_LOCK_ON_TILT_KEY] = true;
      storageData[TILTCHECK_AUTO_LOCK_THRESHOLD_KEY] = 75;

      const res = await checkAndTriggerAutoLock({
        tiltRisk: 60,
      });
      expect(res).toBeNull();
    });

    it('triggers and returns result when tiltRisk satisfies threshold', async () => {
      storageData[TILTCHECK_AUTO_LOCK_ON_TILT_KEY] = true;
      storageData[TILTCHECK_AUTO_LOCK_THRESHOLD_KEY] = 75;
      storageData[TILTCHECK_AUTO_LOCK_DURATION_KEY] = 86400;
      storageData[TILTCHECK_COOLDOWN_WALLET_KEY] = testWallet;

      const now = 1700000000000;
      const res = await checkAndTriggerAutoLock({
        tiltRisk: 80,
        indicators: ['fast_clicks'],
        now,
      });

      expect(res).not.toBeNull();
      expect(res?.triggered).toBe(true);
      expect(res?.wallet).toBe(testWallet);
      expect(res?.activeUntil).toBe(now + 86400 * 1000);
      expect(storageData[TILTCHECK_COOLDOWN_SOURCE_KEY]).toBe('auto_tilt');
    });
  });
});
