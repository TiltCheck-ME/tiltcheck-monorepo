// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08

import { describe, expect, it, beforeEach } from 'vitest';
import {
  ClientSeedManager,
  MemorySeedStorageAdapter,
  LocalStorageSeedStorageAdapter,
  calculateSeedEntropy,
  createSeedMetadata,
  evaluateSeedHygiene,
  generateStrongClientSeed,
  normalizeSiteKey,
} from '../src/seed-manager.js';

describe('Seed Manager (Issue #539)', () => {
  describe('generateStrongClientSeed', () => {
    it('generates a 32-character alphanumeric seed by default', () => {
      const seed = generateStrongClientSeed();
      expect(seed).toHaveLength(32);
      expect(seed).toMatch(/^[a-zA-Z0-9]{32}$/);
    });

    it('generates a custom length alphanumeric seed', () => {
      const seed = generateStrongClientSeed({ format: 'alphanumeric', length: 16 });
      expect(seed).toHaveLength(16);
      expect(seed).toMatch(/^[a-zA-Z0-9]{16}$/);
    });

    it('generates 64-char hex format seeds', () => {
      const seed = generateStrongClientSeed({ format: 'hex', length: 64 });
      expect(seed).toHaveLength(64);
      expect(seed).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates UUID v4 format seeds', () => {
      const seed = generateStrongClientSeed({ format: 'uuid' });
      expect(seed).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('generates readable format seeds with prefix', () => {
      const seed = generateStrongClientSeed({ format: 'readable', customPrefix: 'tiltcheck-safe' });
      expect(seed.startsWith('tiltcheck-safe-')).toBe(true);
      expect(seed.length).toBeGreaterThan(20);
    });

    it('produces unique seeds without collisions', () => {
      const set = new Set<string>();
      for (let i = 0; i < 100; i++) {
        set.add(generateStrongClientSeed());
      }
      expect(set.size).toBe(100);
    });
  });

  describe('calculateSeedEntropy', () => {
    it('calculates 0 entropy for empty seed', () => {
      expect(calculateSeedEntropy('')).toBe(0);
    });

    it('calculates high entropy (> 150 bits) for 32-char alphanumeric seed', () => {
      const seed = generateStrongClientSeed({ format: 'alphanumeric', length: 32 });
      const entropy = calculateSeedEntropy(seed);
      expect(entropy).toBeGreaterThan(150);
    });

    it('penalizes repetitive characters', () => {
      const diverse = 'aB3cD4eF5gH6';
      const repeated = 'aaaaaaaaaaaa';
      expect(calculateSeedEntropy(diverse)).toBeGreaterThan(calculateSeedEntropy(repeated));
    });
  });

  describe('evaluateSeedHygiene', () => {
    it('flags empty seeds as compromised', () => {
      const result = evaluateSeedHygiene('');
      expect(result.status).toBe('compromised');
    });

    it('flags known default casino seeds as compromised', () => {
      expect(evaluateSeedHygiene('clientseed').status).toBe('compromised');
      expect(evaluateSeedHygiene('default-seed').status).toBe('compromised');
      expect(evaluateSeedHygiene('12345').status).toBe('compromised');
      expect(evaluateSeedHygiene('stake').status).toBe('compromised');
    });

    it('flags low variance or short seeds as weak', () => {
      expect(evaluateSeedHygiene('abc').status).toBe('weak');
      expect(evaluateSeedHygiene('111111111111').status).toBe('weak');
    });

    it('passes strong CSPRNG seeds as strong', () => {
      const seed = generateStrongClientSeed({ length: 32 });
      const result = evaluateSeedHygiene(seed);
      expect(result.status).toBe('strong');
      expect(result.notes[0]).toContain('Strong cryptographic entropy');
    });
  });

  describe('normalizeSiteKey', () => {
    it('normalizes Stake domains and URLs', () => {
      expect(normalizeSiteKey('stake.com')).toBe('stake');
      expect(normalizeSiteKey('https://stake.com/casino')).toBe('stake');
      expect(normalizeSiteKey('https://play.stake.us/fairness')).toBe('stake');
    });

    it('normalizes other recognized casinos', () => {
      expect(normalizeSiteKey('https://roobet.com')).toBe('roobet');
      expect(normalizeSiteKey('https://bc.game/game/crash')).toBe('bcgame');
      expect(normalizeSiteKey('shuffle.com')).toBe('shuffle');
      expect(normalizeSiteKey('rollbit.com')).toBe('rollbit');
    });

    it('handles empty or unrecognized domains safely', () => {
      expect(normalizeSiteKey(null)).toBe('default');
      expect(normalizeSiteKey('')).toBe('default');
      expect(normalizeSiteKey('https://custom-crypto-casino.org')).toBe('custom-crypto-casino.org');
    });
  });

  describe('ClientSeedManager lifecycle', () => {
    let memoryAdapter: MemorySeedStorageAdapter;
    let manager: ClientSeedManager;

    beforeEach(() => {
      memoryAdapter = new MemorySeedStorageAdapter();
      manager = new ClientSeedManager({ adapter: memoryAdapter, defaultSite: 'stake' });
    });

    it('automatically generates and saves an initial seed when none exists', async () => {
      const seed = await manager.getActiveSeed('stake');
      expect(seed.seed).toHaveLength(32);
      expect(seed.site).toBe('stake');
      expect(seed.hygieneStatus).toBe('strong');
      expect(seed.rotationCount).toBe(0);

      // Verifies persistence in adapter
      const stored = memoryAdapter.getSiteState('stake');
      expect(stored?.currentSeed.seed).toBe(seed.seed);
    });

    it('reuses existing active seed on subsequent calls', async () => {
      const first = await manager.getActiveSeed('stake');
      const second = await manager.getActiveSeed('stake');
      expect(first.seed).toBe(second.seed);
      expect(first.createdAt).toBe(second.createdAt);
    });

    it('rotates seed, saves prior seed to history, and updates active seed', async () => {
      const initial = await manager.getActiveSeed('stake');
      const { newSeed, retiredSeed } = await manager.rotateSeed('stake', {
        format: 'hex',
        length: 64,
        reason: 'manual-rotation',
      });

      expect(newSeed.seed).not.toBe(initial.seed);
      expect(newSeed.seed).toHaveLength(64);
      expect(newSeed.format).toBe('hex');
      expect(newSeed.rotationCount).toBe(1);

      expect(retiredSeed).not.toBeNull();
      expect(retiredSeed?.seed).toBe(initial.seed);
      expect(retiredSeed?.retiredAt).toBeGreaterThanOrEqual(initial.createdAt);

      const history = await manager.getHistory('stake');
      expect(history).toHaveLength(1);
      expect(history[0].seed).toBe(initial.seed);
    });

    it('maintains strict site isolation', async () => {
      const stakeSeed = await manager.getActiveSeed('stake');
      const roobetSeed = await manager.getActiveSeed('roobet');

      expect(stakeSeed.seed).not.toBe(roobetSeed.seed);
      expect(stakeSeed.site).toBe('stake');
      expect(roobetSeed.site).toBe('roobet');

      await manager.rotateSeed('stake');
      const updatedStake = await manager.getActiveSeed('stake');
      const untouchedRoobet = await manager.getActiveSeed('roobet');

      expect(updatedStake.seed).not.toBe(stakeSeed.seed);
      expect(untouchedRoobet.seed).toBe(roobetSeed.seed);
    });

    it('allows setting custom user seeds with hygiene audit', async () => {
      const custom = await manager.setCustomSeed('stake', 'MyCustomSecretSeed123456789!');
      expect(custom.seed).toBe('MyCustomSecretSeed123456789!');
      expect(custom.source).toBe('user-defined');
      expect(custom.hygieneStatus).toBe('strong');
      expect(custom.rotationCount).toBe(1);
    });

    it('caps rotation history at 50 entries', async () => {
      await manager.getActiveSeed('stake');
      for (let i = 0; i < 55; i++) {
        await manager.rotateSeed('stake');
      }
      const history = await manager.getHistory('stake');
      expect(history).toHaveLength(50);
    });
  });

  describe('applySeedToPage', () => {
    let manager: ClientSeedManager;

    beforeEach(() => {
      manager = new ClientSeedManager({ adapter: new MemorySeedStorageAdapter() });
    });

    it('returns non-detectable when document has no matching input', () => {
      const fakeDoc = {
        querySelector: () => null,
      } as unknown as Document;

      const result = manager.applySeedToPage(fakeDoc, 'test-seed-123', 'stake');
      expect(result.detectable).toBe(false);
      expect(result.applied).toBe(false);
      expect(result.requiresUserConfirmation).toBe(false);
    });

    it('requires explicit confirmation before applying to DOM', () => {
      const fakeInput = {
        value: 'old-seed',
        dispatchEvent: () => true,
      };

      const fakeDoc = {
        querySelector: (sel: string) => (sel === 'input[name="clientSeed"]' ? fakeInput : null),
      } as unknown as Document;

      // Without confirmation
      const unconfirmed = manager.applySeedToPage(fakeDoc, 'new-seed-456', 'stake', { confirmed: false });
      expect(unconfirmed.detectable).toBe(true);
      expect(unconfirmed.requiresUserConfirmation).toBe(true);
      expect(unconfirmed.applied).toBe(false);
      expect(fakeInput.value).toBe('old-seed');

      // With confirmation
      const confirmed = manager.applySeedToPage(fakeDoc, 'new-seed-456', 'stake', { confirmed: true });
      expect(confirmed.applied).toBe(true);
      expect(confirmed.previousValue).toBe('old-seed');
      expect(confirmed.newValue).toBe('new-seed-456');
      expect(fakeInput.value).toBe('new-seed-456');
    });
  });
});
