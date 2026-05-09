// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09
/**
 * Ledger-backed community pools (voluntary trivia jackpot, recovery microgrant fund).
 * LockVault early-unlock fees credit recovery microgrants only; trivia jackpots stay voluntary until contest rules are cleared.
 */

import { db } from '@tiltcheck/database';

interface TriviaJackpotPool {
  balance: number;
  contributions: number;
  lastWinner: string | null;
  lastPayout: number;
  updatedAt: number;
}

interface MicrograntPool {
  balance: number;
  contributions: number;
  updatedAt: number;
}

let triviaPool: TriviaJackpotPool = {
  balance: 0,
  contributions: 0,
  lastWinner: null,
  lastPayout: 0,
  updatedAt: Date.now(),
};

let micrograntPool: MicrograntPool = {
  balance: 0,
  contributions: 0,
  updatedAt: Date.now(),
};

const TRIVIA_TABLE = 'trivia_jackpot';
const MICROGRANT_TABLE = 'microgrant_pool';

async function loadTriviaPool(): Promise<void> {
  try {
    const client = db.getClient();
    if (!client) return;

    const { data } = await client.from(TRIVIA_TABLE).select('*').order('updated_at', { ascending: false }).limit(1).single();
    if (data) {
      triviaPool = {
        balance: data.balance ?? 0,
        contributions: data.contributions ?? 0,
        lastWinner: data.last_winner ?? null,
        lastPayout: data.last_payout ?? 0,
        updatedAt: new Date(data.updated_at).getTime(),
      };
    }
  } catch {
    // Table may not exist yet
  }
}

async function saveTriviaPool(): Promise<void> {
  try {
    const client = db.getClient();
    if (!client) return;

    await client.from(TRIVIA_TABLE).upsert(
      {
        id: 'main',
        balance: triviaPool.balance,
        contributions: triviaPool.contributions,
        last_winner: triviaPool.lastWinner,
        last_payout: triviaPool.lastPayout,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  } catch (err) {
    console.error('[community-pools] Failed to persist trivia jackpot:', err);
  }
}

async function loadMicrograntPool(): Promise<void> {
  try {
    const client = db.getClient();
    if (!client) return;

    const { data } = await client.from(MICROGRANT_TABLE).select('*').order('updated_at', { ascending: false }).limit(1).single();
    if (data) {
      micrograntPool = {
        balance: data.balance ?? 0,
        contributions: data.contributions ?? 0,
        updatedAt: new Date(data.updated_at).getTime(),
      };
    }
  } catch {
    // Table may not exist yet
  }
}

async function saveMicrograntPool(): Promise<void> {
  try {
    const client = db.getClient();
    if (!client) return;

    await client.from(MICROGRANT_TABLE).upsert(
      {
        id: 'main',
        balance: micrograntPool.balance,
        contributions: micrograntPool.contributions,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  } catch (err) {
    console.error('[community-pools] Failed to persist microgrant pool:', err);
  }
}

void Promise.all([loadTriviaPool(), loadMicrograntPool()]).catch(() => {});

export function getTriviaJackpotSnapshot() {
  return {
    pool: triviaPool.balance,
    contributions: triviaPool.contributions,
    lastWinner: triviaPool.lastWinner,
    lastPayout: triviaPool.lastPayout,
    updatedAt: triviaPool.updatedAt,
  };
}

export function getMicrograntPoolSnapshot() {
  return {
    pool: micrograntPool.balance,
    contributions: micrograntPool.contributions,
    updatedAt: micrograntPool.updatedAt,
  };
}

export async function contributeTriviaJackpot(amountSol: number, source?: string, signature?: string): Promise<void> {
  if (typeof amountSol !== 'number' || amountSol <= 0) return;
  triviaPool.balance += amountSol;
  triviaPool.contributions += 1;
  triviaPool.updatedAt = Date.now();
  await saveTriviaPool();
  console.log(`[community-pools] Trivia jackpot: +${amountSol} SOL from ${source || 'unknown'} (sig: ${signature || 'none'})`);
}

export async function recordTriviaJackpotPayout(winner: string, amountSol: number): Promise<void> {
  triviaPool.lastWinner = winner;
  triviaPool.lastPayout = amountSol;
  triviaPool.balance = Math.max(0, triviaPool.balance - amountSol);
  triviaPool.updatedAt = Date.now();
  await saveTriviaPool();
  console.log(`[community-pools] Trivia jackpot payout: ${amountSol} SOL to ${winner}`);
}

export async function resetTriviaJackpotPool(): Promise<void> {
  triviaPool.balance = 0;
  triviaPool.contributions = 0;
  triviaPool.updatedAt = Date.now();
  await saveTriviaPool();
}

export async function contributeMicrograntPool(amountSol: number, source: string, meta?: Record<string, unknown>): Promise<void> {
  if (typeof amountSol !== 'number' || amountSol <= 0) return;
  micrograntPool.balance += amountSol;
  micrograntPool.contributions += 1;
  micrograntPool.updatedAt = Date.now();
  await saveMicrograntPool();
  console.log(`[community-pools] Microgrant pool: +${amountSol} SOL from ${source}${meta ? ` ${JSON.stringify(meta)}` : ''}`);
}

/**
 * Applies LockVault early-unlock fee splits to microgrant ledgers.
 * Dev allocation is structured-log only until an automated sweep exists (risk: no secret wallet handling in API).
 */
export async function creditEarlyUnlockFeeSplits(params: {
  userId: string;
  triviaSOL: number;
  micrograntSOL: number;
  devSOL: number;
}): Promise<void> {
  const { userId, triviaSOL, micrograntSOL, devSOL } = params;
  const meta = { userId, route: 'wallet_early_unlock' };
  const deferredTriviaSOL = typeof triviaSOL === 'number' && triviaSOL > 0 ? triviaSOL : 0;
  const recoveryMicrograntSOL = micrograntSOL + deferredTriviaSOL;

  if (deferredTriviaSOL > 0) {
    console.log(
      JSON.stringify({
        event: 'early_unlock_trivia_jackpot_deferred',
        sol: deferredTriviaSOL,
        userId,
        reroutedTo: 'microgrant_pool',
      }),
    );
  }

  if (recoveryMicrograntSOL > 0) {
    await contributeMicrograntPool(recoveryMicrograntSOL, 'wallet_early_unlock', meta);
  }

  if (devSOL > 0) {
    const dest = process.env.EARLY_UNLOCK_DEV_SOL_ADDRESS?.trim() || '';
    console.log(
      JSON.stringify({
        event: 'early_unlock_dev_allocation',
        sol: devSOL,
        userId,
        intendedDestinationSol: dest || 'UNCONFIGURED',
      }),
    );
  }
}
