/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Vault Routes - /vault/*
 * Handles general vault balance and timed locks.
 */

import { Router } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { 
  lockVault, 
  unlockVault, 
  getVaultStatus, 
  depositToVault, 
  getVaultBalance 
} from '@tiltcheck/lockvault';

const router = Router();

/**
 * GET /vault/:userId
 * Get general vault balance and all active locks
 */
router.get('/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const auth = (req as AuthRequest).user;

  if (auth?.id !== userId) {
    res.status(403).json({ error: 'Unauthorized access to vault' });
    return;
  }

  const balance = getVaultBalance(userId);
  const locks = getVaultStatus(userId);

  res.json({
    success: true,
    vault: {
      balance,
      locks
    }
  });
});

/**
 * GET /vault/:userId/lock-status
 * Get the most recent active lock status
 */
router.get('/:userId/lock-status', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const auth = (req as AuthRequest).user;

  if (auth?.id !== userId) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  const locks = getVaultStatus(userId);
  const activeLock = locks.find(v => v.status === 'locked' || v.status === 'extended');

  if (!activeLock) {
    res.json({ success: true, locked: false });
    return;
  }

  res.json({
    success: true,
    locked: true,
    amount: activeLock.lockedAmountSOL, // Extension primarily displays USD but the record stores normalized SOL. 
    // For consistency with extension expectations:
    unlockTime: new Date(activeLock.unlockAt).toISOString(),
    createdAt: new Date(activeLock.createdAt).toISOString(),
    id: activeLock.id
  });
});

/**
 * POST /vault/:userId/deposit
 * Add funds to general vault balance
 */
router.post('/:userId/deposit', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body;
  const auth = (req as AuthRequest).user;

  if (auth?.id !== userId) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  if (amount === undefined || isNaN(amount) || amount <= 0) {
    res.status(400).json({ error: 'Invalid amount' });
    return;
  }

  const newBalance = depositToVault(userId, amount);
  res.json({
    success: true,
    vault: {
      balance: newBalance
    }
  });
});

/**
 * POST /vault/:userId/lock
 * Create a new timed lock
 */
router.post('/:userId/lock', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { amount, durationMinutes, reason } = req.body;
  const auth = (req as AuthRequest).user;

  if (auth?.id !== userId) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const record = await lockVault({
      userId,
      amountRaw: `${amount} USD`,
      durationRaw: `${durationMinutes}m`,
      reason: reason || 'Manual Lock',
      currencyHint: 'USD'
    });

    res.json({
      success: true,
      vault: record
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /vault/:userId/release
 * Unlock an expired lock
 */
router.post('/:userId/release', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { vaultId } = req.body;
  const auth = (req as AuthRequest).user;

  if (auth?.id !== userId) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  try {
    let targetVaultId = vaultId;
    
    // If no vaultId provided, find the first unlockable one
    if (!targetVaultId) {
      const locks = getVaultStatus(userId);
      const ready = locks.find(v => v.status === 'locked' && Date.now() >= v.unlockAt);
      if (!ready) {
        res.status(400).json({ error: 'No vaults ready for release' });
        return;
      }
      targetVaultId = ready.id;
    }

    const record = unlockVault(userId, targetVaultId);
    
    res.json({
      success: true,
      amount: record.lockedAmountSOL,
      vault: record
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export { router as vaultRouter };
