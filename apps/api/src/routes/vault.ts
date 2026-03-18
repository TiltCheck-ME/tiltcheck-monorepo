/* Copyright (c) 2026 TiltCheck. All rights reserved. */
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
    amount: activeLock.lockedAmountSOL,
    amountUnit: 'SOL',
    unlockTime: new Date(activeLock.unlockAt).toISOString(),
    createdAt: new Date(activeLock.createdAt).toISOString(),
    id: activeLock.id,
    readyToRelease: Date.now() >= activeLock.unlockAt
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

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({ error: 'Invalid amount' });
    return;
  }

  const newBalance = depositToVault(userId, parsedAmount);
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

  const parsedAmount = Number(amount);
  const parsedDurationMinutes = Number(durationMinutes);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({ error: 'Invalid amount' });
    return;
  }
  if (!Number.isFinite(parsedDurationMinutes) || parsedDurationMinutes <= 0) {
    res.status(400).json({ error: 'Invalid durationMinutes' });
    return;
  }

  try {
    const record = await lockVault({
      userId,
      amountRaw: `${parsedAmount} USD`,
      durationRaw: `${Math.trunc(parsedDurationMinutes)}m`,
      reason: reason || 'Manual Lock',
      currencyHint: 'USD'
    });

    res.json({
      success: true,
      vault: record
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: message });
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

  if (vaultId !== undefined && (typeof vaultId !== 'string' || vaultId.trim().length === 0)) {
    res.status(400).json({ error: 'Invalid vaultId' });
    return;
  }

  try {
    let targetVaultId = typeof vaultId === 'string' ? vaultId.trim() : vaultId;
    
    // If no vaultId provided, find the first unlockable one
    if (!targetVaultId) {
      const locks = getVaultStatus(userId);
      const ready = locks.find(v =>
        (v.status === 'locked' || v.status === 'extended' || v.status === 'unlocked') &&
        Date.now() >= v.unlockAt
      );
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
      amountUnit: 'SOL',
      vault: record
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

export { router as vaultRouter };
