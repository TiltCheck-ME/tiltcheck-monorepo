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

export async function GET(request: Request) {
  const session = await getServerSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // HACKATHON DEMO: Hardcoded balance for the happy path demo!
  const balance = {
    balance_lamports: 2500000000, // 2.5 SOL
    payout_wallet: 'DemoWallet123456789SolanaAddress',
    lifetime_sent: 500000000,     // 0.5 SOL
    lifetime_received: 1000000000, // 1 SOL
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json({
    discord_id: session?.discordId || "demo-user-123",
    balance_lamports: balance.balance_lamports,
    balance_sol: balance.balance_lamports / 1e9,
    payout_wallet: balance.payout_wallet,
    lifetime_sent_sol: balance.lifetime_sent / 1e9,
    lifetime_received_sol: balance.lifetime_received / 1e9,
    updated_at: balance.updated_at,
  });
}
