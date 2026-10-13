// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
/**
 * GET /tips/log?wallet=<pubkey>
 * Returns tip totals by day and by game for the given wallet.
 * Read-only, no auth required for demo. Add auth guard before prod.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

function one(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return undefined;
}

router.get('/log', async (req: Request, res: Response) => {
  const wallet = one(req.query.wallet);
  if (!wallet) {
    res.status(400).json({ error: 'wallet query param required' });
    return;
  }

  try {
    // Lazy-load to avoid module-level side effects at startup.
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
