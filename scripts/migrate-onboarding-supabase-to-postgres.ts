/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { findOnboardingByDiscordId, findUserByDiscordId, createUser, upsertOnboarding } from '@tiltcheck/db';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface SupabaseOnboardingRow {
  discord_id: string;
  is_onboarded?: boolean | null;
  has_accepted_terms?: boolean | null;
  risk_level?: 'conservative' | 'moderate' | 'degen' | null;
  cooldown_enabled?: boolean | null;
  voice_intervention_enabled?: boolean | null;
  share_message_contents?: boolean | null;
  share_financial_data?: boolean | null;
  share_session_telemetry?: boolean | null;
  notify_nft_identity_ready?: boolean | null;
  daily_limit?: number | null;
  redeem_threshold?: number | null;
  quiz_scores?: string | null;
  tutorial_completed?: boolean | null;
  notifications_tips?: boolean | null;
  notifications_trivia?: boolean | null;
  notifications_promos?: boolean | null;
  compliance_bypass?: boolean | null;
  joined_at?: string | null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const hasFlag = (flag: string) => args.includes(flag);
  const getValue = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] ?? '' : '';
  };

  return {
    dryRun: hasFlag('--dry-run'),
    limit: Number.parseInt(getValue('--limit') || '', 10),
  };
}

function parseJoinedAt(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function ensureUserRecord(discordId: string): Promise<void> {
  const existingUser = await findUserByDiscordId(discordId);
  if (existingUser) {
    return;
  }

  await createUser({
    discord_id: discordId,
    discord_username: `discord-${discordId}`,
    roles: ['user'],
  });
}

async function main(): Promise<void> {
  const { dryRun, limit } = parseArgs();
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to migrate onboarding rows.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let query = supabase
    .from('user_onboarding')
    .select('*')
    .order('joined_at', { ascending: true, nullsFirst: false });

  if (Number.isFinite(limit) && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to read Supabase onboarding rows: ${error.message}`);
  }

  const rows = (data ?? []) as SupabaseOnboardingRow[];
  let migrated = 0;
  let unchanged = 0;

  for (const row of rows) {
    if (!row.discord_id?.trim()) {
      continue;
    }

    const discordId = row.discord_id.trim();
    const existing = await findOnboardingByDiscordId(discordId);

    const nextPayload = {
      discord_id: discordId,
      is_onboarded: row.is_onboarded ?? undefined,
      has_accepted_terms: row.has_accepted_terms ?? undefined,
      risk_level: row.risk_level ?? undefined,
      cooldown_enabled: row.cooldown_enabled ?? undefined,
      voice_intervention_enabled: row.voice_intervention_enabled ?? undefined,
      share_message_contents: row.share_message_contents ?? undefined,
      share_financial_data: row.share_financial_data ?? undefined,
      share_session_telemetry: row.share_session_telemetry ?? undefined,
      notify_nft_identity_ready: row.notify_nft_identity_ready ?? undefined,
      daily_limit: row.daily_limit ?? undefined,
      redeem_threshold: row.redeem_threshold ?? undefined,
      quiz_scores: row.quiz_scores ?? undefined,
      tutorial_completed: row.tutorial_completed ?? undefined,
      notifications_tips: row.notifications_tips ?? undefined,
      notifications_trivia: row.notifications_trivia ?? undefined,
      notifications_promos: row.notifications_promos ?? undefined,
      compliance_bypass: row.compliance_bypass ?? undefined,
      joined_at: existing?.joined_at ?? parseJoinedAt(row.joined_at),
    };

    if (dryRun) {
      console.log(`[Dry Run] Would upsert onboarding row for ${discordId}`);
      migrated += 1;
      continue;
    }

    await ensureUserRecord(discordId);
    const updated = await upsertOnboarding(nextPayload);

    if (!updated) {
      throw new Error(`Failed to upsert onboarding row for ${discordId}`);
    }

    const alreadyMatched = existing
      && existing.is_onboarded === updated.is_onboarded
      && existing.has_accepted_terms === updated.has_accepted_terms
      && existing.risk_level === updated.risk_level
      && existing.cooldown_enabled === updated.cooldown_enabled
      && existing.voice_intervention_enabled === updated.voice_intervention_enabled
      && existing.share_message_contents === updated.share_message_contents
      && existing.share_financial_data === updated.share_financial_data
      && existing.share_session_telemetry === updated.share_session_telemetry
      && existing.notify_nft_identity_ready === updated.notify_nft_identity_ready
      && existing.daily_limit === updated.daily_limit
      && existing.redeem_threshold === updated.redeem_threshold
      && existing.quiz_scores === updated.quiz_scores
      && existing.tutorial_completed === updated.tutorial_completed
      && existing.notifications_tips === updated.notifications_tips
      && existing.notifications_trivia === updated.notifications_trivia
      && existing.notifications_promos === updated.notifications_promos
      && existing.compliance_bypass === updated.compliance_bypass;

    if (alreadyMatched) {
      unchanged += 1;
    } else {
      migrated += 1;
    }
  }

  console.log(
    dryRun
      ? `[Dry Run] Reviewed ${rows.length} Supabase onboarding rows.`
      : `Migrated ${migrated} onboarding rows (${unchanged} already matched canonical Postgres state).`,
  );
}

main().catch((error) => {
  console.error('[Onboarding Migration] Failed:', error);
  process.exit(1);
});
