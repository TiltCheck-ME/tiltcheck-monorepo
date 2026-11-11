/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 */

/**
 * Core circuit-breaker settings (chrome.storage.local).
 * Popup/options UI should write these keys after explicit user opt-in.
 */

import { TOUCH_GRASS_DURATION_MS } from './touch-grass-timeout.js';
import {
  DEFAULT_BONUS_TRACKER_CONFIG,
  type BonusTrackerConfig,
  sanitizeBonusConfig,
  TILTCHECK_BONUS_TRACKER_CONFIG_KEY,
} from './bonus-tracker.js';
import {
  DEFAULT_CASHOUT_GOALS,
  type CashoutGoal,
  sanitizeCashoutGoals,
} from './profit-lock.js';

export const TILTCHECK_RISK_THRESHOLD_KEY = 'tiltcheck_risk_threshold';
export const TILTCHECK_TOUCH_GRASS_DURATION_MS_KEY = 'tiltcheck_touch_grass_duration_ms';
export const TILTCHECK_TOUCH_GRASS_COOLDOWN_MS_KEY = 'tiltcheck_touch_grass_cooldown_ms';
/** User must enable enforcement + accept policy before popup writes `true`. */
export const TILTCHECK_TOUCH_GRASS_OPT_IN_KEY = 'tiltcheck_touch_grass_opt_in';
/** Core tilt sensitivity profile (Conservative / Moderate / Degen). */
export const TILTCHECK_RISK_PROFILE_KEY = 'tiltcheck_risk_profile';

export const TILTCHECK_HOURLY_WAGE_KEY = 'tiltcheck_hourly_wage';
export const TILTCHECK_REALITY_HUD_ENABLED_KEY = 'tiltcheck_reality_hud_enabled';
export const TILTCHECK_REALITY_THRESHOLD_HOURS_KEY = 'tiltcheck_reality_threshold_hours';
export const TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY = 'tiltcheck_deposit_barrier_enabled';
export const TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY = 'tiltcheck_reverse_withdrawal_shield_enabled';
export const TILTCHECK_PROFIT_LOCK_ENABLED_KEY = 'tiltcheck_profit_lock_enabled';
export const TILTCHECK_PROFIT_LOCK_TRAILING_PERCENT_KEY = 'tiltcheck_profit_lock_trailing_percent';
export const TILTCHECK_PROFIT_LOCK_MIN_PROFIT_KEY = 'tiltcheck_profit_lock_min_profit';
export const TILTCHECK_CASHOUT_GOALS_ENABLED_KEY = 'tiltcheck_cashout_goals_enabled';
export const TILTCHECK_CASHOUT_GOALS_KEY = 'tiltcheck_cashout_goals';
export const TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY = 'tiltcheck_cooldown_active_until';
export const TILTCHECK_COOLDOWN_WALLET_KEY = 'tiltcheck_cooldown_wallet';
export const TILTCHECK_COOLDOWN_SOURCE_KEY = 'tiltcheck_cooldown_source';
export const TILTCHECK_AUTO_LOCK_ON_TILT_KEY = 'tiltcheck_auto_lock_on_tilt';
export const TILTCHECK_AUTO_LOCK_THRESHOLD_KEY = 'tiltcheck_auto_lock_threshold';
export const TILTCHECK_AUTO_LOCK_DURATION_KEY = 'tiltcheck_auto_lock_duration';
export const TILTCHECK_AUDIO_ALERTS_ENABLED_KEY = 'tiltcheck_audio_alerts_enabled';
export const TILTCHECK_AUDIO_ALERTS_VOLUME_KEY = 'tiltcheck_audio_alerts_volume';
export const TILTCHECK_DEFAULT_BET_BREAKER_ENABLED_KEY = 'tiltcheck_default_bet_breaker_enabled';
export const TILTCHECK_BASE_STAKE_THRESHOLD_KEY = 'tiltcheck_base_stake_threshold';
export const TILTCHECK_UI_MODE_KEY = 'tiltcheck_ui_mode';
export const TILTCHECK_ACTIVE_PRESET_KEY = 'tiltcheck_active_preset';
export const TILTCHECK_POPUP_SIZE_KEY = 'tiltcheck_popup_size';
export const TILTCHECK_ALWAYS_POPOUT_KEY = 'tiltcheck_always_popout';
export type UiMode = 'easy' | 'pro';
export type PopupSize = 'compact' | 'standard' | 'expanded';
export const DEFAULT_UI_MODE: UiMode = 'easy';
export const DEFAULT_ACTIVE_PRESET = 'bag_securer';
export const DEFAULT_POPUP_SIZE: PopupSize = 'standard';
export { TILTCHECK_BONUS_TRACKER_CONFIG_KEY, DEFAULT_BONUS_TRACKER_CONFIG };
export type { BonusTrackerConfig };

