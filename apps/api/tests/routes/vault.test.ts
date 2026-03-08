import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

let mockUserId = 'user-1';

vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = { id: mockUserId, email: 'u@example.com', roles: ['user'] };
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
}));

vi.mock('@tiltcheck/lockvault', () => lockvaultMock);

import { vaultRouter } from '../../src/routes/vault.js';

const app = express();
app.use(express.json());
app.use('/vault', vaultRouter);

describe('Vault Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = 'user-1';
    lockvaultMock.getVaultBalance.mockReturnValue(0);
    lockvaultMock.getVaultStatus.mockReturnValue([]);
    lockvaultMock.depositToVault.mockReturnValue(10);
    lockvaultMock.lockVault.mockResolvedValue({ id: 'v1' });
    lockvaultMock.unlockVault.mockReturnValue({ id: 'v1', lockedAmountSOL: 1.23 });
    lockvaultMock.getWalletActionLockStatus.mockReturnValue({ locked: false });
  });

  it('returns 403 for cross-user access', async () => {
    const res = await request(app).get('/vault/user-2');
    expect(res.status).toBe(403);
  });

  it('returns vault balance and locks for owner', async () => {
    lockvaultMock.getVaultBalance.mockReturnValue(12.5);
    lockvaultMock.getVaultStatus.mockReturnValue([{ id: 'v1' }]);
    const res = await request(app).get('/vault/user-1');
    expect(res.status).toBe(200);
    expect(res.body.vault.balance).toBe(12.5);
    expect(res.body.vault.locks).toHaveLength(1);
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

  it('validates lock duration', async () => {
    const res = await request(app).post('/vault/user-1/lock').send({ amount: 10, durationMinutes: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid durationMinutes');
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

  it('sets and clears wallet lock', async () => {
    lockvaultMock.setWalletActionLockForUser.mockReturnValue({
      userId: 'user-1',
      lockUntil: Date.now() + 30 * 60_000,
      createdAt: Date.now(),
      reason: 'manual',
    });
    const setRes = await request(app).post('/vault/user-1/wallet-lock').send({ durationMinutes: 30, reason: 'manual' });
    expect(setRes.status).toBe(200);
    expect(lockvaultMock.setWalletActionLockForUser).toHaveBeenCalled();

    const clearRes = await request(app).post('/vault/user-1/wallet-unlock').send({});
    expect(clearRes.status).toBe(200);
    expect(lockvaultMock.clearWalletActionLockForUser).toHaveBeenCalledWith('user-1');
  });
});
