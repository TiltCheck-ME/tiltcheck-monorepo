/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

/**
 * @tiltcheck/config - validate.ts
 *
 * Single-call startup validation for all known TiltCheck environment variables.
 * Exports:
 *   - EnvSchema       : Zod schema covering every known env var
 *   - ValidatedEnv    : TypeScript type inferred from EnvSchema
 *   - validateEnv()   : parse process.env (or a supplied env map) and throw a
 *                       human-readable error listing every missing / invalid var
 */

import { z } from 'zod';

// ============================================================================
// EnvSchema — all known environment variables in one flat object
// ============================================================================

/**
 * Comprehensive Zod schema for TiltCheck environment variables.
 *
 * Convention:
 *  - Required fields have no `.optional()` and no `.default()`.
 *  - Optional fields are marked `.optional()`.
 *  - Fields with safe fallbacks use `.default(...)`.
 *  - Boolean / numeric strings are transformed to their native types.
 */
export const EnvSchema = z.object({
  // --------------------------------------------------------------------------
  // Runtime / server
  // --------------------------------------------------------------------------
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .default('3000')
    .transform((v) => parseInt(v, 10) || 3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // --------------------------------------------------------------------------
  // Authentication — JWT
  // --------------------------------------------------------------------------
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ISSUER: z.string().default('tiltcheck.me'),
  JWT_AUDIENCE: z.string().default('tiltcheck.me'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // --------------------------------------------------------------------------
  // Authentication — Service-to-service JWT
  // --------------------------------------------------------------------------
  SERVICE_JWT_SECRET: z
    .string()
    .min(32, 'SERVICE_JWT_SECRET must be at least 32 characters')
    .optional(),
  SERVICE_ID: z.string().optional(),
  ALLOWED_SERVICES: z
    .string()
    .transform((v) => v.split(',').filter(Boolean))
    .default([]),

  // --------------------------------------------------------------------------
  // Discord
  // --------------------------------------------------------------------------
  /** Primary bot token (preferred name used by discord-bot runtime) */
  DISCORD_TOKEN: z.string().optional(),
  /** Alternate bot token name accepted by some deployment environments */
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_REDIRECT_URI: z
    .string()
    .url('DISCORD_REDIRECT_URI must be a valid URL')
    .optional(),

  // --------------------------------------------------------------------------
  // Database — Neon / PostgreSQL
  // --------------------------------------------------------------------------
  DATABASE_URL: z.string().optional(),
  NEON_DATABASE_URL: z.string().optional(),
  DATABASE_SSL: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  DATABASE_POOL_SIZE: z
    .string()
    .default('10')
    .transform((v) => parseInt(v, 10) || 10),

  // --------------------------------------------------------------------------
  // Supabase (storage / realtime)
  // --------------------------------------------------------------------------
  SUPABASE_URL: z
    .string()
    .url('SUPABASE_URL must be a valid URL')
    .optional(),
  SUPABASE_ANON_KEY: z.string().optional(),

  // --------------------------------------------------------------------------
  // Backend service URL
  // --------------------------------------------------------------------------
  BACKEND_URL: z
    .string()
    .url('BACKEND_URL must be a valid URL')
    .optional(),

  // --------------------------------------------------------------------------
  // Blockchain / Solana
  // --------------------------------------------------------------------------
  SOLANA_RPC_URL: z
    .string()
    .url('SOLANA_RPC_URL must be a valid URL')
    .optional(),

  // --------------------------------------------------------------------------
  // Session cookies
  // --------------------------------------------------------------------------
  SESSION_COOKIE_NAME: z.string().default('tiltcheck_session'),
  COOKIE_DOMAIN: z.string().default('.tiltcheck.me'),
  COOKIE_SECURE: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  COOKIE_MAX_AGE: z
    .string()
    .default('604800')
    .transform((v) => parseInt(v, 10) || 604800),
});

// ============================================================================
// ValidatedEnv — inferred TypeScript type
// ============================================================================

/** Fully typed, post-transform representation of the environment. */
export type ValidatedEnv = z.infer<typeof EnvSchema>;

// ============================================================================
// validateEnv — parse and throw on failure
// ============================================================================

/**
 * Validate environment variables using `EnvSchema`.
 *
 * @param env - Environment map to validate. Defaults to `process.env`.
 * @returns The parsed, fully-typed `ValidatedEnv` object.
 * @throws {Error} A human-readable error message listing every missing or
 *   invalid variable when validation fails.
 *
 * @example
 * // At service startup (throws and terminates on bad config):
 * import { validateEnv } from '@tiltcheck/config';
 * const config = validateEnv();
 *
 * @example
 * // In tests with a custom env map:
 * const config = validateEnv({ JWT_SECRET: 'x'.repeat(32), NODE_ENV: 'test' });
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): ValidatedEnv {
  const result = EnvSchema.safeParse(env);

  if (result.success) {
    return result.data;
  }

  // Build a human-readable error that lists every failing field.
  const lines = result.error.issues.map((issue) => {
    const field = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `  - ${field}: ${issue.message}`;
  });

  throw new Error(
    `Environment validation failed — ${result.error.issues.length} problem(s) found:\n${lines.join('\n')}\n` +
      `\nCheck your .env file or deployment configuration and ensure all required variables are set.`
  );
}
