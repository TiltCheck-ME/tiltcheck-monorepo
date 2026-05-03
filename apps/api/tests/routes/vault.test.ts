/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

let mockUserId = 'user-1';
let mockRoles = ['user'];

vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = { id: mockUserId, email: 'u@example.com', roles: mockRoles };
    next();
  },
}));

const lockvaultMock = vi.hoisted(() => ({
  lockVault: vi.fn(),
  unlockVault: vi.fn(),
  getVaultStatus: vi.fn(),
  depositToVault: vi.fn(),
  getVaultBalance: vi.fn(),
  setWalletActionLockForUser: vi.fn(),
  clearWalletActionLockForUser: vi.fn(),
  getWalletActionLockStatus: vi.fn(),
  requestAdminWalletUnlockForUser: vi.fn(),
  approveAdminWalletUnlockForUser: vi.fn(),
  requestPaidWalletUnlockForUser: vi.fn(),
  settlePaidWalletUnlockForUser: vi.fn(),
  setVaultGuardians: vi.fn(),
  addSecondOwner: vi.fn(),
  getWithdrawalApprovalsForUser: vi.fn(),
  initiateWithdrawal: vi.fn(),
  approveWithdrawal: vi.fn(),
  executeWithdrawal: vi.fn(),
}));

vi.mock('@tiltcheck/lockvault', () => lockvaultMock);

import { vaultRouter } from '../../src/routes/vault.js';

function createVaultError(message: string, code: string, httpStatus: number) {
  const error = new Error(message) as Error & { code?: string; httpStatus?: number };
  error.code = code;
  error.httpStatus = httpStatus;
  return error;
}

const app = express();
app.use(express.json());
app.use('/vault', vaultRouter);

