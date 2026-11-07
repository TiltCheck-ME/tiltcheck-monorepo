// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-05
/**
 * Cooldown self-exclusion & timelock verification registry.
 * Automated On-Chain Verification Service with:
 * 1. Fast in-memory TTL caching with instant invalidation
 * 2. Instant on-chain transaction verification (POST /cooldown/verify-tx)
 * 3. Server-Sent Events real-time lock update streaming (GET /cooldown/stream)
 * 4. Backward-compatible public lock checking (GET /cooldown/check)
 *
 * Non-custodial: verifies on-chain Solana state with zero custody of player funds or keys.
 */

import { Router, type Request, type Response } from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  isLocked,
  lockAddress,
  zeroTarget,
  hashTarget,
  SCOPE_ALL,
  SCOPE_CATEGORY,
  SCOPE_GAME,
  cooldownProgramId,
  type LockStatus,
} from '@tiltcheck/cooldown-sdk';

const router = Router();
const DEVNET_RPC = 'https://api.devnet.solana.com';

// ── In-Memory Verification Cache & SSE Subscriptions ──────────────────────────

interface CachedVerification {
  status: LockStatus;
  pda?: string;
  timeRemainingSecs: number;
  verifiedAt: number;
}

const verificationCache = new Map<string, CachedVerification>();
const CACHE_TTL_MS = 15_000; // 15 seconds cache

const sseSubscribers = new Map<string, Set<Response>>();
const accountSubscriptions = new Map<string, number>();

function getCacheKey(wallet: string, game?: string, category?: string): string {
  return `${wallet}:${game ?? ''}:${category ?? ''}`;
}

export function invalidateCooldownCache(wallet?: string): void {
  if (!wallet) {
    verificationCache.clear();
    return;
  }
  for (const key of verificationCache.keys()) {
    if (key.startsWith(`${wallet}:`) || key === wallet) {
      verificationCache.delete(key);
    }
  }
}

