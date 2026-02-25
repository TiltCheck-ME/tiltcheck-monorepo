/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: Request) {
  const session = await getServerSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('credit_balances')
    .select('balance_lamports, payout_wallet, lifetime_sent, lifetime_received, updated_at')
    .eq('discord_id', session.discordId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const balance = data || {
    balance_lamports: 0,
    payout_wallet: null,
    lifetime_sent: 0,
    lifetime_received: 0,
    updated_at: null,
  };

  return NextResponse.json({
    discord_id: session.discordId,
    balance_lamports: balance.balance_lamports,
    balance_sol: balance.balance_lamports / 1e9,
    payout_wallet: balance.payout_wallet,
    lifetime_sent_sol: balance.lifetime_sent / 1e9,
    lifetime_received_sol: balance.lifetime_received / 1e9,
    updated_at: balance.updated_at,
  });
}
