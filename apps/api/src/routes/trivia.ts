// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
/**
 * Trivia Jackpot Pool — persistent tracking of the Live Trivia prize pool.
 * Tracks contributions from /rain, /triviadrop, and direct Solana Pay deposits.
 * Serves the current pool balance to the degens-activity jackpot view.
 */

import { Router } from 'express';
import { db } from '@tiltcheck/database';

const router = Router();

// ── In-memory pool with DB persistence ─────────────────────────────────────────

interface JackpotPool {
  balance: number;       // SOL
  contributions: number; // total count
  lastWinner: string | null;
  lastPayout: number;
  updatedAt: number;
}

let pool: JackpotPool = {
  balance: 0,
  contributions: 0,
  lastWinner: null,
  lastPayout: 0,
  updatedAt: Date.now(),
};

const TABLE = 'trivia_jackpot';

async function loadPool(): Promise<void> {
  try {
    const { data } = await db.from(TABLE).select('*').order('updated_at', { ascending: false }).limit(1).single();
    if (data) {
      pool = {
        balance: data.balance ?? 0,
        contributions: data.contributions ?? 0,
        lastWinner: data.last_winner ?? null,
        lastPayout: data.last_payout ?? 0,
        updatedAt: new Date(data.updated_at).getTime(),
      };
    }
  } catch {
    // Table may not exist yet — use in-memory defaults
  }
}

async function savePool(): Promise<void> {
  try {
    await db.from(TABLE).upsert({
      id: 'main',
      balance: pool.balance,
      contributions: pool.contributions,
      last_winner: pool.lastWinner,
      last_payout: pool.lastPayout,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (err) {
    console.error('[trivia] Failed to persist jackpot pool:', err);
  }
}

// Load on startup
loadPool().catch(() => {});

// ── GET /trivia/jackpot — current pool state ───────────────────────────────────

router.get('/jackpot', (_req, res) => {
  res.json({
    pool: pool.balance,
    contributions: pool.contributions,
    lastWinner: pool.lastWinner,
    lastPayout: pool.lastPayout,
    updatedAt: pool.updatedAt,
  });
});

// ── POST /trivia/jackpot/contribute — add to the pool ──────────────────────────

router.post('/jackpot/contribute', async (req, res) => {
  const { amountSol, source, signature } = req.body;

  if (typeof amountSol !== 'number' || amountSol <= 0) {
    res.status(400).json({ error: 'amountSol must be a positive number' });
    return;
  }

  pool.balance += amountSol;
  pool.contributions += 1;
  pool.updatedAt = Date.now();

  await savePool();

  console.log(`[trivia] Jackpot contribution: +${amountSol} SOL from ${source || 'unknown'} (sig: ${signature || 'none'})`);

  res.json({ pool: pool.balance, contributions: pool.contributions });
});

// ── POST /trivia/jackpot/payout — record a winner payout ───────────────────────

router.post('/jackpot/payout', async (req, res) => {
  const { winner, amountSol } = req.body;

  if (!winner || typeof amountSol !== 'number') {
    res.status(400).json({ error: 'winner and amountSol required' });
    return;
  }

  pool.lastWinner = winner;
  pool.lastPayout = amountSol;
  pool.balance = Math.max(0, pool.balance - amountSol);
  pool.updatedAt = Date.now();

  await savePool();

  console.log(`[trivia] Jackpot payout: ${amountSol} SOL to ${winner}`);

  res.json({ pool: pool.balance, lastWinner: pool.lastWinner, lastPayout: pool.lastPayout });
});

// ── POST /trivia/jackpot/reset — admin reset ───────────────────────────────────

router.post('/jackpot/reset', async (_req, res) => {
  pool.balance = 0;
  pool.contributions = 0;
  pool.updatedAt = Date.now();

  await savePool();

  res.json({ pool: 0, message: 'Jackpot pool reset' });
});

export { router as triviaRouter };
