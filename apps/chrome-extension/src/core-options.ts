/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-20 */

/**
 * Core circuit-breaker settings (chrome.storage.local).
 * Popup/options UI should write these keys after explicit user opt-in.
 */

import { TOUCH_GRASS_DURATION_MS } from './touch-grass-timeout.js';

export const TILTCHECK_RISK_THRESHOLD_KEY = 'tiltcheck_risk_threshold';
export const TILTCHECK_TOUCH_GRASS_DURATION_MS_KEY = 'tiltcheck_touch_grass_duration_ms';
export const TILTCHECK_TOUCH_GRASS_COOLDOWN_MS_KEY = 'tiltcheck_touch_grass_cooldown_ms';
/** User must enable enforcement + accept policy before popup writes `true`. */
export const TILTCHECK_TOUCH_GRASS_OPT_IN_KEY = 'tiltcheck_touch_grass_opt_in';
/** Core tilt sensitivity profile (Conservative / Moderate / Degen). */
export const TILTCHECK_RISK_PROFILE_KEY = 'tiltcheck_risk_profile';

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
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
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
    };
  } catch {
    return {
      riskThreshold: DEFAULT_RISK_THRESHOLD,
      touchGrassDurationMs: DEFAULT_TOUCH_GRASS_DURATION_MS,
      touchGrassCooldownMs: DEFAULT_TOUCH_GRASS_COOLDOWN_MS,
      riskProfile: DEFAULT_RISK_PROFILE,
      enforcementEnabled: true,
    };
  }
}
