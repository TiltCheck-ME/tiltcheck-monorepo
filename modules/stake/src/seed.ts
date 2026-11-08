// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08

import {
  ClientSeedManager,
  type SeedStorageAdapter,
  generateStrongClientSeed,
  evaluateSeedHygiene,
  calculateSeedEntropy,
} from '@tiltcheck/shared';
import type {
  ClientSeedGenerateOptions,
  ClientSeedMetadata,
  ClientSeedRotationHistoryEntry,
  ClientSeedApplyResult,
} from '@tiltcheck/types';

/**
 * StakeSeedManager
 * Dedicated non-custodial seed generator and rotator configured specifically for Stake.com.
 * Supports on-device 32-character alphanumeric and hex seeds, rotation tracking,
 * and DOM input detection for Stake fairness modals.
 */
export class StakeSeedManager extends ClientSeedManager {
  constructor(options?: { adapter?: SeedStorageAdapter }) {
    super({
      adapter: options?.adapter,
      defaultSite: 'stake',
    });
  }

  /**
   * Retrieves active seed for Stake.
   */
  async getStakeSeed(): Promise<ClientSeedMetadata> {
    return this.getActiveSeed('stake');
  }

  /**
   * Rotates seed for Stake, archiving the old seed into history.
   */
  async rotateStakeSeed(options?: ClientSeedGenerateOptions & {
    reason?: ClientSeedRotationHistoryEntry['reason'];
  }): Promise<{
    newSeed: ClientSeedMetadata;
    retiredSeed: ClientSeedRotationHistoryEntry | null;
  }> {
    return this.rotateSeed('stake', options);
  }

  /**
   * Retrieves rotation history for Stake.
   */
  async getStakeHistory(): Promise<ClientSeedRotationHistoryEntry[]> {
    return this.getHistory('stake');
  }

  /**
   * Applies the seed to an active Stake fairness modal input if present and user confirmed.
   */
  applyToStakePage(
    doc: Document,
    seed: string,
    options?: { confirmed?: boolean }
  ): ClientSeedApplyResult {
    return this.applySeedToPage(doc, seed, 'stake', options);
  }
}

export {
  generateStrongClientSeed,
  evaluateSeedHygiene,
  calculateSeedEntropy,
};
