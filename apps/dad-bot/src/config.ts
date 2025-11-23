/**
 * Configuration Manager
 * 
 * Loads and validates environment configuration.
 */

import dotenv from 'dotenv';
import path from 'path';
import { dirname } from '@tiltcheck/esm-utils';

// Emulate __dirname in ESM via shared utility
const __dirname = dirname(import.meta.url);

// Load .env file relative to project root (one level up)
dotenv.config({ path: path.join(__dirname, '../.env') });

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
}

function getEnvVar(key: string, required = true): string {
  const value = process.env[key];

  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value || '';
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

export const config: BotConfig = {
  // Discord
  discordToken: getEnvVar('DISCORD_TOKEN'),
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
};

// Validate config
export function validateConfig(): void {
  if (!config.discordToken) {
    throw new Error(
      'DISCORD_TOKEN is required. Please check your .env file.'
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
}
