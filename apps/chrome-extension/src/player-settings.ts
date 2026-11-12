/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */

/**
 * Player settings that live on the tiltcheck.me dashboard.
 *
 * One flat object, saved per Discord user by the CollectClock worker (`/settings`).
 * The extension pulls it, caches it, and writes each value into the chrome.storage
 * keys the content script already reads. The worker validates the same shape
 * (collectclock-api `SETTINGS_SCHEMA`); keep the two in step.
 */

import {
  TILTCHECK_ENABLED_KEY,
  TILTCHECK_TOUCH_GRASS_OPT_IN_KEY,
  TILTCHECK_RISK_PROFILE_KEY,
  TILTCHECK_DEFAULT_BET_BREAKER_ENABLED_KEY,
  TILTCHECK_BASE_STAKE_THRESHOLD_KEY,
  TILTCHECK_REALITY_HUD_ENABLED_KEY,
  TILTCHECK_HOURLY_WAGE_KEY,
  TILTCHECK_REALITY_THRESHOLD_HOURS_KEY,
  TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY,
  TILTCHECK_AUTO_LOCK_ON_TILT_KEY,
  TILTCHECK_AUTO_LOCK_DURATION_KEY,
  TILTCHECK_AUTO_LOCK_THRESHOLD_KEY,
  TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY,
  TILTCHECK_PROFIT_LOCK_ENABLED_KEY,
  TILTCHECK_PROFIT_LOCK_TRAILING_PERCENT_KEY,
  TILTCHECK_PROFIT_LOCK_MIN_PROFIT_KEY,
  TILTCHECK_CASHOUT_GOALS_ENABLED_KEY,
  TILTCHECK_CASHOUT_GOALS_KEY,
  TILTCHECK_AUDIO_ALERTS_ENABLED_KEY,
  TILTCHECK_AUDIO_ALERTS_VOLUME_KEY,
  TILTCHECK_BONUS_TRACKER_CONFIG_KEY,
} from './core-options.js';
import { TILTCHECK_AUDIO_ALERTS_CONFIG_KEY } from './audio-alerts.js';
import {
  TILTCHECK_BLOCKED_CATEGORIES_KEY,
  TILTCHECK_BLOCKED_GAMES_KEY,
  TILTCHECK_GAME_BLOCK_OPT_IN_KEY,
} from './pro/blocked-games-options.js';

export type TiltSensitivity = 'conservative' | 'moderate' | 'degen';

export interface PlayerGoal {
  id: string;
  name: string;
  targetAmount: number;
  metric: 'balance' | 'profit';
  enabled: boolean;
}

export interface PlayerSettings {
  enabled: boolean;
  clickCheck: boolean;
  tiltSensitivity: TiltSensitivity;
  sneakyBet: boolean;
  sneakyBetThreshold: number;
  timeCheck: boolean;
  hourlyWage: number;
  timeCheckHours: number;
  depositBlock: boolean;
  autoBreak: boolean;
  autoBreakHours: number;
  autoBreakScore: number;
  keepTheWin: boolean;
  winSkim: boolean;
  winSkimPercent: number;
  winSkimMinProfit: number;
  cashoutGoals: boolean;
  /** Absent means "leave the extension's own goal list alone". */
  goals?: PlayerGoal[];
  bonusTracker: boolean;
  bonusName: string;
  bonusTargetWager: number;
  bonusMaxBet: number;
  bonusBlockOver: boolean;
  nopeList: boolean;
  nopeGames: string[];
  nopeCategories: string[];
  sounds: boolean;
  soundVolume: number;
}

/**
 * Safe defaults: the same values the extension already used before settings moved
 * to the dashboard, so a signed-out or offline player gets the behavior they had.
 * Mirrored in scripts/pages-product-data.mjs (PLAYER_SETTINGS_DEFAULTS); a test keeps them equal.
 */
export const DEFAULT_PLAYER_SETTINGS: Readonly<PlayerSettings> = Object.freeze({
  enabled: true,
  clickCheck: true,
  tiltSensitivity: 'moderate',
  sneakyBet: true,
  sneakyBetThreshold: 0.5,
  timeCheck: true,
  hourlyWage: 25,
  timeCheckHours: 2,
  depositBlock: true,
  autoBreak: true,
  autoBreakHours: 24,
  autoBreakScore: 75,
  keepTheWin: true,
  winSkim: true,
  winSkimPercent: 50,
  winSkimMinProfit: 50,
  cashoutGoals: true,
  bonusTracker: false,
  bonusName: 'Deposit Bonus',
  bonusTargetWager: 1000,
  bonusMaxBet: 5,
  bonusBlockOver: true,
  nopeList: false,
  nopeGames: [],
  nopeCategories: [],
  sounds: true,
  soundVolume: 0.25,
}) as Readonly<PlayerSettings>;

