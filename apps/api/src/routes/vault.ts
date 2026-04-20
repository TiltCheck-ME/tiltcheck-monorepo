/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
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
  setVaultGuardians,
  addSecondOwner,
  getWithdrawalApprovalsForUser,
  initiateWithdrawal,
  approveWithdrawal,
  executeWithdrawal
} from '@tiltcheck/lockvault';

const router: Router = Router();

interface VaultError extends Error {
  code?: string;
  httpStatus?: number;
}

function normalizeVaultAmount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 1_000_000_000) / 1_000_000_000 : 0;
}

function getSerializedReleasedAmountSOL(vault: any): number {
  if (Number.isFinite(vault?.releasedAmountSOL)) {
    return normalizeVaultAmount(vault.releasedAmountSOL);
  }
  if (vault?.status === 'unlocked' || vault?.status === 'emergency-unlocked') {
    return normalizeVaultAmount(vault?.lockedAmountSOL);
  }
  return 0;
}

function serializeUnlockSchedule(schedule: any): Array<Record<string, unknown>> {
  if (!Array.isArray(schedule)) return [];
  return schedule
    .map((tranche) => ({
      id: tranche?.id ?? null,
      amountSOL: normalizeVaultAmount(tranche?.amountSOL),
      unlockAt: tranche?.unlockAt ? new Date(tranche.unlockAt).toISOString() : null,
      offsetMinutes: Number.isFinite(tranche?.offsetMs) ? Math.trunc(Number(tranche.offsetMs) / 60000) : null,
      status: tranche?.status === 'released' ? 'released' : 'pending',
      releasedAt: tranche?.releasedAt ? new Date(tranche.releasedAt).toISOString() : null,
      label: typeof tranche?.label === 'string' ? tranche.label : null,
    }))
    .filter((tranche) => tranche.amountSOL > 0);
}

function normalizeGuardianIds(value: unknown, legacySecondOwnerId?: unknown): string[] {
  const values = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const guardianIds: string[] = [];
  for (const entry of values) {
    const guardianId = typeof entry === 'string' ? entry.trim() : '';
    if (!guardianId || seen.has(guardianId)) continue;
    seen.add(guardianId);
    guardianIds.push(guardianId);
  }
  if (guardianIds.length > 0) {
    return guardianIds;
  }
  if (typeof legacySecondOwnerId === 'string' && legacySecondOwnerId.trim()) {
    return [legacySecondOwnerId.trim()];
  }
  return [];
}

function normalizeApprovalThreshold(value: unknown, guardianCount: number): number {
  if (guardianCount <= 0) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return guardianCount;
  }
  return Math.max(1, Math.min(guardianCount, Math.trunc(parsed)));
}

function serializeWithdrawalProposal(vault: any) {
  const proposal = vault?.withdrawalProposal;
  if (!proposal) return null;

  const proposalGuardianIds = normalizeGuardianIds(proposal?.guardianIds);
  const fallbackGuardianIds = proposalGuardianIds.length > 0
    ? proposalGuardianIds
    : normalizeGuardianIds(vault?.guardianIds, vault?.secondOwnerId);
  const approvalThreshold = normalizeApprovalThreshold(
    proposal?.approvalThreshold ?? vault?.approvalThreshold,
    fallbackGuardianIds.length,
  );
  const approvals = Array.isArray(proposal?.approvals)
    ? proposal.approvals
        .map((approval: any) => ({
          guardianId: typeof approval?.guardianId === 'string' ? approval.guardianId : null,
          approvedAt: approval?.approvedAt ? new Date(approval.approvedAt).toISOString() : null,
        }))
        .filter((approval: any) => typeof approval.guardianId === 'string' && approval.guardianId.length > 0)
    : [];
  const approvedGuardianIds = approvals.map((approval: any) => approval.guardianId);
  const pendingGuardianIds = fallbackGuardianIds.filter((guardianId) => !approvedGuardianIds.includes(guardianId));

  return {
    ...proposal,
    amountSOL: normalizeVaultAmount(proposal?.amountSOL),
    initiatedAt: proposal?.initiatedAt ? new Date(proposal.initiatedAt).toISOString() : null,
    guardianIds: fallbackGuardianIds,
    approvalThreshold,
    approvals,
    approvalCount: approvals.length,
    remainingApprovals: Math.max(0, approvalThreshold - approvals.length),
    pendingGuardianIds,
    readyToExecute: proposal?.status === 'approved',
    approvedAt: proposal?.approvedAt ? new Date(proposal.approvedAt).toISOString() : null,
    executionRequestedAt: proposal?.executionRequestedAt ? new Date(proposal.executionRequestedAt).toISOString() : null,
    executionTimeoutAt: proposal?.executionTimeoutAt ? new Date(proposal.executionTimeoutAt).toISOString() : null,
    lastRecoveryAt: proposal?.lastRecoveryAt ? new Date(proposal.lastRecoveryAt).toISOString() : null,
    executedAt: proposal?.executedAt ? new Date(proposal.executedAt).toISOString() : null,
  };
}

