// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08

import { describe, expect, it, beforeEach } from 'vitest';
import {
  ChromeStorageSeedAdapter,
  extensionSeedManager,
  normalizeSiteKey,
} from '../../src/seed-manager-extension.js';

describe('Chrome Extension Seed Manager (Issue #539)', () => {
  beforeEach(() => {
    // Clear mock storage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('normalizeSiteKey', () => {
    it('normalizes Stake casino URLs and hostnames', () => {
      expect(normalizeSiteKey('stake.com')).toBe('stake');
      expect(normalizeSiteKey('play.stake.us')).toBe('stake');
      expect(normalizeSiteKey('https://stake.com/casino/games/dice')).toBe('stake');
    });

    it('normalizes other recognized casino domains', () => {
      expect(normalizeSiteKey('roobet.com')).toBe('roobet');
      expect(normalizeSiteKey('https://bc.game/game/limbo')).toBe('bcgame');
      expect(normalizeSiteKey('shuffle.com')).toBe('shuffle');
      expect(normalizeSiteKey('rollbit.com')).toBe('rollbit');
    });
  });

  describe('ChromeStorageSeedAdapter', () => {
    it('stores and retrieves site state from fallback storage', async () => {
      const adapter = new ChromeStorageSeedAdapter();
      const mockState = {
        site: 'stake',
        currentSeed: {
          seed: 'test-seed-1234567890abcdef',
          format: 'alphanumeric' as const,
          entropyBits: 150,
          hygieneStatus: 'strong' as const,
          hygieneNotes: ['Strong entropy'],
          createdAt: Date.now(),
          site: 'stake',
          source: 'on-device-csprng' as const,
          rotationCount: 0,
        },
        history: [],
        lastRotatedAt: Date.now(),
      };

      await adapter.saveSiteState('stake', mockState);
      const retrieved = await adapter.getSiteState('stake');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.currentSeed.seed).toBe('test-seed-1234567890abcdef');
    });
  });

  describe('extensionSeedManager lifecycle', () => {
    it('retrieves active client seed and generates strong on-device seed if missing', async () => {
      const meta = await extensionSeedManager.getActiveSeed('stake');
      expect(meta.site).toBe('stake');
      expect(meta.seed.length).toBeGreaterThanOrEqual(16);
      expect(meta.hygieneStatus).toBe('strong');
      expect(meta.rotationCount).toBe(0);
    });

    it('rotates seed on-device, logs retirement, and archives previous seed', async () => {
      const initial = await extensionSeedManager.getActiveSeed('stake');
      const { newSeed, retiredSeed } = await extensionSeedManager.rotateSeed('stake', {
        format: 'alphanumeric',
        length: 32,
        reason: 'manual-rotation',
      });

      expect(newSeed.seed).not.toBe(initial.seed);
      expect(newSeed.rotationCount).toBe(initial.rotationCount + 1);
      expect(retiredSeed).not.toBeNull();
      expect(retiredSeed?.seed).toBe(initial.seed);

      const history = await extensionSeedManager.getHistory('stake');
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].seed).toBe(initial.seed);
    });

    it('enforces user confirmation before applying seed to DOM input', () => {
      const fakeInput = {
        value: 'old-operator-seed',
        dispatchEvent: () => true,
      };

      const fakeDoc = {
        querySelector: (sel: string) => (sel === 'input[name="clientSeed"]' ? fakeInput : null),
      } as unknown as Document;

      // Detection
      const detection = extensionSeedManager.detectPageSeedInput(fakeDoc, 'stake');
      expect(detection.detectable).toBe(true);
      expect(detection.selector).toBe('input[name="clientSeed"]');
      expect(detection.currentValue).toBe('old-operator-seed');

      // Unconfirmed apply
      const unconfirmed = extensionSeedManager.applySeedToPage(fakeDoc, 'fresh-seed-xyz', 'stake', { confirmed: false });
      expect(unconfirmed.detectable).toBe(true);
      expect(unconfirmed.requiresUserConfirmation).toBe(true);
      expect(unconfirmed.applied).toBe(false);
      expect(fakeInput.value).toBe('old-operator-seed');

      // Confirmed apply
      const confirmed = extensionSeedManager.applySeedToPage(fakeDoc, 'fresh-seed-xyz', 'stake', { confirmed: true });
      expect(confirmed.applied).toBe(true);
      expect(confirmed.previousValue).toBe('old-operator-seed');
      expect(confirmed.newValue).toBe('fresh-seed-xyz');
      expect(fakeInput.value).toBe('fresh-seed-xyz');
    });
  });
});
