/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @tiltcheck/config - Environment Variable Validation
 * Zod-based configuration validation for all TiltCheck services
 */

import { z } from 'zod';

// ============================================================================
// Environment Schemas
// ============================================================================

/**
 * JWT Configuration Schema
 */
export const jwtConfigSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ISSUER: z.string().default('tiltcheck.me'),
  JWT_AUDIENCE: z.string().default('tiltcheck.me'),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

/**
 * Service JWT Configuration Schema (for service-to-service auth)
 */
export const serviceJwtConfigSchema = z.object({
  SERVICE_JWT_SECRET: z.string().min(32, 'SERVICE_JWT_SECRET must be at least 32 characters'),
  SERVICE_ID: z.string().min(1, 'SERVICE_ID is required'),
  ALLOWED_SERVICES: z
    .string()
    .transform((val: string) => val.split(',').filter(Boolean))
    .default([]),
});

/**
 * Discord OAuth Configuration Schema
 */
export const discordConfigSchema = z.object({
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_REDIRECT_URI: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),
});

/**
 * Neon/PostgreSQL Database Configuration Schema
 */
export const databaseConfigSchema = z.object({
  DATABASE_URL: z.string().optional(),
  NEON_DATABASE_URL: z.string().optional(),
  DATABASE_SSL: z.string().default('true').transform((val: string) => val === 'true'),
  DATABASE_POOL_SIZE: z.string().default('10').transform((val: string) => parseInt(val, 10) || 10),
});

/**
 * Blockchain Configuration Schema
 */
export const blockchainConfigSchema = z.object({
  SOLANA_RPC_URL: z.string().url('SOLANA_RPC_URL must be a valid URL'),
});

/**
 * Supabase Configuration Schema (for storage only) - base shape
 */
export const supabaseConfigSchemaBase = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL').optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
});

/**
 * Supabase Configuration Schema (for storage only) with validation
 */
export const supabaseConfigSchema = supabaseConfigSchemaBase.refine(
  (data) => {
    // If one is provided, both must be provided
    if (data.SUPABASE_URL || data.SUPABASE_ANON_KEY) {
      return !!data.SUPABASE_URL && !!data.SUPABASE_ANON_KEY;
    }
    return true;
  },
  'Both SUPABASE_URL and SUPABASE_ANON_KEY must be provided together'
);

/**
 * Server Configuration Schema
 */
export const serverConfigSchema = z.object({
  PORT: z.string().default('3000').transform((val: string) => parseInt(val, 10) || 3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

/**
 * Cookie Configuration Schema
 */
export const cookieConfigSchema = z.object({
  SESSION_COOKIE_NAME: z.string().default('tiltcheck_session'),
  COOKIE_DOMAIN: z.string().default('.tiltcheck.me'),
  COOKIE_SECURE: z.string().default('true').transform((val: string) => val === 'true'),
  COOKIE_MAX_AGE: z.string().default('604800').transform((val: string) => parseInt(val, 10) || 604800), // 7 days
});

/**
 * Combined Full Configuration Schema
 */
export const fullConfigSchema = z.object({
  ...jwtConfigSchema.shape,
  ...discordConfigSchema.shape,
  ...databaseConfigSchema.shape,
  ...serverConfigSchema.shape,
  ...cookieConfigSchema.shape,
  ...supabaseConfigSchemaBase.shape,
  ...serviceJwtConfigSchema.shape,
  ...blockchainConfigSchema.shape,
}).refine(data => data.DATABASE_URL || data.NEON_DATABASE_URL, {
  message: "Either DATABASE_URL or NEON_DATABASE_URL must be provided",
  path: ["DATABASE_URL"]
});

// ============================================================================
// Type Exports
// ============================================================================

export type JWTEnvConfig = z.infer<typeof jwtConfigSchema>;
export type ServiceJWTEnvConfig = z.infer<typeof serviceJwtConfigSchema>;
export type DiscordEnvConfig = z.infer<typeof discordConfigSchema>;
export type DatabaseEnvConfig = z.infer<typeof databaseConfigSchema>;
export type SupabaseEnvConfig = z.infer<typeof supabaseConfigSchema>;
export type ServerEnvConfig = z.infer<typeof serverConfigSchema>;
export type CookieEnvConfig = z.infer<typeof cookieConfigSchema>;
export type FullEnvConfig = z.infer<typeof fullConfigSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validate environment variables against a schema
 */
export function validateEnv<T extends z.ZodSchema>(
  schema: T,
  env: Record<string, string | undefined> = process.env
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(env);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  });

  return { success: false, errors };
}

/**
 * Validate and get JWT config from environment
 */
export function getJWTConfig(env: Record<string, string | undefined> = process.env): JWTEnvConfig {
  const result = validateEnv(jwtConfigSchema, env);
  if (!result.success) {
    throw new Error(`JWT config validation failed:\n${result.errors?.join('\n')}`);
  }
  return result.data!;
}

/**
 * Validate and get Service JWT config from environment
 */
export function getServiceJWTConfig(env: Record<string, string | undefined> = process.env): ServiceJWTEnvConfig {
  const result = validateEnv(serviceJwtConfigSchema, env);
  if (!result.success) {
    throw new Error(`Service JWT config validation failed:\n${result.errors?.join('\n')}`);
  }
  return result.data!;
}

/**
 * Validate and get Discord config from environment
 */
export function getDiscordConfig(env: Record<string, string | undefined> = process.env): DiscordEnvConfig {
  const result = validateEnv(discordConfigSchema, env);
  if (!result.success) {
    throw new Error(`Discord config validation failed:\n${result.errors?.join('\n')}`);
  }
  return result.data!;
}

/**
 * Validate and get Database config from environment
 */
export function getDatabaseConfig(env: Record<string, string | undefined> = process.env): DatabaseEnvConfig {
  const result = validateEnv(databaseConfigSchema, env);
  if (!result.success) {
    throw new Error(`Database config validation failed:\n${result.errors?.join('\n')}`);
  }
  return result.data!;
}

/**
 * Validate and get Supabase config from environment
 */
export function getSupabaseConfig(env: Record<string, string | undefined> = process.env): SupabaseEnvConfig {
  const result = validateEnv(supabaseConfigSchema, env);
  if (!result.success) {
    throw new Error(`Supabase config validation failed:\n${result.errors?.join('\n')}`);
  }
  return result.data!;
}

/**
 * Validate and get Server config from environment
 */
export function getServerConfig(env: Record<string, string | undefined> = process.env): ServerEnvConfig {
  const result = validateEnv(serverConfigSchema, env);
  if (!result.success) {
    throw new Error(`Server config validation failed:\n${result.errors?.join('\n')}`);
  }
  return result.data!;
}

/**
 * Validate and get Cookie config from environment
 */
export function getCookieConfig(env: Record<string, string | undefined> = process.env): CookieEnvConfig {
  const result = validateEnv(cookieConfigSchema, env);
  if (!result.success) {
    throw new Error(`Cookie config validation failed:\n${result.errors?.join('\n')}`);
  }
  return result.data!;
}

/**
 * Validate all required environment variables for a service
 */
export function validateAllConfig(env: Record<string, string | undefined> = process.env): ValidationResult<FullEnvConfig> {
  return validateEnv(fullConfigSchema, env);
}

/**
 * Create a partial config validator for specific keys
 */
export function createPartialValidator<K extends keyof FullEnvConfig>(
  keys: K[]
): (env?: Record<string, string | undefined>) => Pick<FullEnvConfig, K> {
  type ShapeType = (typeof fullConfigSchema)['shape'];
  const configShape = fullConfigSchema.shape as ShapeType;
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const key of keys) {
    if (key in configShape) {
      shape[key] = configShape[key as keyof ShapeType] as z.ZodTypeAny;
    }
  }

  const schema = z.object(shape);

  return (env = process.env) => {
    const result = schema.safeParse(env);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
      throw new Error(`Config validation failed:\n${errors.join('\n')}`);
    }
    return result.data as Pick<FullEnvConfig, K>;
  };
}

