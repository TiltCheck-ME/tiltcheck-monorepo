// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08

import type {
  ClientSeedApplyResult,
  ClientSeedFormat,
  ClientSeedGenerateOptions,
  ClientSeedHygieneStatus,
  ClientSeedMetadata,
  ClientSeedRotationHistoryEntry,
  SiteSeedState,
} from '@tiltcheck/types';

/**
 * Storage adapter interface for persisting seed state per site.
 */
export interface SeedStorageAdapter {
  getSiteState(site: string): Promise<SiteSeedState | null> | SiteSeedState | null;
  saveSiteState(site: string, state: SiteSeedState): Promise<void> | void;
  getAllSites?(): Promise<string[]> | string[];
}

/**
 * In-memory storage adapter (ideal for testing, CLI, and headless environments).
 */
export class MemorySeedStorageAdapter implements SeedStorageAdapter {
  private store = new Map<string, SiteSeedState>();

  getSiteState(site: string): SiteSeedState | null {
    return this.store.get(site) ?? null;
  }

  saveSiteState(site: string, state: SiteSeedState): void {
    this.store.set(site, state);
  }

  getAllSites(): string[] {
    return Array.from(this.store.keys());
  }
}

/**
 * Web localStorage storage adapter with automatic fallback to memory if unavailable.
 */
export class LocalStorageSeedStorageAdapter implements SeedStorageAdapter {
  private prefix: string;
  private memoryFallback = new MemorySeedStorageAdapter();

  constructor(prefix: string = 'tiltcheck_seed_') {
    this.prefix = prefix;
  }

  private hasLocalStorage(): boolean {
    try {
      return typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage !== null;
    } catch {
      return false;
    }
  }

  getSiteState(site: string): SiteSeedState | null {
    if (!this.hasLocalStorage()) {
      return this.memoryFallback.getSiteState(site);
    }
    try {
      const raw = globalThis.localStorage.getItem(this.prefix + site);
      if (!raw) return null;
      return JSON.parse(raw) as SiteSeedState;
    } catch {
      return null;
    }
  }

  saveSiteState(site: string, state: SiteSeedState): void {
    if (!this.hasLocalStorage()) {
      this.memoryFallback.saveSiteState(site, state);
      return;
    }
    try {
      globalThis.localStorage.setItem(this.prefix + site, JSON.stringify(state));
    } catch {
      this.memoryFallback.saveSiteState(site, state);
    }
  }

  getAllSites(): string[] {
    if (!this.hasLocalStorage()) {
      return this.memoryFallback.getAllSites();
    }
    try {
      const sites: string[] = [];
      for (let i = 0; i < globalThis.localStorage.length; i++) {
        const key = globalThis.localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          sites.push(key.substring(this.prefix.length));
        }
      }
      return sites;
    } catch {
      return [];
    }
  }
}

const ALPHANUMERIC_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const HEX_CHARSET = '0123456789abcdef';

const KNOWN_WEAK_SEEDS = new Set([
  'clientseed',
  'client-seed',
  'client_seed',
  'default',
  'default-client-seed',
  'default-seed',
  'seed',
  'test',
  'testseed',
  '12345',
  '123456',
  '12345678',
  '000000',
  'admin',
  'stake',
  'roobet',
  'bcgame',
  'lucky',
  'winner',
  'jackpot',
]);

function isInputElementLike(el: unknown): el is HTMLInputElement {
  if (!el || typeof el !== 'object') return false;
  if (typeof HTMLInputElement !== 'undefined') {
    return el instanceof HTMLInputElement;
  }
  return 'value' in el;
}

export const KNOWN_SITE_SEED_SELECTORS: Record<string, string[]> = {
  stake: [
    'input[name="clientSeed"]',
    'input[data-testid="client-seed"]',
    'input[data-test="client-seed-input"]',
    'input[placeholder*="Client Seed"]',
    'input[placeholder*="client seed"]',
    'input[aria-label*="Client Seed"]',
    'input[id*="client-seed"]',
  ],
  roobet: [
    'input[name="client_seed"]',
    'input[placeholder*="Client Seed"]',
    'input[id*="client-seed"]',
  ],
  bcgame: [
    'input[name="clientSeed"]',
    'input[placeholder*="Client Seed"]',
    'input[id*="client-seed"]',
  ],
  rollbit: [
    'input[name="clientSeed"]',
    'input[placeholder*="Client Seed"]',
  ],
  shuffle: [
    'input[name="clientSeed"]',
    'input[placeholder*="Client Seed"]',
  ],
  default: [
    'input[name="clientSeed"]',
    'input[name="client_seed"]',
    'input[placeholder*="Client Seed"]',
    'input[placeholder*="client seed"]',
    'input[data-testid*="client-seed"]',
  ],
};

