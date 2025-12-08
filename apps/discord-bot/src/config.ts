/**
 * Configuration Manager
 * 
 * Loads and validates environment configuration.
 */

import dotenv from 'dotenv';
import path from 'path';
import { dirname } from '@tiltcheck/esm-utils';
import { 
  getEnvVar, 
  getDiscordToken, 
  getBoolEnv, 
  getNumberEnv,
  DISCORD_TOKEN_ENV_VARS 
} from '@tiltcheck/config';

// Emulate __dirname in ESM via shared utility
const __dirname = dirname(import.meta.url);

// Load .env files - try .env.local first (root), then .env (root), then .env in app dir
// __dirname is apps/discord-bot/src, so we need to go up 3 levels to reach monorepo root
const rootEnvLocal = path.resolve(__dirname, '../../../.env.local');
const rootEnv = path.resolve(__dirname, '../../../.env');
const appEnvLocal = path.resolve(__dirname, '../.env.local');
const appEnv = path.resolve(__dirname, '../.env');

// Debug: Log the paths we're trying to load
if (process.env.DEBUG_ENV_LOADING) {
  console.log('[Config] Attempting to load .env files from:');
  console.log('  __dirname:', __dirname);
  console.log('  rootEnvLocal:', rootEnvLocal);
  console.log('  rootEnv:', rootEnv);
  console.log('  appEnvLocal:', appEnvLocal);
  console.log('  appEnv:', appEnv);
}

// Try loading from root .env.local first (preferred for local dev)
dotenv.config({ path: rootEnvLocal });
// Fall back to root .env
dotenv.config({ path: rootEnv });
// Fall back to app-level .env files
dotenv.config({ path: appEnvLocal });
dotenv.config({ path: appEnv });

export interface AlertChannelsConfig {
  /** Channel ID for trust/security alerts */
  trustAlertsChannelId?: string;
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
}

export const config: BotConfig = {
  // Discord (supports both DISCORD_TOKEN and DISCORD_BOT_TOKEN)
  discordToken: getDiscordToken(),
  clientId: getEnvVar('DISCORD_CLIENT_ID'),
  guildId: getEnvVar('DISCORD_GUILD_ID', false),

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
    supportChannelId: getEnvVar('SUPPORT_CHANNEL_ID', false),
  },

  // Mod notifications
  modNotifications: {
    modChannelId: getEnvVar('MOD_CHANNEL_ID', false),
    modRoleId: getEnvVar('MOD_ROLE_ID', false),
    enabled: getBoolEnv('MOD_NOTIFICATIONS_ENABLED', true),
    rateLimitWindowMs: getNumberEnv('MOD_RATE_LIMIT_WINDOW_MS', 60000),
    maxNotificationsPerWindow: getNumberEnv('MOD_MAX_NOTIFICATIONS_PER_WINDOW', 10),
    dedupeWindowMs: getNumberEnv('MOD_DEDUPE_WINDOW_MS', 300000),
  },
};

// Validate config
export function validateConfig(): void {
  if (!config.discordToken) {
    throw new Error(
      `${DISCORD_TOKEN_ENV_VARS.join(' or ')} is required. Please check your .env file.`
    );
  }

  if (!config.clientId) {
    throw new Error(
      'DISCORD_CLIENT_ID is required. Please check your .env file.'
    );
  }

  console.log('[Config] Configuration loaded successfully');
  console.log(`[Config] Environment: ${config.nodeEnv}`);
  console.log(`[Config] Auto-scan links: ${config.suslinkAutoScan}`);
  
  // Log alert channels
  if (config.alertChannels.trustAlertsChannelId) {
    console.log(`[Config] Trust alerts channel: ${config.alertChannels.trustAlertsChannelId}`);
  }
  if (config.alertChannels.supportChannelId) {
    console.log(`[Config] Support tickets channel: ${config.alertChannels.supportChannelId}`);
  }
  
  // Log mod notifications
  console.log(`[Config] Mod notifications: ${config.modNotifications.enabled ? 'enabled' : 'disabled'}`);
  if (config.modNotifications.enabled && config.modNotifications.modChannelId) {
    console.log(`[Config] Mod channel: ${config.modNotifications.modChannelId}`);
  }
}
