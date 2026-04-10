// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
// DAD Bot — Configuration

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const DAD_TOKEN_ENV_VARS = ['DAD_DISCORD_BOT_TOKEN', 'DISCORD_TOKEN', 'DISCORD_BOT_TOKEN'] as const;

function getEnvVar(key: string, required = true): string {
  const value = process.env[key];
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

function getDiscordToken(): string {
  for (const envVar of DAD_TOKEN_ENV_VARS) {
    const value = process.env[envVar];
    if (value) {
      console.log(`[Config] Found token in ${envVar} (Length: ${value.trim().length}, Prefix: ${value.trim().substring(0, 5)}...)`);
      return value.trim();
    }
  }
  return '';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '../../../');
const rootEnvLocal = path.resolve(rootDir, '.env.local');
const rootEnv = path.resolve(rootDir, '.env');

dotenv.config({ path: rootEnvLocal });
dotenv.config({ path: rootEnv });

export interface BotConfig {
  discordToken: string;
  clientId: string;
  guildId?: string;
  nodeEnv: 'development' | 'production' | 'test';
  commandPrefix: string;
  ownerId?: string;
  backendUrl: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  internalApiSecret: string;
}

export const config: BotConfig = {
  discordToken: process.env.DAD_DISCORD_BOT_TOKEN || getDiscordToken(),
  clientId: process.env.DAD_DISCORD_CLIENT_ID || getEnvVar('DISCORD_CLIENT_ID', false),
  guildId: process.env.DAD_DISCORD_GUILD_ID || getEnvVar('DISCORD_GUILD_ID', false),
  nodeEnv: (process.env.NODE_ENV || 'development') as BotConfig['nodeEnv'],
  commandPrefix: getEnvVar('COMMAND_PREFIX', false) || '!',
  ownerId: getEnvVar('OWNER_ID', false),
  backendUrl: process.env.BACKEND_URL || 'https://api.tiltcheck.me',
  supabaseUrl: getEnvVar('SUPABASE_URL', false),
  supabaseServiceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', false),
  internalApiSecret: process.env.INTERNAL_API_SECRET || '',
};

export function validateConfig(): void {
  if (!config.discordToken) {
    console.error('[Config] No DAD Discord token found.');
    console.error('[Config] Checked: DAD_DISCORD_BOT_TOKEN, DISCORD_TOKEN, DISCORD_BOT_TOKEN');
    throw new Error(`${DAD_TOKEN_ENV_VARS.join(' or ')} is required.`);
  }

  if (!config.clientId) {
    throw new Error('DISCORD_CLIENT_ID is required.');
  }

  console.log('[Config] DAD Bot configuration loaded successfully');
  console.log(`[Config] Environment: ${config.nodeEnv}`);
}