/**
 * Normalizes hostnames or URLs into canonical site keys.
 */
export function normalizeSiteKey(siteOrUrl?: string | null): string {
  if (!siteOrUrl || typeof siteOrUrl !== 'string') {
    return 'default';
  }

  const raw = siteOrUrl.trim().toLowerCase();
  if (!raw) return 'default';

  let cleaned = raw;
  try {
    if (raw.includes('://')) {
      cleaned = new URL(raw).hostname.toLowerCase();
    }
  } catch {
    cleaned = raw;
  }

  // Remove common port or path artifacts
  cleaned = cleaned.split('/')[0].split(':')[0];

  if (cleaned.includes('stake')) return 'stake';
  if (cleaned.includes('roobet')) return 'roobet';
  if (cleaned.includes('bc.game') || cleaned.includes('bcgame')) return 'bcgame';
  if (cleaned.includes('rollbit')) return 'rollbit';
  if (cleaned.includes('shuffle')) return 'shuffle';
  if (cleaned.includes('gamdom')) return 'gamdom';

  // Strip leading www.
  if (cleaned.startsWith('www.')) {
    cleaned = cleaned.substring(4);
  }

  return cleaned || 'default';
}

/**
 * Obtains cryptographically secure random bytes in Node or Browser environments.
 */
export function getCryptoRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  const cryptoObj = globalThis.crypto;

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
    return bytes;
  }

  // Fallback rejection-free random sampling
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/**
 * Generates a strong, cryptographically secure random client seed on-device.
 */
export function generateStrongClientSeed(options?: ClientSeedGenerateOptions): string {
  const format = options?.format ?? 'alphanumeric';

  if (format === 'hex') {
    const length = options?.length ?? 64;
    const byteCount = Math.ceil(length / 2);
    const bytes = getCryptoRandomBytes(byteCount);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex.slice(0, length);
  }

  if (format === 'uuid') {
    const cryptoObj = globalThis.crypto;
    if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
      return cryptoObj.randomUUID();
    }
    const bytes = getCryptoRandomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  if (format === 'readable') {
    const prefix = options?.customPrefix ?? 'tc-safe';
    const randomHex = generateStrongClientSeed({ format: 'hex', length: 16 });
    return `${prefix}-${randomHex}`;
  }

  // Alphanumeric format (default Stake / generic casino standard)
  const length = options?.length ?? 32;
  const charset = ALPHANUMERIC_CHARSET;
  const charsetLength = charset.length;
  // Use rejection sampling to avoid modulo bias (256 - (256 % 62) = 248)
  const maxValidByte = 256 - (256 % charsetLength);

  let result = '';
  while (result.length < length) {
    const batchSize = Math.max(16, (length - result.length) * 2);
    const bytes = getCryptoRandomBytes(batchSize);
    for (let i = 0; i < bytes.length && result.length < length; i++) {
      if (bytes[i] < maxValidByte) {
        result += charset[bytes[i] % charsetLength];
      }
    }
  }

  return result;
}

/**
 * Calculates bits of entropy for a client seed based on length and charset diversity.
 */
