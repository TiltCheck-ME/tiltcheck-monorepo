/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => ({
  verifySessionCookie: vi.fn(async () => ({
    valid: true,
    session: {
      discordId: 'u1',
      discordUsername: 'user1',
    },
  })),
}));

const dbClientMock = vi.hoisted(() => ({
  findUserByDiscordId: vi.fn(async (discordId: string) => ({ id: `db-${discordId}`, discord_id: discordId })),
  findOnboardingByDiscordId: vi.fn(async () => null),
  upsertOnboarding: vi.fn(async () => null),
  getUserBuddies: vi.fn(async () => []),
  getPendingBuddyRequests: vi.fn(async () => []),
  sendBuddyRequest: vi.fn(async () => null),
}));

const databaseMock = vi.hoisted(() => ({
  db: {
    isConnected: vi.fn(() => true),
    getDegenIdentity: vi.fn(async () => null),
    upsertDegenIdentity: vi.fn(async () => null),
  },
}));

const lockvaultMock = vi.hoisted(() => ({
  getVaultStatus: vi.fn(),
  lockVault: vi.fn(),
  unlockVault: vi.fn(),
}));

vi.mock('@tiltcheck/auth', () => authMock);
vi.mock('@tiltcheck/db', () => dbClientMock);
vi.mock('@tiltcheck/database', () => databaseMock);
vi.mock('@tiltcheck/lockvault', () => lockvaultMock);

describe('user-dashboard vault routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.MAGIC_SECRET_KEY = process.env.MAGIC_SECRET_KEY || 'test-magic-key';
    databaseMock.db.isConnected.mockReturnValue(true);
    lockvaultMock.getVaultStatus.mockReturnValue([]);
    lockvaultMock.lockVault.mockResolvedValue({
      id: 'v1',
      userId: 'u1',
      unlockAt: Date.now() + 3600000,
      lockedAmountSOL: 1.5,
      status: 'locked',
      history: [],
    });
    lockvaultMock.unlockVault.mockReturnValue({
      id: 'v1',
      userId: 'u1',
      status: 'unlocked',
      history: [],
    });
  });

  it('returns vault summary using lockvault data', async () => {
    lockvaultMock.getVaultStatus.mockReturnValue([
      {
        id: 'v1',
        status: 'locked',
        unlockAt: Date.now() + 5000,
        lockedAmountSOL: 1.25,
        history: [{ ts: Date.now(), action: 'locked' }],
      },
      {
        id: 'v2',
        status: 'unlocked',
        unlockAt: Date.now() - 5000,
        lockedAmountSOL: 0.75,
        history: [{ ts: Date.now() - 10_000, action: 'unlocked' }],
      },
    ]);
    const { app } = await import('../src/index.js');
    const res = await request(app).get('/api/user/u1/vault');
    expect(res.status).toBe(200);
    expect(res.body.locked).toBe(true);
    expect(res.body.amount).toBeCloseTo(2, 6);
    expect(Array.isArray(res.body.history)).toBe(true);
  });

  it('locks vault through lockvault module', async () => {
    const { app } = await import('../src/index.js');
    const res = await request(app)
      .post('/api/user/u1/vault/lock')
      .send({ amountSol: 1.5, durationMs: 3600000 });
    expect(res.status).toBe(200);
    expect(lockvaultMock.lockVault).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        amountRaw: '1.5 SOL',
        durationRaw: '60m',
        disclaimerAccepted: true,
      }),
    );
  });

  it('rejects unlock when nothing is releasable', async () => {
    lockvaultMock.getVaultStatus.mockReturnValue([
      {
        id: 'v1',
        status: 'locked',
        unlockAt: Date.now() + 100000,
        lockedAmountSOL: 1,
        history: [],
      },
    ]);
    const { app } = await import('../src/index.js');
    const res = await request(app).post('/api/user/u1/vault/unlock').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No vaults ready for release');
  });

  it('unlocks releasable vault', async () => {
    lockvaultMock.getVaultStatus.mockReturnValue([
      {
        id: 'v-ready',
        status: 'locked',
        unlockAt: Date.now() - 1000,
        lockedAmountSOL: 1,
        history: [],
      },
    ]);
    const { app } = await import('../src/index.js');
    const res = await request(app).post('/api/user/u1/vault/unlock').send({});
    expect(res.status).toBe(200);
    expect(lockvaultMock.unlockVault).toHaveBeenCalledWith('u1', 'v-ready');
  });
});
