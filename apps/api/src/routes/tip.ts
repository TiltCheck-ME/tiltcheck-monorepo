/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Tip Routes - /tip/*
 * JustTheTip tipping endpoints
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sessionAuth } from '@tiltcheck/auth/middleware/express';
import { verifySolanaSignature, verifySessionCookie, type JWTConfig } from '@tiltcheck/auth';
import { createTip, findTipById, updateTipStatus, findUserByDiscordId } from '@tiltcheck/db';

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

function getJWTConfig(): JWTConfig {
  return {
    secret: process.env.JWT_SECRET || '',
    issuer: process.env.JWT_ISSUER || 'tiltcheck.me',
    audience: process.env.JWT_AUDIENCE || 'tiltcheck.me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  };
}

/**
 * POST /tip/verify
 * Verify a tipping request (Discord user + wallet signature + session)
 */
router.post('/verify', verifyLimiter, sessionAuth(), async (req, res) => {
  try {
    const { recipientDiscordId, amount, currency, signature, message, publicKey } = req.body;
    const auth = req.auth;
    
    if (!auth) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    // Validate required fields
    if (!recipientDiscordId || !amount || !currency) {
      res.status(400).json({ error: 'Missing required fields: recipientDiscordId, amount, currency' });
      return;
    }
    
    // Verify wallet signature if provided
    if (signature && message && publicKey) {
      const signatureResult = await verifySolanaSignature({ message, signature, publicKey });
      
      if (!signatureResult.valid) {
        res.status(400).json({ error: 'Invalid wallet signature', details: signatureResult.error });
        return;
      }
      
      // Verify the public key matches the user's linked wallet
      if (auth.walletAddress && auth.walletAddress !== publicKey) {
        res.status(400).json({ error: 'Wallet address mismatch' });
        return;
      }
    }
    
    // Check if recipient exists
    const recipient = await findUserByDiscordId(recipientDiscordId);
    
    res.json({
      valid: true,
      sender: {
        userId: auth.userId,
        discordId: auth.discordId,
        walletAddress: auth.walletAddress,
      },
      recipient: recipient ? {
        userId: recipient.id,
        discordId: recipient.discord_id,
        walletAddress: recipient.wallet_address,
      } : {
        discordId: recipientDiscordId,
        walletAddress: null,
        isNewUser: true,
      },
      amount,
      currency,
    });
  } catch (error) {
    console.error('[Tip] Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * POST /tip/create
 * Create a new tip
 */
router.post('/create', tipLimiter, sessionAuth(), async (req, res) => {
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
    
    // Create the tip record
    const tip = await createTip({
      sender_id: auth.userId,
      recipient_discord_id: recipientDiscordId,
      recipient_wallet: recipientWallet,
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
router.post('/:id/complete', tipLimiter, sessionAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const { txSignature } = req.body;
    const auth = req.auth;
    
    if (!auth) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    // Get the tip
    const tip = await findTipById(id);
    
    if (!tip) {
      res.status(404).json({ error: 'Tip not found' });
      return;
    }
    
    // Verify the sender owns this tip
    if (tip.sender_id !== auth.userId) {
      res.status(403).json({ error: 'Not authorized to complete this tip' });
      return;
    }
    
    // Update tip status
    const updatedTip = await updateTipStatus(id, 'completed', txSignature);
    
    res.json({
      success: true,
      tip: updatedTip,
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
    
    const tip = await findTipById(id);
    
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