type NumRule = { kind: 'num'; min: number; max: number; int?: boolean };
type Rule =
  | { kind: 'bool' }
  | NumRule
  | { kind: 'enum'; values: readonly string[] }
  | { kind: 'str'; max: number }
  | { kind: 'slugs'; max: number; len: number }
  | { kind: 'goals'; max: number };

/** Same limits the worker enforces. */
export const PLAYER_SETTINGS_RULES: Record<keyof PlayerSettings, Rule> = {
  enabled: { kind: 'bool' },
  clickCheck: { kind: 'bool' },
  tiltSensitivity: { kind: 'enum', values: ['conservative', 'moderate', 'degen'] },
  sneakyBet: { kind: 'bool' },
  sneakyBetThreshold: { kind: 'num', min: 0.01, max: 1000 },
  timeCheck: { kind: 'bool' },
  hourlyWage: { kind: 'num', min: 5, max: 2000, int: true },
  timeCheckHours: { kind: 'num', min: 0.5, max: 24 },
  depositBlock: { kind: 'bool' },
  autoBreak: { kind: 'bool' },
  autoBreakHours: { kind: 'num', min: 1, max: 720, int: true },
  autoBreakScore: { kind: 'num', min: 50, max: 95, int: true },
  keepTheWin: { kind: 'bool' },
  winSkim: { kind: 'bool' },
  winSkimPercent: { kind: 'num', min: 10, max: 90, int: true },
  winSkimMinProfit: { kind: 'num', min: 10, max: 10000, int: true },
  cashoutGoals: { kind: 'bool' },
  goals: { kind: 'goals', max: 10 },
  bonusTracker: { kind: 'bool' },
  bonusName: { kind: 'str', max: 60 },
  bonusTargetWager: { kind: 'num', min: 0, max: 100000000 },
  bonusMaxBet: { kind: 'num', min: 0, max: 1000000 },
  bonusBlockOver: { kind: 'bool' },
  nopeList: { kind: 'bool' },
  nopeGames: { kind: 'slugs', max: 64, len: 48 },
  nopeCategories: { kind: 'slugs', max: 24, len: 32 },
  sounds: { kind: 'bool' },
  soundVolume: { kind: 'num', min: 0, max: 1 },
};

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;
const GOAL_ID_RE = /^[A-Za-z0-9_.-]{1,40}$/;

function cleanValue(rule: Rule, value: unknown): unknown {
  switch (rule.kind) {
    case 'bool':
      return typeof value === 'boolean' ? value : undefined;
    case 'num': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
      if (value < rule.min || value > rule.max) return undefined;
      return rule.int ? Math.round(value) : value;
    }
    case 'enum':
      return typeof value === 'string' && rule.values.includes(value) ? value : undefined;
    case 'str':
      return typeof value === 'string' ? value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, rule.max) : undefined;
    case 'slugs': {
      if (!Array.isArray(value)) return undefined;
      const out: string[] = [];
      for (const v of value) {
        if (typeof v !== 'string' || v.length > rule.len || !SLUG_RE.test(v) || out.includes(v)) continue;
        out.push(v);
        if (out.length >= rule.max) break;
      }
      return out;
    }
    case 'goals': {
      if (!Array.isArray(value)) return undefined;
      const out: PlayerGoal[] = [];
      for (const g of value) {
        if (!g || typeof g !== 'object') continue;
        const o = g as Record<string, unknown>;
        const name = typeof o.name === 'string' ? o.name.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40) : '';
        const amount = typeof o.targetAmount === 'number' && Number.isFinite(o.targetAmount) ? o.targetAmount : NaN;
        if (typeof o.id !== 'string' || !GOAL_ID_RE.test(o.id) || !name || !(amount >= 1 && amount <= 10000000)) continue;
        out.push({
          id: o.id,
          name,
          targetAmount: amount,
          metric: o.metric === 'profit' ? 'profit' : 'balance',
          enabled: o.enabled !== false,
        });
        if (out.length >= rule.max) break;
      }
      return out;
    }
  }
}