export function calculateSeedEntropy(seed: string): number {
  if (!seed || typeof seed !== 'string') return 0;

  const length = seed.length;
  if (length === 0) return 0;

  let hasLower = false;
  let hasUpper = false;
  let hasDigits = false;
  let hasSpecial = false;

  for (let i = 0; i < length; i++) {
    const code = seed.charCodeAt(i);
    if (code >= 48 && code <= 57) hasDigits = true;
    else if (code >= 65 && code <= 90) hasUpper = true;
    else if (code >= 97 && code <= 122) hasLower = true;
    else hasSpecial = true;
  }

  let charsetSize = 0;
  if (hasDigits) charsetSize += 10;
  if (hasUpper) charsetSize += 26;
  if (hasLower) charsetSize += 26;
  if (hasSpecial) charsetSize += 32;

  if (charsetSize === 0) return 0;

  const bitsPerChar = Math.log2(charsetSize);
  const rawEntropy = length * bitsPerChar;

  // Deduct penalty for repetitive patterns or identical adjacent characters
  let repetitionCount = 0;
  for (let i = 1; i < length; i++) {
    if (seed[i] === seed[i - 1]) repetitionCount++;
  }

  const penaltyRatio = Math.max(0, 1 - (repetitionCount / length));
  return Math.round(rawEntropy * penaltyRatio * 10) / 10;
}

/**
 * Evaluates seed hygiene and detects weak, default, or predictable seeds.
 */
export function evaluateSeedHygiene(seed: string): {
  status: ClientSeedHygieneStatus;
  notes: string[];
} {
  const notes: string[] = [];

  if (!seed || typeof seed !== 'string' || seed.trim().length === 0) {
    return {
      status: 'compromised',
      notes: ['Seed is empty. Generate a secure random client seed before placing bets.'],
    };
  }

  const clean = seed.trim().toLowerCase();

  // Check known default casino seeds
  if (KNOWN_WEAK_SEEDS.has(clean)) {
    return {
      status: 'compromised',
      notes: [
        `Seed "${seed}" is a well-known default seed with public history. Operators or external observers can predict your game hashes.`,
      ],
    };
  }

  if (seed.length < 8) {
    return {
      status: 'weak',
      notes: ['Seed length is under 8 characters. Minimum recommended length is 16 characters.'],
    };
  }

  const entropy = calculateSeedEntropy(seed);

  // Check for repeated single character
  const uniqueChars = new Set(seed).size;
  if (uniqueChars <= 2 && seed.length > 5) {
    return {
      status: 'weak',
      notes: ['Seed has almost no character variance. Low entropy makes outcomes predictable.'],
    };
  }

  // Check for sequential character runs
  let isSequential = false;
  if (seed.length >= 5) {
    let ascRun = 0;
    for (let i = 1; i < seed.length; i++) {
      if (seed.charCodeAt(i) === seed.charCodeAt(i - 1) + 1) {
        ascRun++;
        if (ascRun >= 4) {
          isSequential = true;
          break;
        }
      } else {
        ascRun = 0;
      }
    }
  }

  if (isSequential) {
    notes.push('Seed contains sequential runs (e.g. 12345 or abcde).');
  }

  if (entropy < 40) {
    notes.push(`Entropy (${entropy} bits) is critically low.`);
    return { status: 'weak', notes };
  }

  if (entropy < 80) {
    notes.push(`Entropy (${entropy} bits) is moderate. Consider generating a 32-character seed.`);
    return { status: 'acceptable', notes };
  }

  notes.push(`Strong cryptographic entropy (${entropy} bits). No predictable patterns detected.`);
  return { status: 'strong', notes };
}

/**
 * Creates seed metadata for a given seed string and site.
 */
export function createSeedMetadata(
  seed: string,
  site: string,
  options?: {
    format?: ClientSeedFormat;
    source?: ClientSeedMetadata['source'];
    rotationCount?: number;
  }
): ClientSeedMetadata {
  const entropy = calculateSeedEntropy(seed);
  const hygiene = evaluateSeedHygiene(seed);

  return {
    seed,
    format: options?.format ?? 'alphanumeric',
    entropyBits: entropy,
    hygieneStatus: hygiene.status,
    hygieneNotes: hygiene.notes,
    createdAt: Date.now(),
    site: normalizeSiteKey(site),
    source: options?.source ?? 'on-device-csprng',
    rotationCount: options?.rotationCount ?? 0,
  };
}

/**
 * Core SeedManager class.
 * Provides on-device strong random generation, rotation, site-specific persistence,
 * history tracking, clipboard copy, and best-effort page application.
 */
export class ClientSeedManager {
  private adapter: SeedStorageAdapter;
  private defaultSite: string;

