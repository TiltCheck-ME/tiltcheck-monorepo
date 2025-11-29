/**
 * Configuration Manager
 * 
 * Loads and validates environment configuration.
 * Supports Spaceship Hyperlift deployment with environment variable placeholders.
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

// Load .env file relative to project root (one level up)
dotenv.config({ path: path.join(__dirname, '../.env') });

export interface BotConfig {
  // Discord
  discordToken: string;
  clientId: string;
  guildId?: string;

  // Environment
  nodeEnv: 'development' | 'production' | 'test';

  // API and WebSocket URLs for backend communication
  apiUrl: string;
  wsUrl: string;

  // Database
  mongodbUri?: string;

  // Bot settings
  commandPrefix: string;
  ownerId?: string;

  // Module settings
  suslinkAutoScan: boolean;
  trustThreshold: number;
}

export const config: BotConfig = {
  // Discord (supports both DISCORD_TOKEN and DISCORD_BOT_TOKEN)
  discordToken: getDiscordToken(),
  clientId: getEnvVar('DISCORD_CLIENT_ID'),
  guildId: getEnvVar('DISCORD_GUILD_ID', false),

  // Environment
  nodeEnv: (process.env.NODE_ENV || 'development') as BotConfig['nodeEnv'],

  // API and WebSocket URLs (configurable for Spaceship deployment)
  apiUrl: process.env.API_URL || 'https://tiltcheck.me/api',
  wsUrl: process.env.WS_URL || 'wss://tiltcheck.me/ws',

  // Database
  mongodbUri: process.env.MONGODB_URI,

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
  console.log(`[Config] API URL: ${config.apiUrl}`);
  console.log(`[Config] WebSocket URL: ${config.wsUrl}`);
}
