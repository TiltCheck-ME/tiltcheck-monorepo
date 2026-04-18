/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */
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
  requestAdminWalletUnlockForUser,
  approveAdminWalletUnlockForUser,
  requestPaidWalletUnlockForUser,
  settlePaidWalletUnlockForUser,
  addSecondOwner,
  initiateWithdrawal,
  approveWithdrawal,
  executeWithdrawal
} from '@tiltcheck/lockvault';

const router: Router = Router();

interface VaultError extends Error {
  code?: string;
  httpStatus?: number;
}

function handleVaultError(error: unknown): { status: number; body: { error: string; code?: string } } {
  if (error instanceof Error) {
    const vaultError = error as VaultError;
    const code = vaultError.code;
    const httpStatus = vaultError.httpStatus;
    if (code && httpStatus) {
      return {
        status: httpStatus,
        body: { error: error.message, code }
      };
    }
    return {
      status: 400,
      body: { error: error.message }
    };
  }
  return {
    status: 500,
    body: { error: 'Unknown error' }
  };
}

/** Accepts both internal UUID and discordId as userId param for web compat */
function isAuthorized(auth: AuthRequest['user'], userId: string): boolean {
  return auth?.id === userId || (auth as any)?.discordId === userId;
}

function isAdmin(auth: AuthRequest['user']): boolean {
  return Array.isArray(auth?.roles) && auth.roles.includes('admin');
}