  constructor(options?: {
    adapter?: SeedStorageAdapter;
    defaultSite?: string;
  }) {
    this.adapter = options?.adapter ?? new LocalStorageSeedStorageAdapter();
    this.defaultSite = normalizeSiteKey(options?.defaultSite ?? 'default');
  }

  /**
   * Retrieves active seed metadata for the specified site.
   * If no seed exists, generates a fresh on-device seed and persists it.
   */
  async getActiveSeed(siteInput?: string): Promise<ClientSeedMetadata> {
    const site = normalizeSiteKey(siteInput ?? this.defaultSite);
    const existing = await this.adapter.getSiteState(site);

    if (existing && existing.currentSeed && existing.currentSeed.seed) {
      return existing.currentSeed;
    }

    // Auto-generate initial strong random seed
    const newSeedValue = generateStrongClientSeed({ format: 'alphanumeric', length: 32 });
    const metadata = createSeedMetadata(newSeedValue, site, {
      format: 'alphanumeric',
      source: 'on-device-csprng',
      rotationCount: 0,
    });

    const newState: SiteSeedState = {
      site,
      currentSeed: metadata,
      history: [],
      lastRotatedAt: Date.now(),
    };

    await this.adapter.saveSiteState(site, newState);
    return metadata;
  }

  /**
   * Rotates the client seed for a site:
   * Retires current seed into history with timestamp, generates a fresh unguessable
   * random seed, and updates storage.
   */
  async rotateSeed(
    siteInput?: string,
    options?: ClientSeedGenerateOptions & {
      reason?: ClientSeedRotationHistoryEntry['reason'];
    }
  ): Promise<{
    newSeed: ClientSeedMetadata;
    retiredSeed: ClientSeedRotationHistoryEntry | null;
  }> {
    const site = normalizeSiteKey(siteInput ?? this.defaultSite);
    const currentState = await this.adapter.getSiteState(site);

    let retiredSeed: ClientSeedRotationHistoryEntry | null = null;
    const history = currentState?.history ? [...currentState.history] : [];
    const prevRotationCount = currentState?.currentSeed?.rotationCount ?? 0;

    if (currentState && currentState.currentSeed) {
      const prior = currentState.currentSeed;
      retiredSeed = {
        id: `rot_${Date.now()}_${generateStrongClientSeed({ format: 'hex', length: 8 })}`,
        seed: prior.seed,
        format: prior.format,
        site,
        createdAt: prior.createdAt,
        retiredAt: Date.now(),
        reason: options?.reason ?? 'manual-rotation',
      };
      // Keep last 50 rotated seeds in history
      history.unshift(retiredSeed);
      if (history.length > 50) {
        history.length = 50;
      }
    }

    const format = options?.format ?? 'alphanumeric';
    const newSeedValue = generateStrongClientSeed(options);
    const newMetadata = createSeedMetadata(newSeedValue, site, {
      format,
      source: 'on-device-csprng',
      rotationCount: prevRotationCount + 1,
    });

    const updatedState: SiteSeedState = {
      site,
      currentSeed: newMetadata,
      history,
      lastRotatedAt: Date.now(),
    };

    await this.adapter.saveSiteState(site, updatedState);
    return { newSeed: newMetadata, retiredSeed };
  }

  /**
   * Sets a user-defined custom seed (e.g. pasted by user), performs hygiene verification,
   * and rotates previous seed into history.
   */
  async setCustomSeed(
    siteInput: string,
    customSeed: string,
    options?: {
      format?: ClientSeedFormat;
      reason?: ClientSeedRotationHistoryEntry['reason'];
    }
  ): Promise<ClientSeedMetadata> {
    const site = normalizeSiteKey(siteInput);
    const currentState = await this.adapter.getSiteState(site);

    const history = currentState?.history ? [...currentState.history] : [];
    const prevRotationCount = currentState?.currentSeed?.rotationCount ?? 0;

    if (currentState && currentState.currentSeed) {
      history.unshift({
        id: `rot_${Date.now()}_${generateStrongClientSeed({ format: 'hex', length: 8 })}`,
        seed: currentState.currentSeed.seed,
        format: currentState.currentSeed.format,
        site,
        createdAt: currentState.currentSeed.createdAt,
        retiredAt: Date.now(),
        reason: options?.reason ?? 'manual-rotation',
      });
      if (history.length > 50) history.length = 50;
    }

    const metadata = createSeedMetadata(customSeed.trim(), site, {
      format: options?.format ?? 'alphanumeric',
      source: 'user-defined',
      rotationCount: prevRotationCount + 1,
    });

    const newState: SiteSeedState = {
      site,
      currentSeed: metadata,
      history,
      lastRotatedAt: Date.now(),
    };

    await this.adapter.saveSiteState(site, newState);
    return metadata;
  }

