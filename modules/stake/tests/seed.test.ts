// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08

import { describe, expect, it, beforeEach } from 'vitest';
import { StakeSeedManager } from '../src/seed.js';
import { MemorySeedStorageAdapter } from '@tiltcheck/shared';

describe('StakeSeedManager (Issue #539)', () => {
  let memoryAdapter: MemorySeedStorageAdapter;
  let stakeManager: StakeSeedManager;

  beforeEach(() => {
    memoryAdapter = new MemorySeedStorageAdapter();
    stakeManager = new StakeSeedManager({ adapter: memoryAdapter });
  });

  it('generates and retrieves an active Stake seed', async () => {
    const seed = await stakeManager.getStakeSeed();
    expect(seed.site).toBe('stake');
    expect(seed.seed).toHaveLength(32);
    expect(seed.hygieneStatus).toBe('strong');
    expect(seed.rotationCount).toBe(0);
  });

  it('rotates Stake seed and records rotation history', async () => {
    const firstSeed = await stakeManager.getStakeSeed();
    const { newSeed, retiredSeed } = await stakeManager.rotateStakeSeed({
      format: 'alphanumeric',
      length: 32,
      reason: 'manual-rotation',
    });

    expect(newSeed.seed).not.toBe(firstSeed.seed);
    expect(newSeed.rotationCount).toBe(1);
    expect(retiredSeed?.seed).toBe(firstSeed.seed);

    const history = await stakeManager.getStakeHistory();
    expect(history).toHaveLength(1);
    expect(history[0].seed).toBe(firstSeed.seed);
  });

  it('detects and requests confirmation for applying to Stake page', () => {
    const fakeInput = {
      value: 'stake-client-seed-previous',
      dispatchEvent: () => true,
    };

    const fakeDoc = {
      querySelector: (sel: string) => (sel === 'input[name="clientSeed"]' ? fakeInput : null),
    } as unknown as Document;

    const unconfirmed = stakeManager.applyToStakePage(fakeDoc, 'new-stake-seed-123', { confirmed: false });
    expect(unconfirmed.detectable).toBe(true);
    expect(unconfirmed.requiresUserConfirmation).toBe(true);
    expect(unconfirmed.applied).toBe(false);

    const confirmed = stakeManager.applyToStakePage(fakeDoc, 'new-stake-seed-123', { confirmed: true });
    expect(confirmed.applied).toBe(true);
    expect(confirmed.newValue).toBe('new-stake-seed-123');
    expect(fakeInput.value).toBe('new-stake-seed-123');
  });
});
