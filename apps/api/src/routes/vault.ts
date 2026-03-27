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
  getVaultBalance,
  setWalletActionLockForUser,
  clearWalletActionLockForUser,
  getWalletActionLockStatus,
  addSecondOwner,
  initiateWithdrawal,
  approveWithdrawal,
  executeWithdrawal
} from '@tiltcheck/lockvault';

const router = Router();

function walletLockBlockedResponse(userId: string) {
  const status = getWalletActionLockStatus(userId);
  if (!status.locked || !status.lockUntil || !status.remainingMs) return null;
  return {
    error: 'Wallet lock is active. Try again after the timer expires.',
    code: 'WALLET_LOCK_ACTIVE',
    lockUntil: new Date(status.lockUntil).toISOString(),
    remainingMs: status.remainingMs,
    reason: status.reason || null,
  };
}

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
  const walletLock = getWalletActionLockStatus(userId);

  res.json({
    success: true,
    vault: {
      balance,
      locks,
    },
    walletLock,
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
 * GET /vault/:userId/wallet-lock-status
 * Returns account-level wallet lock state
 */
router.get('/:userId/wallet-lock-status', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const auth = (req as AuthRequest).user;

  if (auth?.id !== userId) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  const status = getWalletActionLockStatus(userId);
  res.json({
    success: true,
    ...status,
    lockUntil: status.lockUntil ? new Date(status.lockUntil).toISOString() : null,
  });
});

/**
 * POST /vault/:userId/wallet-lock
 * Set account-level wallet lock timer
 */
router.post('/:userId/wallet-lock', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { durationMinutes, reason } = req.body || {};
  const auth = (req as AuthRequest).user;

  if (auth?.id !== userId) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  const mins = Number(durationMinutes);
  if (!Number.isFinite(mins) || mins <= 0) {
    res.status(400).json({ error: 'Invalid durationMinutes' });
    return;
  }
  if (mins > 7 * 24 * 60) {
    res.status(400).json({ error: 'durationMinutes exceeds maximum of 7 days' });
    return;
  }

  const record = setWalletActionLockForUser(userId, Math.trunc(mins) * 60 * 1000, typeof reason === 'string' ? reason : undefined);
  res.json({
    success: true,
    locked: true,
    lockUntil: new Date(record.lockUntil).toISOString(),
    remainingMs: Math.max(0, record.lockUntil - Date.now()),
    reason: record.reason || null,
  });
});

/**
 * POST /vault/:userId/wallet-unlock
 * Clears account-level wallet lock
 */
router.post('/:userId/wallet-unlock', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const auth = (req as AuthRequest).user;

  if (auth?.id !== userId) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  clearWalletActionLockForUser(userId);
  res.json({ success: true, locked: false });
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

  const blocked = walletLockBlockedResponse(userId);
  if (blocked) {
    res.status(423).json(blocked);
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

  const blocked = walletLockBlockedResponse(userId);
  if (blocked) {
    res.status(423).json(blocked);
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
      currencyHint: 'USD',
      disclaimerAccepted: true
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

  const blocked = walletLockBlockedResponse(userId);
  if (blocked) {
    res.status(423).json(blocked);
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

/**
 * POST /vault/:userId/add-second-owner
 * Add a second owner to the vault
 */
router.post('/:userId/add-second-owner', authMiddleware, async (req, res) => {
    const { userId } = req.params;
    const { secondOwnerId } = req.body;
    const auth = (req as AuthRequest).user;

    if (auth?.id !== userId) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
    }

    if (!secondOwnerId || typeof secondOwnerId !== 'string') {
        res.status(400).json({ error: 'Invalid secondOwnerId' });
        return;
    }

    try {
        const record = await addSecondOwner(userId, secondOwnerId);
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
 * POST /vault/:userId/initiate-withdrawal
 * Initiate a withdrawal from the vault
 */
router.post('/:userId/initiate-withdrawal', authMiddleware, async (req, res) => {
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

    try {
        const record = await initiateWithdrawal(userId, parsedAmount);
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
 * POST /vault/:userId/approve-withdrawal
 * Approve a withdrawal from the vault
 */
router.post('/:userId/approve-withdrawal', authMiddleware, async (req, res) => {
    const { userId } = req.params;
    const auth = (req as AuthRequest).user;

    if (auth?.id !== userId) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const record = await approveWithdrawal(userId);
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
 * POST /vault/:userId/execute-withdrawal
 * Execute a withdrawal from the vault
 */
router.post('/:userId/execute-withdrawal', authMiddleware, async (req, res) => {
    const { userId } = req.params;
    const auth = (req as AuthRequest).user;

    if (auth?.id !== userId) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const record = await executeWithdrawal(userId);
        res.json({
            success: true,
            vault: record
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(400).json({ error: message });
    }
});

export { router as vaultRouter };