/** Narrow req.params value to string (handles string | string[] edge case) */
function param(req: { params: Record<string, string | string[]> }, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

function walletLockBlockedResponse(userId: string) {
  const status = getWalletActionLockStatus(userId);
  if (!status.locked || !status.lockUntil || !status.remainingMs) return null;
  return {
    error: 'Wallet lock is active. Try again after the timer expires.',
    code: 'WALLET_LOCK_ACTIVE',
    lockUntil: new Date(status.lockUntil).toISOString(),
    remainingMs: status.remainingMs,
    reason: status.reason || null,
    earlyUnlockRequest: status.earlyUnlockRequest || null,
  };
}

function buildWithdrawalExecutionResponse(record: Awaited<ReturnType<typeof executeWithdrawal>>) {
  const proposal = record.withdrawalProposal;
  if (proposal?.status === 'execution-pending') {
    const executionTimeoutAt = proposal.executionTimeoutAt ?? null;
    const remainingMs = executionTimeoutAt ? Math.max(0, executionTimeoutAt - Date.now()) : null;
    return {
      status: 202,
      body: {
        success: false,
        pendingExecution: true,
        retryEligible: false,
        message: 'Withdrawal execution was requested, but funds have not moved yet.',
        executionRequestId: proposal.executionRequestId ?? null,
        executionTimeoutAt: executionTimeoutAt ? new Date(executionTimeoutAt).toISOString() : null,
        remainingMs,
        vault: record,
      },
    };
  }

  if (proposal?.status === 'approved' && proposal.lastRecoveryReason === 'execution-timeout') {
    return {
      status: 409,
      body: {
        success: false,
        pendingExecution: false,
        retryEligible: true,
        code: 'WITHDRAWAL_EXECUTION_STALE',
        message: 'The previous withdrawal execution request went stale and was reset. Review the vault status and retry execution if funds did not move.',
        recoveredAt: proposal.lastRecoveryAt ? new Date(proposal.lastRecoveryAt).toISOString() : null,
        vault: record,
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      vault: record,
    },
  };
}

/**
 * GET /vault/:userId
 * Get general vault balance and all active locks
 */
router.get('/:userId', authMiddleware, async (req, res) => {
  const userId = param(req, 'userId');
  const auth = (req as AuthRequest).user;

  if (!isAuthorized(auth, userId)) {
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
  const userId = param(req, 'userId');
  const auth = (req as AuthRequest).user;

  if (!isAuthorized(auth, userId)) {
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
  const userId = param(req, 'userId');
  const auth = (req as AuthRequest).user;

  if (!isAuthorized(auth, userId)) {
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
  const userId = param(req, 'userId');
  const { durationMinutes, reason } = req.body || {};
  const auth = (req as AuthRequest).user;

  if (!isAuthorized(auth, userId)) {
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
  const userId = param(req, 'userId');
  const auth = (req as AuthRequest).user;

  if (!isAuthorized(auth, userId)) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  const status = getWalletActionLockStatus(userId);
  if (status.locked && status.remainingMs && status.remainingMs > 0) {
    res.status(423).json({
      error: 'Wallet lock is still active. Use admin approval or wait for the timer to expire.',
      code: 'WALLET_LOCK_STILL_ACTIVE',
      lockUntil: status.lockUntil ? new Date(status.lockUntil).toISOString() : null,
      remainingMs: status.remainingMs,
      reason: status.reason || null,
      earlyUnlockRequest: status.earlyUnlockRequest || null,
      unlockOptions: ['admin_approval'],
    });
    return;
  }

  clearWalletActionLockForUser(userId);
  res.json({ success: true, locked: false });
});

/**
 * POST /vault/:userId/wallet-unlock-request
 * Opens an early unlock path for admin approval or paid unlock
 */
router.post('/:userId/wallet-unlock-request', authMiddleware, async (req, res) => {
  const userId = param(req, 'userId');
  const auth = (req as AuthRequest).user;
  const { mode } = req.body || {};

  if (!isAuthorized(auth, userId)) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  if (mode !== 'admin_approval' && mode !== 'paid_early_unlock') {
    res.status(400).json({ error: 'mode must be admin_approval or paid_early_unlock' });
    return;
  }
  if (mode === 'paid_early_unlock') {
    res.status(501).json({
      error: 'Paid early wallet unlock is temporarily disabled until fee routing is implemented.',
      code: 'FEATURE_NOT_IMPLEMENTED',
    });
    return;
  }

  try {
    const actorId = (auth as any)?.discordId || auth?.id || userId;
    const record = mode === 'admin_approval'
      ? requestAdminWalletUnlockForUser(userId, actorId)
      : requestPaidWalletUnlockForUser(userId, actorId, 10);

    res.json({
      success: true,
      locked: true,
      lockUntil: new Date(record.lockUntil).toISOString(),
      earlyUnlockRequest: record.earlyUnlockRequest || null,
    });
  } catch (error) {
    const handled = handleVaultError(error);
    res.status(handled.status).json(handled.body);
  }
});

/**
 * POST /vault/:userId/wallet-unlock-approve
 * Admin-only approval path for early wallet unlock
 */
router.post('/:userId/wallet-unlock-approve', authMiddleware, async (req, res) => {
  const userId = param(req, 'userId');
  const auth = (req as AuthRequest).user;

  if (!isAdmin(auth)) {
    res.status(403).json({ error: 'Admin approval required' });
    return;
  }

  try {
    const approverId = (auth as any)?.discordId || auth?.id || 'admin';
    const record = approveAdminWalletUnlockForUser(userId, approverId);
    res.json({
      success: true,
      locked: false,
      earlyUnlockRequest: record.earlyUnlockRequest || null,
    });
  } catch (error) {
    const handled = handleVaultError(error);
    res.status(handled.status).json(handled.body);
  }
});

/**
 * POST /vault/:userId/wallet-unlock-pay
 * Pays the 10% early unlock fee from the user's latest active locked vault
 */
router.post('/:userId/wallet-unlock-pay', authMiddleware, async (req, res) => {
  const userId = param(req, 'userId');
  const auth = (req as AuthRequest).user;

  if (!isAuthorized(auth, userId)) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  const paidBy = (auth as any)?.discordId || auth?.id || userId;
  try {
    const record = settlePaidWalletUnlockForUser(userId, paidBy);
    res.json({
      success: true,
      locked: false,
      earlyUnlockRequest: record.earlyUnlockRequest || null,
      feeChargedSOL: record.earlyUnlockRequest?.feeAmountSOL ?? null,
    });
  } catch (error) {
    const handled = handleVaultError(error);
    res.status(handled.status).json(handled.body);
  }
});

/**
 * POST /vault/:userId/deposit
 * Add funds to general vault balance
 */
router.post('/:userId/deposit', authMiddleware, async (req, res) => {
  const userId = param(req, 'userId');
  const { amount } = req.body;
  const auth = (req as AuthRequest).user;

  if (!isAuthorized(auth, userId)) {
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
  const userId = param(req, 'userId');
  const { amount, durationMinutes, reason } = req.body;
  const auth = (req as AuthRequest).user;

  if (!isAuthorized(auth, userId)) {
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
      amountRaw: `${parsedAmount} SOL`,
      durationRaw: `${Math.trunc(parsedDurationMinutes)}m`,
      reason: reason || 'Manual Lock',
      currencyHint: 'SOL',
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
  const userId = param(req, 'userId');
  const { vaultId } = req.body;
  const auth = (req as AuthRequest).user;

  if (!isAuthorized(auth, userId)) {
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
    const userId = param(req, 'userId');
    const { secondOwnerId } = req.body;
    const auth = (req as AuthRequest).user;

    if (!isAuthorized(auth, userId)) {
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
        const { status, body } = handleVaultError(error);
        res.status(status).json(body);
    }
});

/**
 * POST /vault/:userId/initiate-withdrawal
 * Initiate a withdrawal from the vault
 */
router.post('/:userId/initiate-withdrawal', authMiddleware, async (req, res) => {
    const userId = req.params.userId as string;
    const { amount } = req.body;
    const auth = (req as AuthRequest).user;

    if (!isAuthorized(auth, userId)) {
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
        const { status, body } = handleVaultError(error);
        res.status(status).json(body);
    }
});

/**
 * POST /vault/:userId/approve-withdrawal
 * Approve a withdrawal from the vault
 */
router.post('/:userId/approve-withdrawal', authMiddleware, async (req, res) => {
    const userId = req.params.userId as string;
    const auth = (req as AuthRequest).user;

    if (!auth?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const record = await approveWithdrawal(userId, auth.id);
        res.json({
            success: true,
            vault: record
        });
    } catch (error) {
        const { status, body } = handleVaultError(error);
        res.status(status).json(body);
    }
});

/**
 * POST /vault/:userId/execute-withdrawal
 * Execute a withdrawal from the vault
 */
router.post('/:userId/execute-withdrawal', authMiddleware, async (req, res) => {
    const userId = req.params.userId as string;
    const auth = (req as AuthRequest).user;

    if (!isAuthorized(auth, userId)) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

    try {
        const record = await executeWithdrawal(userId);
        const response = buildWithdrawalExecutionResponse(record);
        res.status(response.status).json(response.body);
    } catch (error) {
        const { status, body } = handleVaultError(error);
        res.status(status).json(body);
    }
});

export { router as vaultRouter };


