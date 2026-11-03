/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */

/**
 * Popup bindings for core Touch Grass + Pro strategic filter storage keys.
 */

import {
  DEFAULT_RISK_THRESHOLD,
  DEFAULT_TOUCH_GRASS_DURATION_MS,
  loadCoreCircuitBreakerOptions,
  TILTCHECK_RISK_THRESHOLD_KEY,
  TILTCHECK_TOUCH_GRASS_DURATION_MS_KEY,
  TILTCHECK_TOUCH_GRASS_OPT_IN_KEY,
  type CoreCircuitBreakerOptions,
} from './core-options.js';
import {
  loadBlockedCategories,
  loadBlockedGameSlugs,
  loadGameBlockOptIn,
  normalizeBlockedCategories,
  normalizeBlockedGameSlug,
  normalizeBlockedGamesList,
  TILTCHECK_BLOCKED_CATEGORIES_KEY,
  TILTCHECK_BLOCKED_GAMES_KEY,
} from './pro/blocked-games-options.js';
import { GAME_EXCLUSION_CATEGORIES, type GameCategory } from './exclusion-taxonomy.js';

export const RISK_MIN = 50;
export const RISK_MAX = 100;
export const DURATION_MIN_MS = 30_000;
export const DURATION_MAX_MS = 300_000;

export const QUICK_BLOCK_SLUGS = ['plinko', 'dice', 'keno'] as const;
export const QUICK_BLOCK_CATEGORIES: readonly GameCategory[] = GAME_EXCLUSION_CATEGORIES;

export interface TouchGrassUiState {
  optIn: boolean;
  riskThreshold: number;
  durationMs: number;
}

export interface GameBlockUiState {
  optIn: boolean;
  slugs: string[];
  categories: GameCategory[];
}

export async function loadTouchGrassUiState(): Promise<TouchGrassUiState> {
  const opts = await loadCoreCircuitBreakerOptions();
  return {
    optIn: opts.enforcementEnabled,
    riskThreshold: opts.riskThreshold,
    durationMs: opts.touchGrassDurationMs,
  };
}

export async function loadGameBlockUiState(): Promise<GameBlockUiState> {
  return {
    optIn: await loadGameBlockOptIn(),
    slugs: await loadBlockedGameSlugs(),
    categories: await loadBlockedCategories(),
  };
}

export function clampRisk(value: number): number {
  return Math.min(RISK_MAX, Math.max(RISK_MIN, Math.round(value)));
}

export function clampDurationMs(value: number): number {
  return Math.min(DURATION_MAX_MS, Math.max(DURATION_MIN_MS, Math.round(value)));
}

export async function saveTouchGrassOptIn(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [TILTCHECK_TOUCH_GRASS_OPT_IN_KEY]: enabled });
}

export async function saveRiskThreshold(value: number): Promise<void> {
  await chrome.storage.local.set({ [TILTCHECK_RISK_THRESHOLD_KEY]: clampRisk(value) });
}

export async function saveTouchGrassDurationMs(value: number): Promise<void> {
  const durationMs = clampDurationMs(value);
  await chrome.storage.local.set({
    [TILTCHECK_TOUCH_GRASS_DURATION_MS_KEY]: durationMs,
    tiltcheck_touch_grass_cooldown_ms: durationMs + 5_000,
  });
}

export async function saveGameBlockOptIn(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [TILTCHECK_GAME_BLOCK_OPT_IN_KEY]: enabled });
}

export async function saveBlockedGames(slugs: string[]): Promise<void> {
  await chrome.storage.local.set({
    [TILTCHECK_BLOCKED_GAMES_KEY]: normalizeBlockedGamesList(slugs),
  });
}

export async function saveBlockedCategories(categories: readonly string[]): Promise<void> {
  await chrome.storage.local.set({
    [TILTCHECK_BLOCKED_CATEGORIES_KEY]: normalizeBlockedCategories(categories),
  });
}

export function toggleCategoryInList(categories: readonly GameCategory[], category: string): GameCategory[] {
  if (!GAME_EXCLUSION_CATEGORIES.includes(category as GameCategory)) return [...categories];
  const next = new Set(categories);
  if (next.has(category as GameCategory)) {
    next.delete(category as GameCategory);
  } else {
    next.add(category as GameCategory);
  }
  return normalizeBlockedCategories([...next]);
}

export function toggleSlugInList(slugs: readonly string[], slug: string): string[] {
  const normalized = normalizeBlockedGameSlug(slug);
  if (!normalized) return [...slugs];
  const set = new Set(slugs);
  if (set.has(normalized)) {
    set.delete(normalized);
  } else {
    set.add(normalized);
  }
  return normalizeBlockedGamesList([...set]);
}

export function addCustomSlug(slugs: readonly string[], raw: string): string[] {
  const normalized = normalizeBlockedGameSlug(raw);
  if (!normalized) return [...slugs];
  return normalizeBlockedGamesList([...slugs, normalized]);
}

export function formatDurationLabel(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return r > 0 ? `${m}m ${r}s` : `${m}m`;
  }
  return `${sec}s`;
}

export function riskLabel(threshold: number): string {
  if (threshold <= 60) return 'Strict';
  if (threshold <= 75) return 'Balanced';
  if (threshold <= 90) return 'Moderate';
  return 'Lenient';
}

export { DEFAULT_RISK_THRESHOLD, DEFAULT_TOUCH_GRASS_DURATION_MS };
export type { CoreCircuitBreakerOptions };