// ============================================================================
// Convenience Exports for Common Service Configs
// ============================================================================

/**
 * Get config for API Gateway service
 */
export function getAPIConfig(env: Record<string, string | undefined> = process.env) {
  return {
    jwt: getJWTConfig(env),
    serviceJwt: getServiceJWTConfig(env),
    discord: getDiscordConfig(env),
    database: getDatabaseConfig(env),
    server: getServerConfig(env),
    cookie: getCookieConfig(env),
  };
}

/**
 * Get config for Dashboard service
 */
export function getDashboardConfig(env: Record<string, string | undefined> = process.env) {
  return {
    jwt: getJWTConfig(env),
    database: getDatabaseConfig(env),
    server: getServerConfig(env),
    cookie: getCookieConfig(env),
  };
}

/**
 * Get config for JustTheTip service
 */
export function getJustTheTipConfig(env: Record<string, string | undefined> = process.env) {
  return {
    jwt: getJWTConfig(env),
    discord: getDiscordConfig(env),
    database: getDatabaseConfig(env),
    server: getServerConfig(env),
    cookie: getCookieConfig(env),
  };
}

/**
 * Get config for Bot service
 */
export function getBotConfig(env: Record<string, string | undefined> = process.env) {
  return {
    serviceJwt: getServiceJWTConfig(env),
    discord: getDiscordConfig(env),
    server: getServerConfig(env),
  };
}

/**
 * Master Environment Object
 * Strictly validated against the full schema. 
 * This will cause the process to exit early with a clear error if critical config is missing.
 */
let validatedEnv: FullEnvConfig;

try {
  // Use safeParse to provide better error messages if validation fails
  const result = fullConfigSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.') || 'root'}: ${issue.message}`
    ).join('\n');

    console.error(`\n❌ [Config] Environment Variable Validation Failed:\n${issues}\n`);

    // In production or development, we should fail fast for missing critical config
    if (process.env.NODE_ENV !== 'test' && process.env.SKIP_ENV_VALIDATION !== '1' && process.env.SKIP_ENV_VALIDATION !== 'true') {
      console.error('Core service cannot start without valid configuration. Exiting...\\n');
      // We don't call process.exit(1) here directly to allow the importing module
      // to handle it if they want, but typically this will lead to a crash anyway.
      throw new Error('Environment validation failed');
    }

    // In tests, we might want to continue even with missing envs (use defaults)
    validatedEnv = result.data as any; // Cast as any because it might be partial
  } else {
    validatedEnv = result.data;
  }
} catch (error) {
  if (process.env.NODE_ENV !== 'test') {
    throw error;
  }
  // Fallback for tests if needed
  validatedEnv = {} as FullEnvConfig;
}

export const env = validatedEnv;


