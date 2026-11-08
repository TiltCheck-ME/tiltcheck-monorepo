// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
// JustTheTip Bot — Configuration

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const JTT_TOKEN_ENV_VARS = ['JTT_DISCORD_BOT_TOKEN', 'DISCORD_TOKEN', 'DISCORD_BOT_TOKEN'] as const;

function getEnvVar(key: string, required = true): string {
  const value = process.env[key];
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

function getDiscordToken(): string {
  for (const envVar of JTT_TOKEN_ENV_VARS) {
    const value = process.env[envVar];
    if (value) {
      console.log(`[Config] Found token in ${envVar} (Length: ${value.trim().length}, Prefix: ${value.trim().substring(0, 5)}...)`);
      return value.trim();
    }
  }
  return '';
}

function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getFirstNumberEnv(keys: string[], defaultValue: number): number {
  for (const key of keys) {
    const value = process.env[key];
    if (!value) continue;
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
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
  solanaRpcUrl: string;
  botWalletPrivateKey: string;
  feeWallet?: string;
  jttHealthPort: number;
}

export const config: BotConfig = {
  discordToken: process.env.JTT_DISCORD_BOT_TOKEN || getDiscordToken(),
  clientId: process.env.JTT_DISCORD_CLIENT_ID || getEnvVar('DISCORD_CLIENT_ID', false),
  guildId: process.env.JTT_DISCORD_GUILD_ID || getEnvVar('DISCORD_GUILD_ID', false),
  nodeEnv: (process.env.NODE_ENV || 'development') as BotConfig['nodeEnv'],
  commandPrefix: getEnvVar('COMMAND_PREFIX', false) || '!',
  ownerId: getEnvVar('OWNER_ID', false),
  backendUrl: process.env.BACKEND_URL || 'https://api.tiltcheck.me',
  supabaseUrl: getEnvVar('SUPABASE_URL', false),
  supabaseServiceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', false),
  internalApiSecret: process.env.INTERNAL_API_SECRET || '',
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  botWalletPrivateKey: getEnvVar('JUSTTHETIP_BOT_WALLET_PRIVATE_KEY', false),
  feeWallet: getEnvVar('JUSTTHETIP_FEE_WALLET', false),
  jttHealthPort: getFirstNumberEnv(['PORT', 'JTT_BOT_HEALTH_PORT', 'DISCORD_BOT_HEALTH_PORT'], 8082),
};

export function validateConfig(): void {
  if (!config.discordToken) {
    console.error('[Config] No JustTheTip Discord token found.');
    console.error('[Config] Checked: JTT_DISCORD_BOT_TOKEN, DISCORD_TOKEN, DISCORD_BOT_TOKEN');
    throw new Error(`${JTT_TOKEN_ENV_VARS.join(' or ')} is required.`);
  }

  if (!config.clientId) {
    throw new Error('DISCORD_CLIENT_ID is required.');
  }

  const isProd = config.nodeEnv === 'production';
  if (isProd) {
    if (!config.botWalletPrivateKey) {
      console.warn('[Config] JUSTTHETIP_BOT_WALLET_PRIVATE_KEY not set - tipping will be disabled');
    }
    if (!config.supabaseServiceRoleKey) {
      console.warn('[Config] SUPABASE_SERVICE_ROLE_KEY not set - database operations may fail');
    }
  }

  console.log('[Config] JustTheTip configuration loaded successfully');
  console.log(`[Config] Environment: ${config.nodeEnv}`);
}
