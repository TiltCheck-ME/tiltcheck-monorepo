// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09
/**
 * Trivia Jackpot Pool - HTTP surface for the voluntary Live Trivia treasury.
 * Persistence lives in services/community-pools.ts; penalty-funded credits are deferred.
 */

import { Router } from 'express';
import {
  getTriviaJackpotSnapshot,
  contributeTriviaJackpot,
  recordTriviaJackpotPayout,
  resetTriviaJackpotPool,
  getMicrograntPoolSnapshot,
} from '../services/community-pools.js';

const router = Router();

function isDeferredFundingSource(source: unknown): boolean {
  if (typeof source !== 'string') return false;
  return /early[-_ ]?unlock|wallet[-_ ]?lock|lockvault|penalty|fee/i.test(source);
}

function triviaJackpotPayoutsEnabled(): boolean {
  return process.env.TRIVIA_JACKPOT_PAYOUTS_ENABLED === 'true' || process.env.TRIVIADROP_PAYOUTS_ENABLED === 'true';
}

router.get('/jackpot', (_req, res) => {
  res.json(getTriviaJackpotSnapshot());
});

router.get('/microgrant-pool', (_req, res) => {
  res.json(getMicrograntPoolSnapshot());
});

router.post('/jackpot/contribute', async (req, res) => {
  const { amountSol, source, signature } = req.body;

  if (typeof amountSol !== 'number' || amountSol <= 0) {
    res.status(400).json({ error: 'amountSol must be a positive number' });
    return;
  }
  if (isDeferredFundingSource(source)) {
    res.status(400).json({
      error: 'Penalty-funded trivia jackpots are deferred. Route fee allocations to recovery microgrants instead.',
      code: 'TRIVIA_JACKPOT_DEFERRED',
    });
    return;
  }

  await contributeTriviaJackpot(amountSol, source, signature);

  const snap = getTriviaJackpotSnapshot();
  res.json({ pool: snap.pool, contributions: snap.contributions });
});

router.post('/jackpot/payout', async (req, res) => {
  if (!triviaJackpotPayoutsEnabled()) {
    res.status(409).json({
      error: 'Trivia jackpot payouts are disabled until public contest rules and payout handling clear review.',
      code: 'TRIVIA_JACKPOT_PAYOUTS_DISABLED',
    });
    return;
  }

  const { winner, amountSol } = req.body;

  if (!winner || typeof amountSol !== 'number') {
    res.status(400).json({ error: 'winner and amountSol required' });
    return;
  }

  await recordTriviaJackpotPayout(winner, amountSol);

  const snap = getTriviaJackpotSnapshot();
  res.json({ pool: snap.pool, lastWinner: snap.lastWinner, lastPayout: snap.lastPayout });
});

router.post('/jackpot/reset', async (_req, res) => {
  await resetTriviaJackpotPool();
  res.json({ pool: 0, message: 'Jackpot pool reset' });
});

export { router as triviaRouter };
