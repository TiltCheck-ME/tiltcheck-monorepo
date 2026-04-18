// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const cliArgs = process.argv.slice(2);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getArgValue(flag) {
  const index = cliArgs.indexOf(flag);
  if (index === -1) return '';
  return cliArgs[index + 1] || '';
}

const targetUserId = getArgValue('--user-id') || process.env.RESET_USER_ID || '';
const confirmationUserId = getArgValue('--confirm-user-id') || process.env.RESET_USER_CONFIRM || '';
const allowExecution = cliArgs.includes('--execute') || process.env.ALLOW_RESET_USER === 'true';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

if (!targetUserId) {
  console.error('[Reset] Refusing to run without --user-id <discord-id> or RESET_USER_ID.');
  process.exit(1);
}

if (!allowExecution) {
  console.error('[Reset] Refusing destructive delete without --execute or ALLOW_RESET_USER=true.');
  process.exit(1);
}

if (confirmationUserId !== targetUserId) {
  console.error('[Reset] Confirmation mismatch. Pass --confirm-user-id with the exact same Discord ID.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetUser() {
  console.log(`[Reset] Targeted User: ${targetUserId}`);
  
  const { error } = await supabase
    .from('user_onboarding')
    .delete()
    .eq('discord_id', targetUserId);

  if (error) {
    console.error("[Reset] Error deleting user:", error);
  } else {
    console.log("[Reset] Successfully purged user from Supabase.");
  }
}

resetUser();