export type RiskProfile = 'conservative' | 'moderate' | 'degen';

export const DEFAULT_RISK_PROFILE: RiskProfile = 'moderate';

const RISK_PROFILE_MULTIPLIERS: Record<RiskProfile, number> = {
  conservative: 1.2,
  moderate: 1.0,
  degen: 0.8,
};

/** Keys the Core circuit breaker reads; Pro/popup must not write these mid-session. */
export const CORE_CIRCUIT_BREAKER_STORAGE_KEYS = [
  TILTCHECK_RISK_THRESHOLD_KEY,
  TILTCHECK_TOUCH_GRASS_DURATION_MS_KEY,
  TILTCHECK_TOUCH_GRASS_COOLDOWN_MS_KEY,
  TILTCHECK_TOUCH_GRASS_OPT_IN_KEY,
  TILTCHECK_RISK_PROFILE_KEY,
  TILTCHECK_HOURLY_WAGE_KEY,
  TILTCHECK_REALITY_HUD_ENABLED_KEY,
  TILTCHECK_REALITY_THRESHOLD_HOURS_KEY,
  TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY,
  TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY,
  TILTCHECK_PROFIT_LOCK_ENABLED_KEY,
  TILTCHECK_PROFIT_LOCK_TRAILING_PERCENT_KEY,
  TILTCHECK_PROFIT_LOCK_MIN_PROFIT_KEY,
  TILTCHECK_CASHOUT_GOALS_ENABLED_KEY,
  TILTCHECK_CASHOUT_GOALS_KEY,
  TILTCHECK_BONUS_TRACKER_CONFIG_KEY,
  TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY,
  TILTCHECK_COOLDOWN_WALLET_KEY,
  TILTCHECK_COOLDOWN_SOURCE_KEY,
  TILTCHECK_AUTO_LOCK_ON_TILT_KEY,
  TILTCHECK_AUTO_LOCK_THRESHOLD_KEY,
  TILTCHECK_AUTO_LOCK_DURATION_KEY,
  TILTCHECK_AUDIO_ALERTS_ENABLED_KEY,
  TILTCHECK_AUDIO_ALERTS_VOLUME_KEY,
  TILTCHECK_DEFAULT_BET_BREAKER_ENABLED_KEY,
  TILTCHECK_BASE_STAKE_THRESHOLD_KEY,
  TILTCHECK_UI_MODE_KEY,
  TILTCHECK_ACTIVE_PRESET_KEY,
  TILTCHECK_POPUP_SIZE_KEY,
  TILTCHECK_ALWAYS_POPOUT_KEY,
] as const;

export function normalizeRiskProfile(value: unknown, legacyRiskLevel?: unknown): RiskProfile {
  if (value === 'conservative' || value === 'moderate' || value === 'degen') {
    return value;
  }
  if (legacyRiskLevel === 'conservative' || legacyRiskLevel === 'moderate' || legacyRiskLevel === 'degen') {
    return legacyRiskLevel;
  }
  return DEFAULT_RISK_PROFILE;
}

