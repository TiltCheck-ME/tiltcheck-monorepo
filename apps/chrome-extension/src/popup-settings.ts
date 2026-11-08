/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */

/**
 * Popup bindings for core Touch Grass + Pro strategic filter storage keys.
 */

import {
  DEFAULT_HOURLY_WAGE,
  DEFAULT_RISK_THRESHOLD,
  DEFAULT_TOUCH_GRASS_DURATION_MS,
  loadCoreCircuitBreakerOptions,
  MAX_HOURLY_WAGE,
  MIN_HOURLY_WAGE,
  TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY,
  TILTCHECK_COOLDOWN_WALLET_KEY,
  TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY,
  TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY,
  TILTCHECK_PROFIT_LOCK_ENABLED_KEY,
  TILTCHECK_PROFIT_LOCK_TRAILING_PERCENT_KEY,
  TILTCHECK_PROFIT_LOCK_MIN_PROFIT_KEY,
  TILTCHECK_CASHOUT_GOALS_ENABLED_KEY,
  TILTCHECK_CASHOUT_GOALS_KEY,
  TILTCHECK_HOURLY_WAGE_KEY,
  TILTCHECK_REALITY_HUD_ENABLED_KEY,
  TILTCHECK_REALITY_THRESHOLD_HOURS_KEY,
  TILTCHECK_RISK_THRESHOLD_KEY,
  TILTCHECK_TOUCH_GRASS_DURATION_MS_KEY,
  TILTCHECK_TOUCH_GRASS_OPT_IN_KEY,
  TILTCHECK_AUDIO_ALERTS_ENABLED_KEY,
  TILTCHECK_AUDIO_ALERTS_VOLUME_KEY,
  TILTCHECK_AUTO_LOCK_ON_TILT_KEY,
  TILTCHECK_AUTO_LOCK_THRESHOLD_KEY,
  TILTCHECK_AUTO_LOCK_DURATION_KEY,
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
  TILTCHECK_GAME_BLOCK_OPT_IN_KEY,
} from './pro/blocked-games-options.js';
import { GAME_EXCLUSION_CATEGORIES, type GameCategory } from './exclusion-taxonomy.js';
import { type CashoutGoal, DEFAULT_CASHOUT_GOALS, sanitizeCashoutGoals } from './profit-lock.js';
import {
  type BonusTrackerConfig,
  DEFAULT_BONUS_TRACKER_CONFIG,
  calculateTargetWager,
  calculateBonusProgress,
  saveBonusTrackerConfig as persistBonusConfig,
} from './bonus-tracker.js';

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
  hourlyWage: number;
  realityHudEnabled: boolean;
  realityThresholdHours: number;
  depositBarrierEnabled: boolean;
  reverseWithdrawalShieldEnabled: boolean;
  profitLockEnabled: boolean;
  trailingPercent: number;
  minProfit: number;
  goalsEnabled: boolean;
  goals: CashoutGoal[];
  bonusConfig: BonusTrackerConfig;
  cooldownActiveUntil: number;
  cooldownWallet: string | null;
  autoLockOnTilt: boolean;
  autoLockThreshold: number;
  autoLockDuration: number;
  audioAlertsEnabled: boolean;
  audioAlertsVolume: number;
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
    hourlyWage: opts.hourlyWage,
    realityHudEnabled: opts.realityHudEnabled,
    realityThresholdHours: opts.realityThresholdHours,
    depositBarrierEnabled: opts.depositBarrierEnabled,
    reverseWithdrawalShieldEnabled: opts.reverseWithdrawalShieldEnabled,
    profitLockEnabled: opts.profitLockEnabled,
    trailingPercent: opts.trailingPercent,
    minProfit: opts.minProfit,
    goalsEnabled: opts.goalsEnabled,
    goals: opts.goals,
    bonusConfig: opts.bonusConfig,
    cooldownActiveUntil: opts.cooldownActiveUntil,
    cooldownWallet: opts.cooldownWallet,
    autoLockOnTilt: opts.autoLockOnTilt,
    autoLockThreshold: opts.autoLockThreshold,
    autoLockDuration: opts.autoLockDuration,
    audioAlertsEnabled: opts.audioAlertsEnabled,
    audioAlertsVolume: opts.audioAlertsVolume,
  };
}

export async function saveAudioAlertsEnabled(enabled: boolean): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [TILTCHECK_AUDIO_ALERTS_ENABLED_KEY]: enabled });
  }
}

export async function saveAudioAlertsVolume(volume: number): Promise<void> {
  const clamped = Math.max(0, Math.min(1, volume));
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [TILTCHECK_AUDIO_ALERTS_VOLUME_KEY]: clamped });
  }
}

