/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import 'dotenv/config';

const REQUIRED_VARS = [
  // Core
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  
  // Services
  'SOLANA_RPC_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  
  // Channels (JustTheTip)
  'TIP_DISCORD_WELCOME_CHANNEL_ID',
  'TIP_DISCORD_ANNOUNCEMENT_CHANNEL_ID',
  'TIP_DISCORD_RULES_CHANNEL_ID',
  'TIP_DISCORD_HOW_TO_USE_BOT_CHANNEL_ID',
  'SUPPORT_CHANNEL_ID',
  
  // Roles & Users
  'MOD_ROLE_ID',
  'DISCORD_OWNER_ID'
];

console.log('🔍 Verifying environment variables...');

const missing = REQUIRED_VARS.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`   - ${key}`));
  console.error('\nPlease add these to your .env file.');
  process.exit(1);
}

console.log('✅ All required environment variables are present.');