describe('Vault Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = 'user-1';
    mockRoles = ['user'];
    lockvaultMock.getVaultBalance.mockReturnValue(0);
    lockvaultMock.getVaultStatus.mockReturnValue([]);
    lockvaultMock.depositToVault.mockReturnValue(10);
    lockvaultMock.lockVault.mockResolvedValue({
      id: 'v1',
      status: 'locked',
      createdAt: Date.now(),
      unlockAt: Date.now() + 60 * 60_000,
      lockedAmountSOL: 1.5,
      releasedAmountSOL: 0,
      originalLockedAmountSOL: 1.5,
      withdrawnAmountSOL: 0,
    });
    lockvaultMock.unlockVault.mockReturnValue({
      id: 'v1',
      status: 'unlocked',
      createdAt: Date.now(),
      unlockAt: Date.now() - 1000,
      lockedAmountSOL: 1.23,
      releasedAmountSOL: 1.23,
      originalLockedAmountSOL: 1.23,
      withdrawnAmountSOL: 0,
    });
    lockvaultMock.getWalletActionLockStatus.mockReturnValue({ locked: false });
    lockvaultMock.requestAdminWalletUnlockForUser.mockReturnValue({
      userId: 'user-1',
      lockUntil: Date.now() + 30 * 60_000,
      createdAt: Date.now(),
      earlyUnlockRequest: { mode: 'admin_approval', status: 'pending' },
    });
    lockvaultMock.approveAdminWalletUnlockForUser.mockReturnValue({
      userId: 'user-1',
      lockUntil: Date.now() + 30 * 60_000,
      createdAt: Date.now(),
      earlyUnlockRequest: { mode: 'admin_approval', status: 'approved' },
    });
    lockvaultMock.setVaultGuardians.mockResolvedValue({
      id: 'v1',
      guardianIds: ['user-2', 'user-3'],
      approvalThreshold: 2,
    });
    lockvaultMock.addSecondOwner.mockResolvedValue({ id: 'v1', secondOwnerId: 'user-2' });
    lockvaultMock.getWithdrawalApprovalsForUser.mockReturnValue([]);
    lockvaultMock.initiateWithdrawal.mockResolvedValue({
      id: 'v1',
      guardianIds: ['user-2', 'user-3'],
      approvalThreshold: 2,
      withdrawalProposal: {
        status: 'pending',
        guardianIds: ['user-2', 'user-3'],
        approvalThreshold: 2,
        approvals: [],
      },
    });
    lockvaultMock.approveWithdrawal.mockResolvedValue({
      id: 'v1',
      guardianIds: ['user-2', 'user-3'],
      approvalThreshold: 2,
      withdrawalProposal: {
        status: 'approved',
        guardianIds: ['user-2', 'user-3'],
        approvalThreshold: 2,
        approvals: [
          { guardianId: 'user-2', approvedAt: Date.now() - 1000 },
          { guardianId: 'user-3', approvedAt: Date.now() },
        ],
        approvedBy: 'user-3',
      },
    });
    lockvaultMock.executeWithdrawal.mockResolvedValue({
      id: 'v1',
      lockedAmountSOL: 0.5,
      releasedAmountSOL: 0.5,
      originalLockedAmountSOL: 1.25,
      withdrawnAmountSOL: 0.75,
      guardianIds: ['user-2', 'user-3'],
      approvalThreshold: 2,
      withdrawalProposal: {
        status: 'executed',
        executionRequestId: 'req-1',
        amountSOL: 0.75,
        executedBy: 'user-1',
        guardianIds: ['user-2', 'user-3'],
        approvalThreshold: 2,
        approvals: [
          { guardianId: 'user-2', approvedAt: Date.now() - 1000 },
          { guardianId: 'user-3', approvedAt: Date.now() },
        ],
      },
    });
  });

  it('returns 403 for cross-user access', async () => {
    const res = await request(app).get('/vault/user-2');
    expect(res.status).toBe(403);
  });

  it('returns vault balance and locks for owner', async () => {
    lockvaultMock.getVaultBalance.mockReturnValue(12.5);
    lockvaultMock.getVaultStatus.mockReturnValue([{
      id: 'v1',
      guardianIds: ['user-2', 'user-3'],
      approvalThreshold: 2,
      withdrawalProposal: {
        status: 'pending',
        amountSOL: 0.75,
        guardianIds: ['user-2', 'user-3'],
        approvalThreshold: 2,
        approvals: [
          { guardianId: 'user-2', approvedAt: Date.now() - 1000 },
        ],
      },
    }]);
    const res = await request(app).get('/vault/user-1');
    expect(res.status).toBe(200);
    expect(res.body.vault.balance).toBe(12.5);
    expect(res.body.vault.locks).toHaveLength(1);
    expect(res.body.vault.locks[0].guardianIds).toEqual(['user-2', 'user-3']);
    expect(res.body.vault.locks[0].approvalThreshold).toBe(2);
    expect(res.body.vault.locks[0].primaryGuardianId).toBe('user-2');
    expect(res.body.vault.locks[0].withdrawalProposal.approvalCount).toBe(1);
    expect(res.body.vault.locks[0].withdrawalProposal.pendingGuardianIds).toEqual(['user-3']);
    expect(res.body.walletLock.locked).toBe(false);
  });

  it('validates deposit amount', async () => {
    const res = await request(app).post('/vault/user-1/deposit').send({ amount: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid amount');
  });

  it('accepts numeric-string deposit and normalizes value', async () => {
    lockvaultMock.depositToVault.mockReturnValue(25);
    const res = await request(app).post('/vault/user-1/deposit').send({ amount: '10.5' });
    expect(res.status).toBe(200);
    expect(lockvaultMock.depositToVault).toHaveBeenCalledWith('user-1', 10.5);
    expect(res.body.vault.balance).toBe(25);
  });

  it('blocks deposit when wallet lock is active', async () => {
    lockvaultMock.getWalletActionLockStatus.mockReturnValue({
      locked: true,
      lockUntil: Date.now() + 5 * 60_000,
      remainingMs: 5 * 60_000,
      reason: 'focus',
    });
    const res = await request(app).post('/vault/user-1/deposit').send({ amount: 10 });
    expect(res.status).toBe(423);
    expect(res.body.code).toBe('WALLET_LOCK_ACTIVE');
    expect(lockvaultMock.depositToVault).not.toHaveBeenCalled();
  });

  it('surfaces domain-level wallet lock errors when the early route check misses', async () => {
    const lockUntil = Date.now() + 5 * 60_000;
    lockvaultMock.getWalletActionLockStatus.mockReturnValueOnce({ locked: false });
    (lockvaultMock.depositToVault as any).mockImplementationOnce(() => {
      const error = createVaultError(
        'Wallet lock is active. Try again after the timer expires.',
        'WALLET_LOCK_ACTIVE',
        423,
      ) as Error & { lockUntil?: number; remainingMs?: number; reason?: string; earlyUnlockRequest?: unknown };
      error.lockUntil = lockUntil;
      error.remainingMs = 5 * 60_000;
      error.reason = 'focus';
      error.earlyUnlockRequest = { mode: 'admin_approval', status: 'pending' };
      throw error;
    });

    const res = await request(app).post('/vault/user-1/deposit').send({ amount: 10 });

    expect(res.status).toBe(423);
    expect(res.body).toMatchObject({
      code: 'WALLET_LOCK_ACTIVE',
      error: 'Wallet lock is active. Try again after the timer expires.',
      remainingMs: 5 * 60_000,
      reason: 'focus',
      earlyUnlockRequest: { mode: 'admin_approval', status: 'pending' },
    });
    expect(res.body.lockUntil).toBe(new Date(lockUntil).toISOString());
  });

  it('validates lock duration', async () => {
    const res = await request(app).post('/vault/user-1/lock').send({ amount: 10, durationMinutes: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid durationMinutes');
  });

  it('surfaces a linked-wallet requirement when lock creation is refused', async () => {
    lockvaultMock.lockVault.mockRejectedValueOnce(
      createVaultError(
        'LockVault requires a linked wallet or Degen Identity before a lock can be created. No server-managed fallback wallet will be created.',
        'LOCKVAULT_IDENTITY_REQUIRED',
        409,
      ),
    );

    const res = await request(app).post('/vault/user-1/lock').send({ amount: 10, durationMinutes: 30 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('LOCKVAULT_IDENTITY_REQUIRED');
    expect(res.body.error).toMatch(/linked wallet or Degen Identity/i);
  });

  it('forwards staged unlock schedule rows to lockVault', async () => {
    const res = await request(app).post('/vault/user-1/lock').send({
      amount: 10,
      durationMinutes: 120,
      unlockSchedule: [
        { amount: 3, offsetMinutes: 60, label: 'midpoint' },
      ],
    });

    expect(res.status).toBe(200);
    expect(lockvaultMock.lockVault).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      unlockSchedule: [
        { amountRaw: '3 SOL', offsetMinutes: 60, label: 'midpoint' },
      ],
    }));
  });

  it('does not report unlocked vault-status as actively locked', async () => {
    lockvaultMock.getVaultStatus.mockReturnValue([
      {
        id: 'v1',
        status: 'unlocked',
        lockedAmountSOL: 0.75,
        unlockAt: Date.now() - 1000,
        createdAt: Date.now() - 2000,
      },
    ]);
    const res = await request(app).get('/vault/user-1/lock-status');
    expect(res.status).toBe(200);
    expect(res.body.locked).toBe(false);
  });

  it('validates release vaultId when provided', async () => {
    const res = await request(app).post('/vault/user-1/release').send({ vaultId: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid vaultId');
  });

  it('auto-selects releasable lock when vaultId omitted', async () => {
    lockvaultMock.getVaultStatus.mockReturnValue([
      {
        id: 'v-ready',
        status: 'extended',
        lockedAmountSOL: 1.2,
        unlockAt: Date.now() - 1000,
        createdAt: Date.now() - 5000,
      },
    ]);
    lockvaultMock.unlockVault.mockReturnValue({ id: 'v-ready', lockedAmountSOL: 1.2 });

    const res = await request(app).post('/vault/user-1/release').send({});
    expect(res.status).toBe(200);
    expect(lockvaultMock.unlockVault).toHaveBeenCalledWith('user-1', 'v-ready');
  });

  it('returns wallet lock status for owner', async () => {
    lockvaultMock.getWalletActionLockStatus.mockReturnValue({
      locked: true,
      lockUntil: Date.now() + 60_000,
      remainingMs: 60_000,
      reason: 'tilt',
    });
    const res = await request(app).get('/vault/user-1/wallet-lock-status');
    expect(res.status).toBe(200);
    expect(res.body.locked).toBe(true);
    expect(typeof res.body.lockUntil).toBe('string');
  });

  it('sets wallet lock and blocks direct early unlock', async () => {
    lockvaultMock.setWalletActionLockForUser.mockReturnValue({
      userId: 'user-1',
      lockUntil: Date.now() + 30 * 60_000,
      createdAt: Date.now(),
      reason: 'manual',
    });
    const setRes = await request(app).post('/vault/user-1/wallet-lock').send({ durationMinutes: 30, reason: 'manual' });
    expect(setRes.status).toBe(200);
    expect(lockvaultMock.setWalletActionLockForUser).toHaveBeenCalled();

    lockvaultMock.getWalletActionLockStatus.mockReturnValue({
      locked: true,
      lockUntil: Date.now() + 30 * 60_000,
      remainingMs: 30 * 60_000,
      reason: 'manual',
    });
    const clearRes = await request(app).post('/vault/user-1/wallet-unlock').send({});
    expect(clearRes.status).toBe(423);
    expect(clearRes.body.code).toBe('WALLET_LOCK_STILL_ACTIVE');
    expect(clearRes.body.unlockOptions).toEqual(['admin_approval']);
    expect(lockvaultMock.clearWalletActionLockForUser).not.toHaveBeenCalled();
  });

  it('creates admin early unlock requests and rejects paid unlock requests', async () => {
    const adminReq = await request(app).post('/vault/user-1/wallet-unlock-request').send({ mode: 'admin_approval' });
    expect(adminReq.status).toBe(200);
    expect(lockvaultMock.requestAdminWalletUnlockForUser).toHaveBeenCalledWith('user-1', 'user-1');

    const paidReq = await request(app).post('/vault/user-1/wallet-unlock-request').send({ mode: 'paid_early_unlock' });
    expect(paidReq.status).toBe(501);
    expect(paidReq.body.code).toBe('FEATURE_NOT_IMPLEMENTED');
    expect(lockvaultMock.requestPaidWalletUnlockForUser).not.toHaveBeenCalled();
  });

  it('requires admin role to approve early unlock', async () => {
    const denied = await request(app).post('/vault/user-1/wallet-unlock-approve').send({});
    expect(denied.status).toBe(403);

    mockRoles = ['user', 'admin'];
    const approved = await request(app).post('/vault/user-1/wallet-unlock-approve').send({});
    expect(approved.status).toBe(200);
    expect(lockvaultMock.approveAdminWalletUnlockForUser).toHaveBeenCalledWith('user-1', 'user-1');
  });

  it('rejects paid early unlock settlement while the fee sink is disabled', async () => {
    const err = createVaultError('disabled', 'FEATURE_NOT_IMPLEMENTED', 501);
    lockvaultMock.settlePaidWalletUnlockForUser.mockImplementationOnce(() => {
      throw err;
    });
    const res = await request(app).post('/vault/user-1/wallet-unlock-pay').send({});
    expect(res.status).toBe(501);
    expect(lockvaultMock.settlePaidWalletUnlockForUser).toHaveBeenCalledWith('user-1', 'user-1');
    expect(res.body.code).toBe('FEATURE_NOT_IMPLEMENTED');
  });

  it('configures guardians and threshold for an authenticated user', async () => {
    const res = await request(app).post('/vault/user-1/guardians').send({
      guardianIds: ['user-2', 'user-3', 'user-4'],
      approvalThreshold: 2,
    });
    expect(res.status).toBe(200);
    expect(lockvaultMock.setVaultGuardians).toHaveBeenCalledWith('user-1', ['user-2', 'user-3', 'user-4'], 2);
  });

  it('keeps the legacy second-owner alias working for an authenticated user', async () => {
    const res = await request(app).post('/vault/user-1/add-second-owner').send({ secondOwnerId: 'user-2' });
    expect(res.status).toBe(200);
    expect(lockvaultMock.addSecondOwner).toHaveBeenCalledWith('user-1', 'user-2');
  });

  it('returns 501 when the legacy second-owner alias is flagged as not implemented', async () => {
    const err = createVaultError('not implemented', 'FEATURE_NOT_IMPLEMENTED', 501);
    lockvaultMock.addSecondOwner.mockRejectedValueOnce(err);
    const res = await request(app).post('/vault/user-1/add-second-owner').send({ secondOwnerId: 'user-2' });
    expect(res.status).toBe(501);
    expect(res.body.code).toBe('FEATURE_NOT_IMPLEMENTED');
  });

  it('initiates, approves, and marks withdrawal execution as pending', async () => {
    const initRes = await request(app).post('/vault/user-1/initiate-withdrawal').send({ amount: 0.75 });
    expect(initRes.status).toBe(200);
    expect(lockvaultMock.initiateWithdrawal).toHaveBeenCalledWith('user-1', 0.75);

    mockUserId = 'user-2';
    const approveRes = await request(app).post('/vault/user-1/approve-withdrawal').send({});
    expect(approveRes.status).toBe(200);
    expect(lockvaultMock.approveWithdrawal).toHaveBeenCalledWith('user-1', 'user-2');

    mockUserId = 'user-1';
    const executeRes = await request(app).post('/vault/user-1/execute-withdrawal').send({});
    expect(executeRes.status).toBe(200);
    expect(lockvaultMock.executeWithdrawal).toHaveBeenCalledWith('user-1');
    expect(executeRes.body.success).toBe(true);
    expect(executeRes.body.withdrawalExecuted).toBe(true);
    expect(executeRes.body.executionRequestId).toBe('req-1');
  });

  it('lists approvals assigned to the authenticated withdrawal guardian', async () => {
    lockvaultMock.getWithdrawalApprovalsForUser.mockReturnValueOnce([
      {
        id: 'v1',
        userId: 'user-9',
        vaultAddress: 'wallet-9',
        vaultType: 'linked',
        unlockAt: Date.now() + 60_000,
        createdAt: Date.now() - 60_000,
        lockedAmountSOL: 2.25,
        guardianIds: ['user-1', 'user-2', 'user-3'],
        approvalThreshold: 2,
        withdrawalProposal: {
          amountSOL: 0.75,
          initiatedAt: Date.now() - 10_000,
          status: 'pending',
          guardianIds: ['user-1', 'user-2', 'user-3'],
          approvalThreshold: 2,
          approvals: [
            { guardianId: 'user-2', approvedAt: Date.now() - 5000 },
          ],
        },
      },
    ]);

    const res = await request(app).get('/vault/user-1/withdrawal-approvals');

    expect(res.status).toBe(200);
    expect(lockvaultMock.getWithdrawalApprovalsForUser).toHaveBeenCalledWith('user-1');
    expect(res.body.approvals).toHaveLength(1);
    expect(res.body.approvals[0].userId).toBe('user-9');
    expect(res.body.approvals[0].withdrawalProposal.approvalCount).toBe(1);
    expect(res.body.approvals[0].withdrawalProposal.pendingGuardianIds).toEqual(['user-1', 'user-3']);
  });
});
