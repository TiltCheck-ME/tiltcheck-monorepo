/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @tiltcheck/config
 * 
 * Centralized configuration for the TiltCheck ecosystem.
 * Includes severity calculations, environment utilities, and Zod-validated configs.
 */

// Re-export startup validation (validate.ts)
export {
  EnvSchema,
  type ValidatedEnv,
  validateEnv as validateEnvAtStartup,
} from './validate.js';

// Re-export environment validation
export {
  // Schemas
  jwtConfigSchema,
  serviceJwtConfigSchema,
  discordConfigSchema,
  databaseConfigSchema,
  supabaseConfigSchema,
  blockchainConfigSchema,
  serverConfigSchema,
  cookieConfigSchema,
  fullConfigSchema,
  env,

  // Types
  type JWTEnvConfig,
  type ServiceJWTEnvConfig,
  type DiscordEnvConfig,
  type DatabaseEnvConfig,
  type SupabaseEnvConfig,
  type ServerEnvConfig,
  type CookieEnvConfig,
  type FullEnvConfig,
  type ValidationResult,

  // Validation functions
  validateEnv,
  getJWTConfig,
  getServiceJWTConfig,
  getDiscordConfig,
  getDatabaseConfig,
  getSupabaseConfig,
  getServerConfig,
  getCookieConfig,
  validateAllConfig,
  createPartialValidator,

  // Service-specific configs
  getAPIConfig,
  getDashboardConfig,
  getJustTheTipConfig,
  getBotConfig,
} from './env.js';

// ============================================================
// Severity Configuration (Legacy)
// ============================================================

export const DEFAULT_SEVERITY_SCALE = [2, 4, 6, 8, 12];

export function computeSeverity(percentDrop: number): number {
  if (!isFinite(percentDrop) || percentDrop <= 0) return 1;
  return Math.min(5, Math.max(1, Math.ceil(percentDrop * 10)));
}

export function penaltyForSeverity(severity: number, scale: number[] = DEFAULT_SEVERITY_SCALE): number {
  if (severity < 1 || severity > 5) return 0;
  return -scale[severity - 1];
}

export function applySeverityPenalty(percentDrop: number, scale: number[] = DEFAULT_SEVERITY_SCALE): number {
  const sev = computeSeverity(percentDrop);
  return penaltyForSeverity(sev, scale);
}

export interface SeverityConfig {
  scale: number[];
  compute: typeof computeSeverity;
  penalty: typeof penaltyForSeverity;
}

export const severityConfig: SeverityConfig = {
  scale: DEFAULT_SEVERITY_SCALE,
  compute: computeSeverity,
  penalty: penaltyForSeverity,
};

// ============================================================
// Environment Variable Utilities (Legacy - prefer Zod validation)
// ============================================================

/** Environment variable names for Discord bot token (in order of preference) */
export const DISCORD_TOKEN_ENV_VARS = ['DISCORD_TOKEN', 'DISCORD_BOT_TOKEN'] as const;

/**
 * Get a required environment variable
 * @throws Error if variable is missing and required=true
 * @deprecated Use getDiscordConfig() or other typed config functions instead
 */
export function getEnvVar(key: string, required = true): string {
  const value = process.env[key];

  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value || '';
}

/**
 * Get Discord token from either DISCORD_TOKEN or DISCORD_BOT_TOKEN
 * Supports both variable names for flexibility across different deployment environments
 */
export function getDiscordToken(): string {
  for (const envVar of DISCORD_TOKEN_ENV_VARS) {
    const value = process.env[envVar];
    if (value) return value;
  }
  return '';
}

/**
 * Get a boolean environment variable with a default value
 */
export function getBoolEnv(key: string, defaultValue = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get a number environment variable with a default value
 */
export function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}
