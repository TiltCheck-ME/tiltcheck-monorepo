// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
/**
 * Tip Routes - /tip/* (also mounted at /justthetip/*)
 * JustTheTip tipping endpoints — direct tips, room rains, claim, history.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sessionAuth } from '@tiltcheck/auth/middleware/express';
import { justthetip, FLAT_FEE_LAMPORTS } from '@tiltcheck/justthetip';
import { findUserByDiscordId } from '@tiltcheck/db';
import { eventRouter } from '@tiltcheck/event-router';
import type { Request } from 'express';

const router = Router();

const SOL_PER_LAMPORT = 1e-9;
const LAMPORTS_PER_SOL = 1_000_000_000;
const RAIN_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── In-memory room rain store ──────────────────────────────────────────────
interface RoomRain {
  id: string;
  channelId: string;
  fromDiscordId: string;
  fromUsername: string;
  amountLamports: number;
  message: string;
  expiresAt: number;
  claimedBy: Set<string>;
  maxClaims: number;  // 0 = unlimited (splits evenly), N = first-N wins
}

interface ChannelHistoryEntry {
  id: string;
  fromUsername: string;
  toUsername: string;
  amountSol: number;
  message: string;
  timestamp: number;
  claimed: boolean;
}

const roomRains = new Map<string, RoomRain>();
const channelHistory = new Map<string, ChannelHistoryEntry[]>();

// Clean up expired rains every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, rain] of roomRains) {
    if (rain.expiresAt <= now) roomRains.delete(id);
  }
}, 2 * 60 * 1000);

function addToHistory(channelId: string, entry: ChannelHistoryEntry): void {
  const list = channelHistory.get(channelId) ?? [];
  list.unshift(entry);
  if (list.length > 50) list.length = 50;
  channelHistory.set(channelId, list);
}

// Rate limiting for financial operations
const tipLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 tips per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many tipping requests', code: 'RATE_LIMIT_EXCEEDED' },
});

const verifyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 verifications per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification requests', code: 'RATE_LIMIT_EXCEEDED' },
});

/**
 * POST /tip/verify
 * Verify a tipping request (Discord user + wallet signature + session)
 */
