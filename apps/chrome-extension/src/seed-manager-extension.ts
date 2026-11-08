// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08

import {
  ClientSeedManager,
  type SeedStorageAdapter,
  normalizeSiteKey,
  generateStrongClientSeed,
  evaluateSeedHygiene,
  calculateSeedEntropy,
} from '@tiltcheck/shared';
import type {
  ClientSeedApplyResult,
  ClientSeedFormat,
  ClientSeedGenerateOptions,
  ClientSeedMetadata,
  ClientSeedRotationHistoryEntry,
  SiteSeedState,
} from '@tiltcheck/types';

export const EXTENSION_SEED_STORAGE_PREFIX = 'tiltcheck_site_seed_';

/**
 * Storage adapter backed by chrome.storage.local (Manifest V3 Promise-based)
 * with localStorage and in-memory fallback.
 */
export class ChromeStorageSeedAdapter implements SeedStorageAdapter {
  private prefix: string;
  private memoryFallback = new Map<string, SiteSeedState>();

  constructor(prefix: string = EXTENSION_SEED_STORAGE_PREFIX) {
    this.prefix = prefix;
  }

  async getSiteState(site: string): Promise<SiteSeedState | null> {
    const key = this.prefix + site;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const result = await chrome.storage.local.get([key]);
        if (result && result[key]) {
          return result[key] as SiteSeedState;
        }
      } catch {
        // Fall back to localStorage or memory
      }
    }
    return this.getFromLocalStorage(key) ?? this.memoryFallback.get(key) ?? null;
  }

  async saveSiteState(site: string, state: SiteSeedState): Promise<void> {
    const key = this.prefix + site;
    this.memoryFallback.set(key, state);
    this.saveToLocalStorage(key, state);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await chrome.storage.local.set({ [key]: state });
      } catch {
        // Fallback already saved
      }
    }
  }

  private getFromLocalStorage(key: string): SiteSeedState | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as SiteSeedState) : null;
      }
    } catch {
      // Ignore
    }
    return null;
  }

  private saveToLocalStorage(key: string, state: SiteSeedState): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(state));
      }
    } catch {
      // Ignore
    }
  }
}

/**
 * Default singleton extension instance of ClientSeedManager.
 */
export const extensionSeedManager = new ClientSeedManager({
  adapter: new ChromeStorageSeedAdapter(),
  defaultSite: 'stake',
});

export {
  normalizeSiteKey,
  generateStrongClientSeed,
  evaluateSeedHygiene,
  calculateSeedEntropy,
};
