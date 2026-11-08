/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * (c) 2024-2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Configuration Manager
 * 
 * Loads and validates environment configuration.
 */

import dotenv from 'dotenv';
import path from 'path';

const DISCORD_TOKEN_ENV_VARS = ['DISCORD_TOKEN', 'DISCORD_BOT_TOKEN'] as const;

function getEnvVar(key: string, required = true): string {
  const value = process.env[key];
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

function getDiscordToken(): string {
  for (const envVar of DISCORD_TOKEN_ENV_VARS) {
    const value = process.env[envVar];
    if (value) return value.trim();
  }
  return '';
}

function getBoolEnv(key: string, defaultValue = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Use import.meta.url to find the root reliably from this file's location
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The root is 3 levels up from apps/discord-bot/src/config.ts
const rootDir = path.resolve(__dirname, '../../../');
const rootEnvLocal = path.resolve(rootDir, '.env.local');
const rootEnv = path.resolve(rootDir, '.env');

// Debug: Log the paths we're trying to load
if (process.env.DEBUG_ENV_LOADING) {
  console.log('[Config] Attempting to load .env files from:');
  console.log('  rootDir:', rootDir);
  console.log('  rootEnvLocal:', rootEnvLocal);
  console.log('  rootEnv:', rootEnv);
}

// Try loading from root .env.local first (preferred for local dev)
dotenv.config({ path: rootEnvLocal });
// Fall back to root .env
dotenv.config({ path: rootEnv });


export interface AlertChannelsConfig {
  /** Channel ID for trust/security alerts */
  trustAlertsChannelId?: string;
  /** Channel ID for bonus alerts */
  bonusAlertsChannelId?: string;
  /** Channel ID for watcher and ops reports */
  reportsChannelId?: string;
  /** Channel ID for support tickets */
  supportChannelId?: string;
}

export interface ModNotificationConfig {
  /** Channel ID for mod notifications */
  modChannelId?: string;
  /** Role ID to mention in mod notifications */
  modRoleId?: string;
  /** Whether mod notifications are enabled */
  enabled: boolean;
  /** Rate limit window in milliseconds */
  rateLimitWindowMs: number;
  /** Maximum notifications per rate limit window */
  maxNotificationsPerWindow: number;
  /** Deduplication window in milliseconds */
  dedupeWindowMs: number;
}

export interface BotConfig {
  // Discord
  discordToken: string;
  clientId: string;
  guildId?: string;

  // Environment
  nodeEnv: 'development' | 'production' | 'test';

  // Bot settings
  commandPrefix: string;
  ownerId?: string;

  // Module settings
  suslinkAutoScan: boolean;
  trustThreshold: number;

  // Alert channels
  alertChannels: AlertChannelsConfig;

  // Mod notifications
  modNotifications: ModNotificationConfig;

  // Solana & Tipping (Migrated from JustTheTip)
  solanaRpcUrl: string;
  botWalletPrivateKey: string;
  feeWallet?: string;
  jttHealthPort: number;

  // Internal API (Service-to-Service)
  internalApiSecret: string;
  backendUrl: string;

  // Database / Supabase
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
}

export const config: BotConfig = {
  // Discord (supports both DISCORD_TOKEN and DISCORD_BOT_TOKEN)
  discordToken: process.env.TILT_DISCORD_BOT_TOKEN || getDiscordToken(),
  clientId: process.env.TILT_DISCORD_CLIENT_ID || getEnvVar('DISCORD_CLIENT_ID', false),
  guildId: process.env.TILT_DISCORD_GUILD_ID || getEnvVar('DISCORD_GUILD_ID', false),

  // Environment
  nodeEnv: (process.env.NODE_ENV || 'development') as BotConfig['nodeEnv'],

  // Bot settings
  commandPrefix: getEnvVar('COMMAND_PREFIX', false) || '!',
  ownerId: getEnvVar('OWNER_ID', false),

  // Module settings
  suslinkAutoScan: getBoolEnv('SUSLINK_AUTO_SCAN', true),
  trustThreshold: getNumberEnv('TRUST_THRESHOLD', 60),

  // Alert channels
  alertChannels: {
    trustAlertsChannelId: getEnvVar('TRUST_ALERTS_CHANNEL_ID', false),
    bonusAlertsChannelId:
      getEnvVar('BONUS_ALERTS_CHANNEL_ID', false) || getEnvVar('TRUST_ALERTS_CHANNEL_ID', false),
    reportsChannelId: getEnvVar('REPORTS_CHANNEL_ID', false),
    supportChannelId: getEnvVar('SUPPORT_CHANNEL_ID', false),
  },

  // Mod notifications
  modNotifications: {
    modChannelId: getEnvVar('MOD_CHANNEL_ID', false) || getEnvVar('MOD_LOG_CHANNEL_ID', false),
    modRoleId: getEnvVar('MOD_ROLE_ID', false),
    enabled: getBoolEnv('MOD_NOTIFICATIONS_ENABLED', true),
    rateLimitWindowMs: getNumberEnv('MOD_RATE_LIMIT_WINDOW_MS', 60000),
    maxNotificationsPerWindow: getNumberEnv('MOD_MAX_NOTIFICATIONS_PER_WINDOW', 10),
    dedupeWindowMs: getNumberEnv('MOD_DEDUPE_WINDOW_MS', 300000),
  },

  // Solana & Tipping
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  botWalletPrivateKey: getEnvVar('JUSTTHETIP_BOT_WALLET_PRIVATE_KEY', false),
  feeWallet: getEnvVar('JUSTTHETIP_FEE_WALLET', false),
  jttHealthPort: getNumberEnv('JTT_BOT_HEALTH_PORT', 8083),

  // Internal API
  internalApiSecret: process.env.INTERNAL_API_SECRET || '',
  backendUrl: process.env.BACKEND_URL || 'https://api.tiltcheck.me',

  // Database / Supabase
  supabaseUrl: getEnvVar('SUPABASE_URL', false),
  supabaseServiceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', false),
};

export function validateConfig(): void {
  if (!config.discordToken) {
    throw new Error(`${DISCORD_TOKEN_ENV_VARS.join(' or ')} is required.`);
  }
  if (!config.clientId) {
    throw new Error('DISCORD_CLIENT_ID is required.');
  }
}