function serializeVaultRecord(vault: any) {
  const lockedAmountSOL = normalizeVaultAmount(vault?.lockedAmountSOL);
  const releasedAmountSOL = getSerializedReleasedAmountSOL(vault);
  const lockedRemainderSOL = normalizeVaultAmount(Math.max(0, lockedAmountSOL - releasedAmountSOL));
  const unlockSchedule = serializeUnlockSchedule(vault?.unlockSchedule);
  const nextUnlockAt = unlockSchedule.find((tranche) => tranche.status === 'pending')?.unlockAt ?? null;
  const guardianIds = normalizeGuardianIds(vault?.guardianIds, vault?.secondOwnerId);
  const approvalThreshold = normalizeApprovalThreshold(vault?.approvalThreshold, guardianIds.length);

  return {
    ...vault,
    createdAt: vault?.createdAt ? new Date(vault.createdAt).toISOString() : null,
    unlockAt: vault?.unlockAt ? new Date(vault.unlockAt).toISOString() : null,
    lockedAmountSOL,
    originalLockedAmountSOL: normalizeVaultAmount(vault?.originalLockedAmountSOL ?? lockedAmountSOL),
    releasedAmountSOL,
    availableToWithdrawSOL: releasedAmountSOL,
    lockedRemainderSOL,
    withdrawnAmountSOL: normalizeVaultAmount(vault?.withdrawnAmountSOL),
    stagedUnlockEnabled: unlockSchedule.length > 0,
    nextUnlockAt,
    readyToRelease: releasedAmountSOL > 0,
    fullyUnlocked: lockedRemainderSOL <= 0.000000001,
    guardianIds,
    guardianCount: guardianIds.length,
    approvalThreshold,
    primaryGuardianId: guardianIds[0] ?? null,
    secondOwnerId: guardianIds[0] ?? null,
    withdrawalProposal: serializeWithdrawalProposal(vault),
    unlockSchedule,
  };
}

