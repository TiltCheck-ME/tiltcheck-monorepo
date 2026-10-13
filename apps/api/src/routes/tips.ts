// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13
/**
 * GET /tips/log
 *
 * Threat: unauthenticated reads leaked any wallet's tip history (volume, game
 * context, counterparties). Auth is required. The wallet in the query must match
 * the session's linked pubkey — no cross-wallet recon.
 * Rollback: revert this file; the old demo route had no auth.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sessionAuth } from '@tiltcheck/auth/middleware/express';
import type { Request, Response } from 'express';

const router = Router();

const logLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Slow down. Tip log is 10 req/min.', code: 'RATE_LIMIT_EXCEEDED' },
});

function one(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return undefined;
}

router.get('/log', logLimiter, sessionAuth(undefined, { required: true }), async (req: Request, res: Response) => {
  const auth = req.auth;
  if (!auth?.walletAddress) {
    res.status(403).json({ error: 'No wallet linked. Link a wallet before reading tip history.' });
    return;
  }

  const requested = one(req.query.wallet);
  if (requested && requested !== auth.walletAddress) {
    res.status(403).json({ error: 'No cap, you cannot query another wallet.' });
    return;
  }

  const wallet = auth.walletAddress;

  try {
    const { getTipTotals, getTipsForWallet } = await import('@tiltcheck/justthetip');
    const entries = getTipsForWallet(wallet);
    const totals = getTipTotals(wallet);
    res.json({ wallet, totals, recentEntries: entries.slice(-50) });
  } catch (err) {
    console.error('[Tips] log read failed', err);
    res.status(503).json({ error: 'Tip log unavailable' });
  }
});

export { router as tipsRouter };