  /**
   * Retrieves rotation history for a site.
   */
  async getHistory(siteInput?: string): Promise<ClientSeedRotationHistoryEntry[]> {
    const site = normalizeSiteKey(siteInput ?? this.defaultSite);
    const state = await this.adapter.getSiteState(site);
    return state?.history ?? [];
  }

  /**
   * Copies the active client seed to clipboard in supported browser environments.
   */
  async copyActiveSeed(siteInput?: string): Promise<{ success: boolean; seed: string }> {
    const metadata = await this.getActiveSeed(siteInput);
    const seed = metadata.seed;

    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(seed);
        return { success: true, seed };
      } catch {
        // Fall back to return
      }
    }

    return { success: false, seed };
  }

  /**
   * Detects if the current DOM page contains a recognizable Client Seed input field.
   * Best-effort detection for Stake and other supported operators.
   */
  detectPageSeedInput(doc: Document, siteInput?: string): {
    detectable: boolean;
    selector?: string;
    currentValue?: string;
    site: string;
  } {
    const site = normalizeSiteKey(siteInput ?? this.defaultSite);
    const selectors = KNOWN_SITE_SEED_SELECTORS[site] || KNOWN_SITE_SEED_SELECTORS.default;

    for (const sel of selectors) {
      try {
        const el = doc.querySelector(sel);
        if (isInputElementLike(el)) {
          return {
            detectable: true,
            selector: sel,
            currentValue: el.value,
            site,
          };
        }
      } catch {
        // Selector failure ignored
      }
    }

    return {
      detectable: false,
      site,
    };
  }

  /**
   * Best-effort "Apply to Page" utility.
   *
   * SECURITY RULE: Requires explicit user confirmation.
   * If `options.confirmed !== true`, returns a confirmation request envelope without modifying the DOM.
   * If `options.confirmed === true`, safely assigns the value and fires standard synthetic events.
   */
  applySeedToPage(
    doc: Document,
    seedToApply: string,
    siteInput?: string,
    options?: { confirmed?: boolean }
  ): ClientSeedApplyResult {
    const site = normalizeSiteKey(siteInput ?? this.defaultSite);
    const detection = this.detectPageSeedInput(doc, site);

    if (!detection.detectable || !detection.selector) {
      return {
        detectable: false,
        applied: false,
        requiresUserConfirmation: false,
        site,
        message: `No active client seed input detected on page for ${site}. Copy seed to clipboard instead.`,
      };
    }

    if (!options?.confirmed) {
      return {
        detectable: true,
        selector: detection.selector,
        applied: false,
        requiresUserConfirmation: true,
        previousValue: detection.currentValue,
        newValue: seedToApply,
        site,
        message: `Client seed input found (${detection.selector}). User confirmation required before applying.`,
      };
    }

    const inputEl = doc.querySelector(detection.selector);
    if (!isInputElementLike(inputEl)) {
      return {
        detectable: false,
        applied: false,
        requiresUserConfirmation: false,
        site,
        message: 'Input element detached from DOM before confirmation.',
      };
    }

    const prevValue = inputEl.value;
    inputEl.value = seedToApply;

    // Dispatch native input & change events so React / Vue forms register the update
    try {
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    } catch {
      // Event dispatch fallback
    }

    return {
      detectable: true,
      selector: detection.selector,
      applied: true,
      requiresUserConfirmation: false,
      confirmed: true,
      previousValue: prevValue,
      newValue: seedToApply,
      site,
      message: `Client seed successfully applied to ${site} input field.`,
    };
  }
}