router.post('/verify', verifyLimiter, sessionAuth(), async (req: Request, res) => {
  try {
    const { recipientDiscordId, amount, currency, signature, message, publicKey } = req.body;
    const auth = req.auth;

    if (!auth || !auth.discordId) {
      res.status(401).json({ error: 'Not authenticated with Discord' });
      return;
    }

    if (!recipientDiscordId || !amount || !currency) {
      res.status(400).json({ error: 'Missing required fields: recipientDiscordId, amount, currency' });
      return;
    }

    // Use JustTheTip module for verification logic
    const result = await justthetip.verifyTipRequest(
      { 
        userId: auth.userId, 
        discordId: auth.discordId, 
        walletAddress: auth.walletAddress 
      },
      { 
        recipientDiscordId: String(recipientDiscordId), 
        amount: String(amount), 
        currency: String(currency), 
        signature: signature ? String(signature) : undefined, 
        message: message ? String(message) : undefined, 
        publicKey: publicKey ? String(publicKey) : undefined,
        disclaimerAccepted: true
      }
    );

    if (!result.valid) {
      res.status(400).json({ error: result.error || 'Verification failed' });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('[Tip] Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * POST /tip/create
 * Create a new tip
 */
router.post('/create', tipLimiter, sessionAuth(), async (req: Request, res) => {
  try {
    const { recipientDiscordId, recipientWallet, amount, currency, message: tipMessage } = req.body;
    const auth = req.auth;

    if (!auth) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!recipientDiscordId || !amount || !currency) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Use JustTheTip module to create the record
    const tip = await justthetip.createNewTip({
      senderId: auth.userId,
      recipientDiscordId,
      recipientWallet,
      amount: String(amount),
      currency,
      message: tipMessage,
    });

    if (!tip) {
      res.status(500).json({ error: 'Failed to create tip' });
      return;
    }

    res.json({
      success: true,
      tip: {
        id: tip.id,
        status: tip.status,
        amount: tip.amount,
        currency: tip.currency,
        recipientDiscordId: tip.recipient_discord_id,
        createdAt: tip.created_at,
      },
    });
  } catch (error) {
    console.error('[Tip] Create error:', error);
    res.status(500).json({ error: 'Failed to create tip' });
  }
});

/**
 * POST /tip/:id/complete
 * Mark a tip as completed with transaction signature
 */
router.post('/:id/complete', tipLimiter, sessionAuth(), async (req: Request, res) => {
  try {
    const { id } = req.params;
    const { txSignature } = req.body;
    const auth = req.auth;

    if (!auth) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!txSignature) {
      res.status(400).json({ error: 'Missing txSignature' });
      return;
    }

    // Use JustTheTip module for completion logic (including ownership check)
    const result = await justthetip.completeTipTransaction(id as string, auth.userId, String(txSignature));

    if (!result.success) {
      const status = result.error === 'Tip not found' ? 404 : 403;
      res.status(status).json({ error: result.error });
      return;
    }

    res.json({
      success: true,
      tip: result.tip,
    });
  } catch (error) {
    console.error('[Tip] Complete error:', error);
    res.status(500).json({ error: 'Failed to complete tip' });
  }
});

/**
 * GET /tip/:id
 * Get tip details
 */
router.get('/:id', sessionAuth(undefined, { required: false }), async (req, res) => {
  try {
    const { id } = req.params;

    const tip = await justthetip.getTipDetails(id as string);

    if (!tip) {
      res.status(404).json({ error: 'Tip not found' });
      return;
    }

    // Only return full details if authenticated and is sender/recipient
    const auth = req.auth;
    const isParticipant = auth && (
      tip.sender_id === auth.userId ||
      tip.recipient_discord_id === auth.discordId
    );

    if (isParticipant) {
      res.json({ tip });
    } else {
      // Return limited public info
      res.json({
        tip: {
          id: tip.id,
          status: tip.status,
          amount: tip.amount,
          currency: tip.currency,
          createdAt: tip.created_at,
        },
      });
    }
  } catch (error) {
    console.error('[Tip] Get error:', error);
    res.status(500).json({ error: 'Failed to get tip' });
  }
});

/**
 * POST /tip/send  (also /justthetip/send)
 * Send a tip to a user or rain the ROOM.
 * Body: { fromUserId, toUsername, amountSol, message?, channelId }
 */
router.post('/send', tipLimiter, sessionAuth(undefined, { required: false }), async (req: Request, res) => {
  try {
    const { fromUserId, toUsername, amountSol, message = '', channelId } = req.body;
    const userId = (req.auth as { userId?: string } | undefined)?.userId ?? fromUserId;

    if (!userId || !toUsername || !amountSol || amountSol <= 0 || !channelId) {
      res.status(400).json({ error: 'Missing required fields: toUsername, amountSol, channelId' });
      return;
    }

    const amountLamports = Math.round(parseFloat(amountSol) * LAMPORTS_PER_SOL);
    const feeLamports = FLAT_FEE_LAMPORTS;
    const feeSavedSol = 0; // populated for Elite users below

    // ── ROOM RAIN ─────────────────────────────────────────────────────────
    if (toUsername.toUpperCase() === 'ROOM') {
      const sender = await findUserByDiscordId(userId).catch(() => null);
      const senderUsername = sender?.discord_username ?? userId;

      await justthetip.credits.deductForAirdrop(userId, [`ROOM:${channelId}`], amountLamports);

      const rain: RoomRain = {
        id: crypto.randomUUID(),
        channelId,
        fromDiscordId: userId,
        fromUsername: senderUsername,
        amountLamports,
        message,
        expiresAt: Date.now() + RAIN_TTL_MS,
        claimedBy: new Set(),
        maxClaims: 0,
      };
      roomRains.set(rain.id, rain);

      addToHistory(channelId, {
        id: rain.id,
        fromUsername: senderUsername,
        toUsername: 'ROOM',
        amountSol: amountLamports * SOL_PER_LAMPORT,
        message,
        timestamp: Date.now(),
        claimed: false,
      });

      await eventRouter.publish('tip.rain', 'justthetip', {
        rainId: rain.id,
        channelId,
        fromUserId: userId,
        fromUsername: senderUsername,
        amountSol: amountLamports * SOL_PER_LAMPORT,
        amountUsd: 0,
        message,
        expiresAt: rain.expiresAt,
        claimable: true,
      });

      res.json({
        success: true,
        type: 'room_rain',
        rainId: rain.id,
        amountSol: amountLamports * SOL_PER_LAMPORT,
        feeSavedSol,
        expiresAt: rain.expiresAt,
      });
      return;
    }

    // ── DIRECT TIP ────────────────────────────────────────────────────────
    // Look up recipient by username
    const sender = await findUserByDiscordId(userId).catch(() => null);
    const senderUsername = sender?.discord_username ?? userId;

    // Resolve recipient — best-effort by username (client sends Discord username)
    // Since we store users by discordId, try direct lookup by toUsername as discordId fallback
    let recipientId: string | null = null;
    try {
      const recipient = await findUserByDiscordId(toUsername);
      recipientId = recipient?.id ?? null;
    } catch (_) { /* username not a discordId */ }

    if (!recipientId) {
      // Store as pending with username as placeholder recipient ID
      recipientId = `username:${toUsername}`;
    }

    await justthetip.credits.createPendingTip(userId, recipientId, amountLamports);

    addToHistory(channelId, {
      id: crypto.randomUUID(),
      fromUsername: senderUsername,
      toUsername,
      amountSol: amountLamports * SOL_PER_LAMPORT,
      message,
      timestamp: Date.now(),
      claimed: false,
    });

    await eventRouter.publish('tip.sent', 'justthetip', {
      channelId,
      fromUsername: senderUsername,
      toUsername,
      amountSol: amountLamports * SOL_PER_LAMPORT,
      message,
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      type: 'direct',
      amountSol: amountLamports * SOL_PER_LAMPORT,
      feeSavedSol,
      feeLamports,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Send failed';
    console.error('[Tip] Send error:', error);
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /tip/claim  (also /justthetip/claim)
 * Claim an active room rain.
 * Body: { rainId, userId, channelId }
 */
router.post('/claim', tipLimiter, sessionAuth(undefined, { required: false }), async (req: Request, res) => {
  try {
    const { rainId, userId, channelId } = req.body;
    const claimerId = (req.auth as { userId?: string } | undefined)?.userId ?? userId;

    if (!rainId || !claimerId || !channelId) {
      res.status(400).json({ error: 'Missing required fields: rainId, userId, channelId' });
      return;
    }

    const rain = roomRains.get(rainId);
    if (!rain) {
      res.status(404).json({ error: 'Rain not found or expired' });
      return;
    }
    if (rain.channelId !== channelId) {
      res.status(403).json({ error: 'Rain does not belong to this channel' });
      return;
    }
    if (rain.expiresAt <= Date.now()) {
      roomRains.delete(rainId);
      res.status(410).json({ error: 'Rain expired' });
      return;
    }
    if (rain.claimedBy.has(claimerId)) {
      res.status(409).json({ error: 'Already claimed' });
      return;
    }
    if (rain.fromDiscordId === claimerId) {
      res.status(400).json({ error: 'Cannot claim your own rain' });
      return;
    }

    rain.claimedBy.add(claimerId);

    // Credit the claimer
    await justthetip.credits.deposit(claimerId, rain.amountLamports, { memo: 'room_rain_claim' });

    const amountSol = rain.amountLamports * SOL_PER_LAMPORT;

    addToHistory(channelId, {
      id: crypto.randomUUID(),
      fromUsername: rain.fromUsername,
      toUsername: claimerId,
      amountSol,
      message: rain.message,
      timestamp: Date.now(),
      claimed: true,
    });

    // Remove rain after first claim (change to partial if you want multi-claim)
    roomRains.delete(rainId);

    await eventRouter.publish('tip.rain.claimed', 'justthetip', {
      rainId,
      channelId,
      claimedBy: claimerId,
      amountSol,
    });

    res.json({ success: true, amountSol, feeSavedSol: 0 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Claim failed';
    console.error('[Tip] Claim error:', error);
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /tip/history  (also /justthetip/history)
 * Recent tips for a channel.
 * Query: channelId
 */
router.get('/history', async (req: Request, res) => {
  const { channelId } = req.query;
  if (!channelId || typeof channelId !== 'string') {
    res.status(400).json({ error: 'Missing channelId query param' });
    return;
  }
  const tips = channelHistory.get(channelId) ?? [];
  res.json({ tips });
});

export { router as tipRouter };

