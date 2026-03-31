import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const targetUserId = process.env.DEMO_USER_ID || '1472601571496951932';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
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
