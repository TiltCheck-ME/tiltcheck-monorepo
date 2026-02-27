/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Configuration Manager
 *
 * Loads and validates environment configuration for JustTheTip bot.
 */

import dotenv from 'dotenv';
import path from 'path';
import {
  getEnvVar,
  getDiscordToken,
  getNumberEnv,
  DISCORD_TOKEN_ENV_VARS
} from '@tiltcheck/config';

// Use process.cwd() for .env resolution (works in both monorepo and bundled deploys)
const rootDir = process.env.TILTCHECK_ROOT || process.cwd();

// Load .env.local first (preferred for local dev), then .env as fallback
dotenv.config({ path: path.resolve(rootDir, 'apps/justthetip-bot/.env.local') });
dotenv.config({ path: path.resolve(rootDir, 'apps/justthetip-bot/.env') });
dotenv.config({ path: path.resolve(rootDir, '.env.local') });
dotenv.config({ path: path.resolve(rootDir, '.env') });

export interface BotConfig {
  // Discord
  discordToken: string;
  clientId: string;
  guildId?: string;

  // Environment
  nodeEnv: 'development' | 'production' | 'test';

  // Solana
  solanaRpcUrl: string;

  // JTT-specific
  feeWallet?: string;
  botWalletPrivateKey: string;

  // Backend
  backendUrl?: string;

  // Supabase (optional)
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;

  // Health check
  healthPort: number;
}

export const config: BotConfig = {
  // Discord (supports both DISCORD_TOKEN and DISCORD_BOT_TOKEN)
  discordToken: process.env.TIP_DISCORD_BOT_TOKEN || getDiscordToken(),
  clientId: process.env.TIP_DISCORD_CLIENT_ID || getEnvVar('DISCORD_CLIENT_ID', false),
  guildId: getEnvVar('DISCORD_GUILD_ID', false),

  // Environment
  nodeEnv: (process.env.NODE_ENV || 'development') as BotConfig['nodeEnv'],

  // Solana
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',

  // JTT-specific
  feeWallet: getEnvVar('JUSTTHETIP_FEE_WALLET', false),
  botWalletPrivateKey: getEnvVar('JUSTTHETIP_BOT_WALLET_PRIVATE_KEY', false) || '',

  // Backend
  backendUrl: getEnvVar('BACKEND_URL', false),

  // Supabase
  supabaseUrl: getEnvVar('SUPABASE_URL', false),
  supabaseServiceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', false),

  // Health check
  healthPort: getNumberEnv('JTT_BOT_HEALTH_PORT', 8083),
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

  if (!config.botWalletPrivateKey) {
    throw new Error(
      'JUSTTHETIP_BOT_WALLET_PRIVATE_KEY is required for the custodial credit system. Please check your .env file.'
    );
  }

  console.log('[Config] Configuration loaded successfully');
  console.log(`[Config] Environment: ${config.nodeEnv}`);
  console.log(`[Config] Solana RPC: ${config.solanaRpcUrl}`);
  console.log(`[Config] Fee wallet: ${config.feeWallet ? 'configured' : 'not set'}`);
  console.log(`[Config] Bot wallet: configured`);
}