export function riskProfileMultiplier(profile: RiskProfile): number {
  return RISK_PROFILE_MULTIPLIERS[profile];
}

export const DEFAULT_RISK_THRESHOLD = 85;
export const DEFAULT_TOUCH_GRASS_DURATION_MS = TOUCH_GRASS_DURATION_MS;
/** Cooldown slightly longer than lockout to prevent re-fire on first click after unlock. */
export const DEFAULT_TOUCH_GRASS_COOLDOWN_MS = DEFAULT_TOUCH_GRASS_DURATION_MS + 5_000;

export const DEFAULT_HOURLY_WAGE = 25;
export const MIN_HOURLY_WAGE = 5;
export const MAX_HOURLY_WAGE = 2000;
export const DEFAULT_REALITY_HUD_ENABLED = true;
export const DEFAULT_REALITY_THRESHOLD_HOURS = 2;
export const MIN_REALITY_THRESHOLD_HOURS = 0.5;
export const MAX_REALITY_THRESHOLD_HOURS = 24;
export const DEFAULT_DEPOSIT_BARRIER_ENABLED = true;
export const DEFAULT_REVERSE_WITHDRAWAL_SHIELD_ENABLED = true;
export const DEFAULT_PROFIT_LOCK_ENABLED = true;
export const DEFAULT_TRAILING_PERCENT = 50;
export const DEFAULT_MIN_PROFIT = 50;
export const DEFAULT_CASHOUT_GOALS_ENABLED = true;
export const DEFAULT_AUDIO_ALERTS_ENABLED = true;
export const DEFAULT_AUDIO_ALERTS_VOLUME = 0.25;

export const DEFAULT_DEFAULT_BET_BREAKER_ENABLED = true;
export const DEFAULT_BASE_STAKE_THRESHOLD = 0.50;
export const MIN_BASE_STAKE_THRESHOLD = 0.01;
export const MAX_BASE_STAKE_THRESHOLD = 1000.0;

export const DEFAULT_AUTO_LOCK_ON_TILT = true;
export const DEFAULT_AUTO_LOCK_THRESHOLD = 75;
export const DEFAULT_AUTO_LOCK_DURATION = 86400;
export const MIN_AUTO_LOCK_THRESHOLD = 50;
export const MAX_AUTO_LOCK_THRESHOLD = 95;
export const MIN_AUTO_LOCK_DURATION = 3600;
export const MAX_AUTO_LOCK_DURATION = 2592000;

const MIN_RISK_THRESHOLD = 50;
const MAX_RISK_THRESHOLD = 100;
const MIN_DURATION_MS = 30_000;
const MAX_DURATION_MS = 600_000;
const MIN_COOLDOWN_MS = 30_000;
const MAX_COOLDOWN_MS = 900_000;