export function clampHourlyWage(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_HOURLY_WAGE;
  return Math.min(MAX_HOURLY_WAGE, Math.max(MIN_HOURLY_WAGE, Math.round(n)));
}

export async function saveHourlyWage(value: unknown): Promise<number> {
  const clamped = clampHourlyWage(value);
  await chrome.storage.local.set({ [TILTCHECK_HOURLY_WAGE_KEY]: clamped });
  return clamped;
}

export async function saveRealityHudEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [TILTCHECK_REALITY_HUD_ENABLED_KEY]: enabled });
}

export async function saveDepositBarrierEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY]: enabled });
}

export async function saveReverseWithdrawalShieldEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY]: enabled });
}

export async function saveProfitLockEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [TILTCHECK_PROFIT_LOCK_ENABLED_KEY]: enabled });
}

export async function saveProfitLockTrailingPercent(percent: number): Promise<void> {
  const clamped = Math.min(90, Math.max(10, Math.round(percent)));
  await chrome.storage.local.set({ [TILTCHECK_PROFIT_LOCK_TRAILING_PERCENT_KEY]: clamped });
}

export async function saveProfitLockMinProfit(minProfit: number): Promise<void> {
  const clamped = Math.max(10, Math.round(minProfit));
  await chrome.storage.local.set({ [TILTCHECK_PROFIT_LOCK_MIN_PROFIT_KEY]: clamped });
}

export async function saveCashoutGoalsEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [TILTCHECK_CASHOUT_GOALS_ENABLED_KEY]: enabled });
}

export async function saveCashoutGoals(goals: CashoutGoal[]): Promise<void> {
  await chrome.storage.local.set({ [TILTCHECK_CASHOUT_GOALS_KEY]: sanitizeCashoutGoals(goals) });
}

export function toggleGoalInList(goals: readonly CashoutGoal[], goalId: string): CashoutGoal[] {
  return goals.map((g) => (g.id === goalId ? { ...g, enabled: !g.enabled } : g));
}

export function addGoalToList(goals: readonly CashoutGoal[], newGoal: CashoutGoal): CashoutGoal[] {
  return [...goals, newGoal];
}

export async function saveBonusTrackerConfig(config: BonusTrackerConfig): Promise<void> {
  await persistBonusConfig(config);
}

export function removeGoalFromList(goals: readonly CashoutGoal[], goalId: string): CashoutGoal[] {
  return goals.filter((g) => g.id !== goalId);
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
export type { CoreCircuitBreakerOptions, CashoutGoal, BonusTrackerConfig };
export { DEFAULT_BONUS_TRACKER_CONFIG, calculateTargetWager, calculateBonusProgress };
export { DEFAULT_CASHOUT_GOALS };

export async function saveAutoLockOnTilt(enabled: boolean): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [TILTCHECK_AUTO_LOCK_ON_TILT_KEY]: enabled });
  }
}

export async function saveAutoLockThreshold(threshold: number): Promise<void> {
  const clamped = Math.max(50, Math.min(95, Math.round(threshold)));
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [TILTCHECK_AUTO_LOCK_THRESHOLD_KEY]: clamped });
  }
}

export async function saveAutoLockDuration(duration: number): Promise<void> {
  const clamped = Math.max(3600, Math.min(2592000, Math.round(duration)));
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [TILTCHECK_AUTO_LOCK_DURATION_KEY]: clamped });
  }
}

export async function saveCooldownWallet(wallet: string | null): Promise<string | null> {
  const trimmed = typeof wallet === 'string' ? wallet.trim() : null;
  const valid = trimmed && trimmed.length >= 32 && trimmed.length <= 44 ? trimmed : null;
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    if (valid) {
      await chrome.storage.local.set({ [TILTCHECK_COOLDOWN_WALLET_KEY]: valid });
    } else {
      await chrome.storage.local.remove([TILTCHECK_COOLDOWN_WALLET_KEY]);
    }
  }
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      chrome.runtime.sendMessage({ type: 'sync_cooldown_wallet', wallet: valid });
    } catch {
      // Ignore runtime message failure in disconnected contexts
    }
  }
  return valid;
}


export const TILTCHECK_ONBOARDING_COMPLETED_KEY = 'tiltcheck_onboarding_completed';

export async function saveOnboardingCompleted(completed = true): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [TILTCHECK_ONBOARDING_COMPLETED_KEY]: completed });
  }
}

export async function loadOnboardingCompleted(): Promise<boolean> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const stored = await chrome.storage.local.get([TILTCHECK_ONBOARDING_COMPLETED_KEY]);
    return stored[TILTCHECK_ONBOARDING_COMPLETED_KEY] === true;
  }
  return false;
}
