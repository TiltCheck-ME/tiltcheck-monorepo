// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06
/**
 * Trivia Jackpot Pool — HTTP surface for the Live Trivia prize pool.
 * Persistence lives in services/community-pools.ts (shared with wallet-lock fee routing).
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

  await contributeTriviaJackpot(amountSol, source, signature);

  const snap = getTriviaJackpotSnapshot();
  res.json({ pool: snap.pool, contributions: snap.contributions });
});

router.post('/jackpot/payout', async (req, res) => {
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
