// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
/**
 * Cooldown self-exclusion registry — public read-only routes.
 * No auth required. CORS open. 30-second cache.
 * Sweepstakes sites can call /cooldown/check without a Solana client.
 *
 * GET /cooldown/check?wallet=<pubkey>[&game=<str>][&category=<str>]
 *   Returns { locked, scope, endTime }
 *
 * GET /cooldown/:wallet  (legacy — returns 410 Gone)
 */

import { Router } from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import { isLocked } from '@tiltcheck/cooldown-sdk';

const router = Router();
const DEVNET_RPC = 'https://api.devnet.solana.com';

// ── CORS ──────────────────────────────────────────────────────────────────────
router.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

function one(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

let _connection: Connection | undefined;
let _connectionUrl: string | undefined;

function registryConnection(): Connection {
  const url = process.env.COOLDOWN_RPC_URL || DEVNET_RPC;
  if (!_connection || _connectionUrl !== url) {
    _connection = new Connection(url, 'confirmed');
    _connectionUrl = url;
  }
  return _connection;
}

// ── Primary route ─────────────────────────────────────────────────────────────
router.get('/check', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=30');

  let wallet: PublicKey;
  try {
    wallet = new PublicKey(one(req.query.wallet) ?? '');
  } catch {
    res.status(400).json({ error: 'wallet must be a Solana public key' });
    return;
  }

  const game = one(req.query.game);
  const category = one(req.query.category);

  try {
    const status = await isLocked(registryConnection(), wallet, {
      game: game && game.length > 0 ? game : undefined,
      category: category && category.length > 0 ? category : undefined,
    });
    res.json(status);
  } catch (err) {
    console.error('[Cooldown] registry read failed', err);
    res.status(503).json({ error: 'Cooldown registry is unavailable' });
  }
});

// ── Legacy route — 410 Gone ───────────────────────────────────────────────────
router.get('/:wallet', (req, res) => {
  res.status(410).json({
    error: 'This endpoint has moved. Use GET /cooldown/check?wallet=<pubkey>&game=<str>&category=<str>',
    docs: 'https://tiltcheck.me/docs/cooldown',
  });
});

export { router as cooldownRouter };