/**
 * Keep only known keys with valid values. Anything else is dropped, never guessed.
 */
export function sanitizePlayerSettings(raw: unknown): Partial<PlayerSettings> {
  const out: Record<string, unknown> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out as Partial<PlayerSettings>;
  for (const [key, rule] of Object.entries(PLAYER_SETTINGS_RULES)) {
    const v = cleanValue(rule, (raw as Record<string, unknown>)[key]);
    if (v !== undefined) out[key] = v;
  }
  return out as Partial<PlayerSettings>;
}

/** Defaults with any valid saved values laid on top. */
export function withDefaults(saved: unknown): PlayerSettings {
  return { ...DEFAULT_PLAYER_SETTINGS, ...sanitizePlayerSettings(saved) } as PlayerSettings;
}

/**
 * The chrome.storage writes that make the content script follow these settings.
 * `currentBonusWagered` keeps the in-progress playthrough count the extension tracks locally.
 */
export function settingsToStorage(settings: PlayerSettings, currentBonusWagered = 0): Record<string, unknown> {
  const out: Record<string, unknown> = {
    [TILTCHECK_ENABLED_KEY]: settings.enabled,
    [TILTCHECK_TOUCH_GRASS_OPT_IN_KEY]: settings.clickCheck,
    [TILTCHECK_RISK_PROFILE_KEY]: settings.tiltSensitivity,
    [TILTCHECK_DEFAULT_BET_BREAKER_ENABLED_KEY]: settings.sneakyBet,
    [TILTCHECK_BASE_STAKE_THRESHOLD_KEY]: settings.sneakyBetThreshold,
    [TILTCHECK_REALITY_HUD_ENABLED_KEY]: settings.timeCheck,
    [TILTCHECK_HOURLY_WAGE_KEY]: settings.hourlyWage,
    [TILTCHECK_REALITY_THRESHOLD_HOURS_KEY]: settings.timeCheckHours,
    [TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY]: settings.depositBlock,
    [TILTCHECK_AUTO_LOCK_ON_TILT_KEY]: settings.autoBreak,
    [TILTCHECK_AUTO_LOCK_DURATION_KEY]: settings.autoBreakHours * 3600,
    [TILTCHECK_AUTO_LOCK_THRESHOLD_KEY]: settings.autoBreakScore,
    [TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY]: settings.keepTheWin,
    [TILTCHECK_PROFIT_LOCK_ENABLED_KEY]: settings.winSkim,
    [TILTCHECK_PROFIT_LOCK_TRAILING_PERCENT_KEY]: settings.winSkimPercent,
    [TILTCHECK_PROFIT_LOCK_MIN_PROFIT_KEY]: settings.winSkimMinProfit,
    [TILTCHECK_CASHOUT_GOALS_ENABLED_KEY]: settings.cashoutGoals,
    [TILTCHECK_BONUS_TRACKER_CONFIG_KEY]: {
      active: settings.bonusTracker,
      bonusName: settings.bonusName || DEFAULT_PLAYER_SETTINGS.bonusName,
      targetWager: settings.bonusTargetWager,
      currentWagered: Math.max(0, Number(currentBonusWagered) || 0),
      maxBetLimit: settings.bonusMaxBet,
      blockExceededBets: settings.bonusBlockOver,
    },
    [TILTCHECK_GAME_BLOCK_OPT_IN_KEY]: settings.nopeList,
    [TILTCHECK_BLOCKED_GAMES_KEY]: [...settings.nopeGames],
    [TILTCHECK_BLOCKED_CATEGORIES_KEY]: [...settings.nopeCategories],
    [TILTCHECK_AUDIO_ALERTS_ENABLED_KEY]: settings.sounds,
    [TILTCHECK_AUDIO_ALERTS_VOLUME_KEY]: settings.soundVolume,
    [TILTCHECK_AUDIO_ALERTS_CONFIG_KEY]: { enabled: settings.sounds, volume: settings.soundVolume },
  };
  if (Array.isArray(settings.goals)) {
    out[TILTCHECK_CASHOUT_GOALS_KEY] = settings.goals.map((g) => ({ ...g, linkUrl: '' }));
  }
  return out;
}