export function broadcastLockUpdate(wallet: string, data: Record<string, unknown>): void {
  const clients = sseSubscribers.get(wallet);
  if (clients && clients.size > 0) {
    const payload = `event: lock_update\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch {
        clients.delete(res);
      }
    }
  }
}

// ── CORS ──────────────────────────────────────────────────────────────────────
router.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Requested-With');
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

export function registryConnection(): Connection {
  const url = process.env.COOLDOWN_RPC_URL || DEVNET_RPC;
  if (!_connection || _connectionUrl !== url) {
    _connection = new Connection(url, 'confirmed');
    _connectionUrl = url;
  }
  return _connection;
}

/**
 * Derives the on-chain Anchor PDA for a given scope and target.
 */
function deriveLockPda(
  wallet: PublicKey,
  scope: 'all' | 'category' | 'game' = 'all',
  targetKey = '',
): string {
  try {
    const programId = typeof cooldownProgramId === 'function' ? cooldownProgramId() : undefined;
    if (typeof lockAddress !== 'function' || typeof zeroTarget !== 'function') {
      return '';
    }

    if (scope === 'all') {
      return lockAddress(wallet, SCOPE_ALL ?? 0, zeroTarget(), programId).toBase58();
    }
    if (scope === 'category' && typeof hashTarget === 'function') {
      const target = hashTarget(targetKey.startsWith('category:') ? targetKey : `category:${targetKey}`);
      return lockAddress(wallet, SCOPE_CATEGORY ?? 1, target, programId).toBase58();
    }
    if (scope === 'game' && typeof hashTarget === 'function') {
      const target = hashTarget(targetKey.includes(':') ? targetKey : `game:${targetKey}`);
      return lockAddress(wallet, SCOPE_GAME ?? 2, target, programId).toBase58();
    }
    return '';
  } catch {
    return '';
  }
}

// ── Primary Check Route ───────────────────────────────────────────────────────
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
  const skipCache = req.query.skipCache === 'true' || req.query.bust === 'true' || req.headers['cache-control'] === 'no-cache';

  const cacheKey = getCacheKey(wallet.toBase58(), game, category);

  const isVerbose = req.query.verbose === 'true' || req.query.details === 'true';

  if (!skipCache) {
    const cached = verificationCache.get(cacheKey);
    if (cached && Date.now() - cached.verifiedAt < CACHE_TTL_MS) {
      const nowSecs = Math.floor(Date.now() / 1000);
      const timeRemaining = cached.status.endTime ? Math.max(0, cached.status.endTime - nowSecs) : 0;
      if (isVerbose) {
        res.json({
          locked: cached.status.locked,
          scope: cached.status.scope,
          endTime: cached.status.endTime,
          pda: cached.pda,
          timeRemainingSecs: timeRemaining,
          verifiedAt: cached.verifiedAt,
        });
      } else {
        res.json({
          locked: cached.status.locked,
          scope: cached.status.scope,
          endTime: cached.status.endTime,
        });
      }
      return;
    }
  }

  try {
    const status = await isLocked(registryConnection(), wallet, {
      game: game && game.length > 0 ? game : undefined,
      category: category && category.length > 0 ? category : undefined,
    });

    const nowSeconds = Math.floor(Date.now() / 1000);
    const timeRemainingSecs = status.endTime ? Math.max(0, status.endTime - nowSeconds) : 0;

    let pda = '';
    if (game) {
      pda = deriveLockPda(wallet, 'game', game);
    } else if (category) {
      pda = deriveLockPda(wallet, 'category', category);
    } else {
      pda = deriveLockPda(wallet, 'all', '');
    }

    verificationCache.set(cacheKey, {
      status,
      pda,
      timeRemainingSecs,
      verifiedAt: Date.now(),
    });

    if (isVerbose) {
      res.json({
        locked: status.locked,
        scope: status.scope,
        endTime: status.endTime,
        pda: pda || undefined,
        timeRemainingSecs,
        verifiedAt: Date.now(),
      });
    } else {
      res.json({
        locked: status.locked,
        scope: status.scope,
        endTime: status.endTime,
      });
    }
  } catch (err) {
    console.error('[Cooldown] registry read failed', err);
    res.status(503).json({ error: 'Cooldown registry is unavailable' });
  }
});

// ── On-Chain Transaction Verification Route ──────────────────────────────────
router.post('/verify-tx', async (req, res) => {
  const body = req.body as { signature?: unknown; wallet?: unknown; cluster?: unknown };

  if (!body || typeof body.signature !== 'string' || typeof body.wallet !== 'string') {
    res.status(400).json({ error: 'signature and wallet are required' });
    return;
  }

  const signature = body.signature.trim();
  const walletStr = body.wallet.trim();

  // Validate Solana signature length (base58, 64-88 characters)
  if (!signature || signature.length < 64 || signature.length > 88) {
    res.status(400).json({ error: 'Invalid Solana transaction signature format' });
    return;
  }

  let walletKey: PublicKey;
  try {
    walletKey = new PublicKey(walletStr);
  } catch {
    res.status(400).json({ error: 'wallet must be a valid Solana public key' });
    return;
  }

  try {
    const connection = registryConnection();

    // Verify signature status on-chain
    const statusResponse = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });

    const sigStatus = statusResponse?.value;

    if (!sigStatus) {
      // Transaction is pending propagation or not yet indexed by RPC
      res.status(202).json({
        verified: false,
        confirmationStatus: 'pending',
        message: 'Transaction pending confirmation or propagating on-chain.',
        signature,
        wallet: walletStr,
      });
      return;
    }

    if (sigStatus.err) {
      res.status(422).json({
        verified: false,
        confirmationStatus: sigStatus.confirmationStatus ?? 'failed',
        error: 'Transaction failed on-chain',
        details: sigStatus.err,
        signature,
        wallet: walletStr,
      });
      return;
    }

    // Transaction confirmed or finalized! Bust in-memory cache
    invalidateCooldownCache(walletStr);

    // Read fresh lock status
    const lockStatus = await isLocked(connection, walletKey);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const timeRemainingSecs = lockStatus.endTime ? Math.max(0, lockStatus.endTime - nowSeconds) : 0;
    const pda = deriveLockPda(walletKey, (lockStatus.scope as 'all' | 'category' | 'game') || 'all');

    const result = {
      verified: true,
      signature,
      confirmationStatus: sigStatus.confirmationStatus ?? 'confirmed',
      slot: sigStatus.slot,
      wallet: walletStr,
      lock: {
        locked: lockStatus.locked,
        scope: lockStatus.scope,
        endTime: lockStatus.endTime,
        pda: pda || undefined,
        timeRemainingSecs,
      },
      verifiedAt: Date.now(),
    };

    // Broadcast update to real-time subscribers
    broadcastLockUpdate(walletStr, result);

    res.json(result);
  } catch (err) {
    console.error('[Cooldown] Transaction verification failed:', err);
    res.status(503).json({ error: 'Cooldown verification service unavailable' });
  }
});

// ── Real-Time Server-Sent Events (SSE) Stream ─────────────────────────────────
router.get('/stream', async (req: Request, res: Response) => {
  let walletKey: PublicKey;
  try {
    walletKey = new PublicKey(one(req.query.wallet) ?? '');
  } catch {
    res.status(400).json({ error: 'wallet must be a valid Solana public key' });
    return;
  }

  const walletStr = walletKey.toBase58();

  // Set SSE streaming headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders?.();

  // Register subscriber
  if (!sseSubscribers.has(walletStr)) {
    sseSubscribers.set(walletStr, new Set());
  }
  const clients = sseSubscribers.get(walletStr)!;
  clients.add(res);

  // Send initial connection event with current state
  try {
    const currentStatus = await isLocked(registryConnection(), walletKey);
    const pda = deriveLockPda(walletKey, (currentStatus.scope as 'all' | 'category' | 'game') || 'all');
    res.write(`event: connected\ndata: ${JSON.stringify({
      wallet: walletStr,
      status: currentStatus,
      pda,
      connectedAt: Date.now(),
    })}\n\n`);
  } catch {
    res.write(`event: connected\ndata: ${JSON.stringify({
      wallet: walletStr,
      connectedAt: Date.now(),
    })}\n\n`);
  }

  // Periodic heartbeat / ping every 15s to keep connection alive
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
    }
  }, 15_000);

  req.on('close', () => {
    clearInterval(pingInterval);
    clients.delete(res);
    if (clients.size === 0) {
      sseSubscribers.delete(walletStr);
    }
  });
});

// ── Cache Invalidation Helper Route ───────────────────────────────────────────
router.post('/bust-cache', (req, res) => {
  const wallet = one(req.body?.wallet ?? req.query.wallet);
  invalidateCooldownCache(wallet);
  res.json({ success: true, invalidated: true, wallet: wallet || 'all' });
});

// ── Legacy route — 410 Gone ───────────────────────────────────────────────────
router.get('/:wallet', (req, res) => {
  res.status(410).json({
    error: 'This endpoint has moved. Use GET /cooldown/check?wallet=<pubkey>&game=<str>&category=<str>',
    docs: 'https://tiltcheck.me/docs/cooldown',
  });
});

export { router as cooldownRouter };
