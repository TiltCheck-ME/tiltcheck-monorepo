/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Tip Routes - /tip/*
 * JustTheTip tipping endpoints
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sessionAuth } from '@tiltcheck/auth/middleware/express';
import { justthetip } from '@tiltcheck/justthetip';
import type { Request } from 'express';

const router = Router();

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
        publicKey: publicKey ? String(publicKey) : undefined 
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
    const result = await justthetip.completeTipTransaction(id, auth.userId, String(txSignature));

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

    const tip = await justthetip.getTipDetails(id);

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

export { router as tipRouter };