export interface CoreCircuitBreakerOptions {
  riskThreshold: number;
  touchGrassDurationMs: number;
  touchGrassCooldownMs: number;
  riskProfile: RiskProfile;
  /** When false, core path does not fire Touch Grass (default true until options UI ships). */
  enforcementEnabled: boolean;
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
  cooldownSource: string | null;
  autoLockOnTilt: boolean;
  autoLockThreshold: number;
  autoLockDuration: number;
  audioAlertsEnabled: boolean;
  audioAlertsVolume: number;
  defaultBetBreakerEnabled: boolean;
  baseStakeThreshold: number;
  uiMode: UiMode;
  activePreset: string;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampFloat(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Load core thresholds from extension storage with safe fallbacks.
 */
export async function loadCoreCircuitBreakerOptions(): Promise<CoreCircuitBreakerOptions> {
  try {
    const stored = await chrome.storage.local.get([
      TILTCHECK_RISK_THRESHOLD_KEY,
      TILTCHECK_TOUCH_GRASS_DURATION_MS_KEY,
      TILTCHECK_TOUCH_GRASS_COOLDOWN_MS_KEY,
      TILTCHECK_TOUCH_GRASS_OPT_IN_KEY,
      TILTCHECK_RISK_PROFILE_KEY,
      TILTCHECK_HOURLY_WAGE_KEY,
      TILTCHECK_REALITY_HUD_ENABLED_KEY,
      TILTCHECK_REALITY_THRESHOLD_HOURS_KEY,
      TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY,
      TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY,
      TILTCHECK_PROFIT_LOCK_ENABLED_KEY,
      TILTCHECK_PROFIT_LOCK_TRAILING_PERCENT_KEY,
      TILTCHECK_PROFIT_LOCK_MIN_PROFIT_KEY,
      TILTCHECK_CASHOUT_GOALS_ENABLED_KEY,
      TILTCHECK_CASHOUT_GOALS_KEY,
      TILTCHECK_BONUS_TRACKER_CONFIG_KEY,
      TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY,
      TILTCHECK_COOLDOWN_WALLET_KEY,
      TILTCHECK_COOLDOWN_SOURCE_KEY,
      TILTCHECK_AUTO_LOCK_ON_TILT_KEY,
      TILTCHECK_AUTO_LOCK_THRESHOLD_KEY,
      TILTCHECK_AUTO_LOCK_DURATION_KEY,
      TILTCHECK_AUDIO_ALERTS_ENABLED_KEY,
      TILTCHECK_AUDIO_ALERTS_VOLUME_KEY,
      TILTCHECK_DEFAULT_BET_BREAKER_ENABLED_KEY,
      TILTCHECK_BASE_STAKE_THRESHOLD_KEY,
      'riskLevel',
    ]);

    const durationMs = clampInt(
      stored[TILTCHECK_TOUCH_GRASS_DURATION_MS_KEY],
      MIN_DURATION_MS,
      MAX_DURATION_MS,
      DEFAULT_TOUCH_GRASS_DURATION_MS
    );

    const cooldownDefault = durationMs + 5_000;
    const cooldownMs = clampInt(
      stored[TILTCHECK_TOUCH_GRASS_COOLDOWN_MS_KEY],
      MIN_COOLDOWN_MS,
      MAX_COOLDOWN_MS,
      cooldownDefault
    );

    const optIn = stored[TILTCHECK_TOUCH_GRASS_OPT_IN_KEY];
    const enforcementEnabled = optIn === undefined ? true : optIn === true;

    const hourlyWage = clampInt(
      stored[TILTCHECK_HOURLY_WAGE_KEY],
      MIN_HOURLY_WAGE,
      MAX_HOURLY_WAGE,
      DEFAULT_HOURLY_WAGE
    );

    const realityHudOpt = stored[TILTCHECK_REALITY_HUD_ENABLED_KEY];
    const realityHudEnabled = realityHudOpt === undefined ? DEFAULT_REALITY_HUD_ENABLED : realityHudOpt === true;

    const realityThresholdHours = clampFloat(
      stored[TILTCHECK_REALITY_THRESHOLD_HOURS_KEY],
      MIN_REALITY_THRESHOLD_HOURS,
      MAX_REALITY_THRESHOLD_HOURS,
      DEFAULT_REALITY_THRESHOLD_HOURS
    );

    const depositBarrierOpt = stored[TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY];
    const depositBarrierEnabled = depositBarrierOpt === undefined ? DEFAULT_DEPOSIT_BARRIER_ENABLED : depositBarrierOpt === true;

    const reverseWithdrawalShieldOpt = stored[TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY];
    const reverseWithdrawalShieldEnabled =
      reverseWithdrawalShieldOpt === undefined
        ? DEFAULT_REVERSE_WITHDRAWAL_SHIELD_ENABLED
        : reverseWithdrawalShieldOpt === true;

    const profitLockOpt = stored[TILTCHECK_PROFIT_LOCK_ENABLED_KEY];
    const profitLockEnabled = profitLockOpt === undefined ? DEFAULT_PROFIT_LOCK_ENABLED : profitLockOpt === true;

    const trailingPercent = clampInt(
      stored[TILTCHECK_PROFIT_LOCK_TRAILING_PERCENT_KEY],
      10,
      90,
      DEFAULT_TRAILING_PERCENT
    );

    const minProfit = clampInt(
      stored[TILTCHECK_PROFIT_LOCK_MIN_PROFIT_KEY],
      10,
      10000,
      DEFAULT_MIN_PROFIT
    );

    const goalsOpt = stored[TILTCHECK_CASHOUT_GOALS_ENABLED_KEY];
    const goalsEnabled = goalsOpt === undefined ? DEFAULT_CASHOUT_GOALS_ENABLED : goalsOpt === true;

    const goals = sanitizeCashoutGoals(stored[TILTCHECK_CASHOUT_GOALS_KEY]);
    const bonusConfig = sanitizeBonusConfig(stored[TILTCHECK_BONUS_TRACKER_CONFIG_KEY]);

    const cooldownActiveUntil = typeof stored[TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY] === 'number' && Number.isFinite(stored[TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY])
      ? Math.max(0, stored[TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY])
      : 0;

    const rawWallet = stored[TILTCHECK_COOLDOWN_WALLET_KEY];
    const cooldownWallet = typeof rawWallet === 'string' && rawWallet.trim().length >= 32 && rawWallet.trim().length <= 44 ? rawWallet.trim() : null;

    const rawSource = stored[TILTCHECK_COOLDOWN_SOURCE_KEY];
    const cooldownSource = typeof rawSource === 'string' && rawSource.trim().length > 0 ? rawSource.trim() : null;

    const autoLockOnTiltOpt = stored[TILTCHECK_AUTO_LOCK_ON_TILT_KEY];
    const autoLockOnTilt = autoLockOnTiltOpt === undefined ? DEFAULT_AUTO_LOCK_ON_TILT : autoLockOnTiltOpt === true;

    const autoLockThreshold = clampInt(
      stored[TILTCHECK_AUTO_LOCK_THRESHOLD_KEY],
      MIN_AUTO_LOCK_THRESHOLD,
      MAX_AUTO_LOCK_THRESHOLD,
      DEFAULT_AUTO_LOCK_THRESHOLD
    );

    const autoLockDuration = clampInt(
      stored[TILTCHECK_AUTO_LOCK_DURATION_KEY],
      MIN_AUTO_LOCK_DURATION,
      MAX_AUTO_LOCK_DURATION,
      DEFAULT_AUTO_LOCK_DURATION
    );

    const audioAlertsEnabled = typeof stored[TILTCHECK_AUDIO_ALERTS_ENABLED_KEY] === 'boolean'
      ? stored[TILTCHECK_AUDIO_ALERTS_ENABLED_KEY]
      : DEFAULT_AUDIO_ALERTS_ENABLED;

    const rawAudioVol = stored[TILTCHECK_AUDIO_ALERTS_VOLUME_KEY];
    const audioAlertsVolume = typeof rawAudioVol === 'number' && Number.isFinite(rawAudioVol)
      ? Math.max(0, Math.min(1, rawAudioVol))
      : DEFAULT_AUDIO_ALERTS_VOLUME;

    const defaultBetBreakerOpt = stored[TILTCHECK_DEFAULT_BET_BREAKER_ENABLED_KEY];
    const defaultBetBreakerEnabled = defaultBetBreakerOpt === undefined ? DEFAULT_DEFAULT_BET_BREAKER_ENABLED : defaultBetBreakerOpt === true;

    const baseStakeThreshold = clampFloat(
      stored[TILTCHECK_BASE_STAKE_THRESHOLD_KEY],
      MIN_BASE_STAKE_THRESHOLD,
      MAX_BASE_STAKE_THRESHOLD,
      DEFAULT_BASE_STAKE_THRESHOLD
    );

    return {
      riskThreshold: clampInt(
        stored[TILTCHECK_RISK_THRESHOLD_KEY],
        MIN_RISK_THRESHOLD,
        MAX_RISK_THRESHOLD,
        DEFAULT_RISK_THRESHOLD
      ),
      touchGrassDurationMs: durationMs,
      touchGrassCooldownMs: Math.max(cooldownMs, durationMs + 1_000),
      riskProfile: normalizeRiskProfile(
        stored[TILTCHECK_RISK_PROFILE_KEY],
        stored['riskLevel']
      ),
      enforcementEnabled,
      hourlyWage,
      realityHudEnabled,
      realityThresholdHours,
      depositBarrierEnabled,
      reverseWithdrawalShieldEnabled,
      profitLockEnabled,
      trailingPercent,
      minProfit,
      goalsEnabled,
      goals,
      bonusConfig,
      cooldownActiveUntil,
      cooldownWallet,
      cooldownSource,
      autoLockOnTilt,
      autoLockThreshold,
      autoLockDuration,
      audioAlertsEnabled,
      audioAlertsVolume,
      defaultBetBreakerEnabled,
      baseStakeThreshold,
      uiMode: (stored[TILTCHECK_UI_MODE_KEY] === 'pro' ? 'pro' : 'easy') as UiMode,
      activePreset: (typeof stored[TILTCHECK_ACTIVE_PRESET_KEY] === 'string' ? stored[TILTCHECK_ACTIVE_PRESET_KEY] : DEFAULT_ACTIVE_PRESET),
    };
  } catch {
    return {
      riskThreshold: DEFAULT_RISK_THRESHOLD,
      touchGrassDurationMs: DEFAULT_TOUCH_GRASS_DURATION_MS,
      touchGrassCooldownMs: DEFAULT_TOUCH_GRASS_COOLDOWN_MS,
      riskProfile: DEFAULT_RISK_PROFILE,
      enforcementEnabled: true,
      hourlyWage: DEFAULT_HOURLY_WAGE,
      realityHudEnabled: DEFAULT_REALITY_HUD_ENABLED,
      realityThresholdHours: DEFAULT_REALITY_THRESHOLD_HOURS,
      depositBarrierEnabled: DEFAULT_DEPOSIT_BARRIER_ENABLED,
      reverseWithdrawalShieldEnabled: DEFAULT_REVERSE_WITHDRAWAL_SHIELD_ENABLED,
      profitLockEnabled: DEFAULT_PROFIT_LOCK_ENABLED,
      trailingPercent: DEFAULT_TRAILING_PERCENT,
      minProfit: DEFAULT_MIN_PROFIT,
      goalsEnabled: DEFAULT_CASHOUT_GOALS_ENABLED,
      goals: [...DEFAULT_CASHOUT_GOALS],
      bonusConfig: { ...DEFAULT_BONUS_TRACKER_CONFIG },
      cooldownActiveUntil: 0,
      cooldownWallet: null,
      cooldownSource: null,
      autoLockOnTilt: DEFAULT_AUTO_LOCK_ON_TILT,
      autoLockThreshold: DEFAULT_AUTO_LOCK_THRESHOLD,
      autoLockDuration: DEFAULT_AUTO_LOCK_DURATION,
      audioAlertsEnabled: DEFAULT_AUDIO_ALERTS_ENABLED,
      audioAlertsVolume: DEFAULT_AUDIO_ALERTS_VOLUME,
      defaultBetBreakerEnabled: DEFAULT_DEFAULT_BET_BREAKER_ENABLED,
      baseStakeThreshold: DEFAULT_BASE_STAKE_THRESHOLD,
      uiMode: DEFAULT_UI_MODE,
      activePreset: DEFAULT_ACTIVE_PRESET,
    };
  }
}