function parseGuardianConfigBody(body: any): { guardianIds: string[]; approvalThreshold: number } | null {
  const guardianIds = normalizeGuardianIds(body?.guardianIds, body?.secondOwnerId);
  if (guardianIds.length === 0) {
    return null;
  }
  const approvalThreshold = normalizeApprovalThreshold(
    body?.approvalThreshold ?? (body?.secondOwnerId ? 1 : guardianIds.length),
    guardianIds.length,
  );
  return { guardianIds, approvalThreshold };
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
  const serializedRecord = serializeVaultRecord(record);
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
        vault: serializedRecord,
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
        vault: serializedRecord,
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      withdrawalExecuted: proposal?.status === 'executed',
      executionRequestId: proposal?.executionRequestId ?? null,
      vault: serializedRecord,
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
  const locks = getVaultStatus(userId).map(serializeVaultRecord);
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
  const activeLock = locks.map(serializeVaultRecord).find((v) =>
    (v.status === 'locked' || v.status === 'extended' || v.status === 'partially-unlocked') &&
    Number(v.lockedRemainderSOL) > 0
  );

  if (!activeLock) {
    res.json({ success: true, locked: false });
    return;
  }

  res.json({
    success: true,
    locked: true,
    amount: activeLock.lockedRemainderSOL,
    amountUnit: 'SOL',
    unlockTime: activeLock.nextUnlockAt || activeLock.unlockAt,
    finalUnlockTime: activeLock.unlockAt,
    createdAt: activeLock.createdAt,
    id: activeLock.id,
    readyToRelease: activeLock.readyToRelease,
    releasedAmountSOL: activeLock.releasedAmountSOL,
    lockedRemainderSOL: activeLock.lockedRemainderSOL,
    nextUnlockAt: activeLock.nextUnlockAt,
    unlockSchedule: activeLock.unlockSchedule,
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
  const { amount, durationMinutes, reason, unlockSchedule } = req.body;
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
  if (unlockSchedule !== undefined && !Array.isArray(unlockSchedule)) {
    res.status(400).json({ error: 'unlockSchedule must be an array when provided' });
    return;
  }

  try {
    const normalizedUnlockSchedule = Array.isArray(unlockSchedule)
      ? unlockSchedule.map((entry, index) => {
          const trancheAmount = Number(entry?.amount);
          const offsetMinutes = Number(entry?.offsetMinutes);
          if (!Number.isFinite(trancheAmount) || trancheAmount <= 0) {
            throw new Error(`unlockSchedule[${index}].amount must be a positive number`);
          }
          if (!Number.isFinite(offsetMinutes) || offsetMinutes <= 0) {
            throw new Error(`unlockSchedule[${index}].offsetMinutes must be a positive number`);
          }
          if (offsetMinutes > parsedDurationMinutes) {
            throw new Error(`unlockSchedule[${index}].offsetMinutes cannot exceed durationMinutes`);
          }
          return {
            amountRaw: `${trancheAmount} SOL`,
            offsetMinutes: Math.trunc(offsetMinutes),
            label: typeof entry?.label === 'string' && entry.label.trim() ? entry.label.trim() : undefined,
          };
        })
      : undefined;

    const record = await lockVault({
      userId,
      amountRaw: `${parsedAmount} SOL`,
      durationRaw: `${Math.trunc(parsedDurationMinutes)}m`,
      reason: reason || 'Manual Lock',
      currencyHint: 'SOL',
      disclaimerAccepted: true,
      unlockSchedule: normalizedUnlockSchedule,
    });

    res.json({
      success: true,
      vault: serializeVaultRecord(record)
    });
  } catch (error) {
    const handled = handleVaultError(error);
    res.status(handled.status).json(handled.body);
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
      const ready = getVaultStatus(userId)
        .map(serializeVaultRecord)
        .find((v) =>
          Number(v.availableToWithdrawSOL) > 0 ||
          (typeof v.unlockAt === 'string' && new Date(v.unlockAt).getTime() <= Date.now())
        );
      if (!ready) {
        res.status(400).json({ error: 'No vaults ready for release' });
        return;
      }
      targetVaultId = ready.id;
    }

    const record = unlockVault(userId, targetVaultId);
    const serializedRecord = serializeVaultRecord(record);
    
    res.json({
      success: true,
      amount: serializedRecord.availableToWithdrawSOL,
      amountUnit: 'SOL',
      vault: serializedRecord
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

/**
 * POST /vault/:userId/guardians
 * Configure withdrawal guardians for the latest vault
 */
router.post('/:userId/guardians', authMiddleware, async (req, res) => {
    const userId = param(req, 'userId');
    const auth = (req as AuthRequest).user;
    const guardianConfig = parseGuardianConfigBody(req.body);

    if (!isAuthorized(auth, userId)) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    if (!guardianConfig) {
      res.status(400).json({ error: 'guardianIds must contain at least one withdrawal guardian Discord ID' });
      return;
    }

    try {
      const record = await setVaultGuardians(userId, guardianConfig.guardianIds, guardianConfig.approvalThreshold);
      res.json({
        success: true,
        vault: serializeVaultRecord(record)
      });
    } catch (error) {
      const { status, body } = handleVaultError(error);
      res.status(status).json(body);
    }
});

/**
 * POST /vault/:userId/add-second-owner
 * Legacy alias to configure a single withdrawal guardian
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
        res.status(400).json({ error: 'Invalid secondOwnerId. Use guardianIds for new clients.' });
        return;
    }

    try {
        const record = await addSecondOwner(userId, secondOwnerId);
        res.json({
            success: true,
            vault: serializeVaultRecord(record)
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
            vault: serializeVaultRecord(record)
        });
    } catch (error) {
        const { status, body } = handleVaultError(error);
        res.status(status).json(body);
    }
});

/**
 * GET /vault/:userId/withdrawal-approvals
 * List owner vaults that need the authenticated user's approval
 */
router.get('/:userId/withdrawal-approvals', authMiddleware, async (req, res) => {
    const userId = req.params.userId as string;
    const auth = (req as AuthRequest).user;

    if (!isAuthorized(auth, userId)) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const approvals = getWithdrawalApprovalsForUser(userId).map((vault) => ({
      ...serializeVaultRecord(vault),
    }));

    res.json({
      success: true,
      approvals,
    });
});

/**
 * POST /vault/:userId/approve-withdrawal
 * Approve a withdrawal from the vault
 */
router.post('/:userId/approve-withdrawal', authMiddleware, async (req, res) => {
    const userId = req.params.userId as string;
    const auth = (req as AuthRequest).user;

    const approverId = (auth as any)?.discordId || auth?.id;
    if (!approverId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const record = await approveWithdrawal(userId, approverId);
        res.json({
            success: true,
            vault: serializeVaultRecord(record)
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


