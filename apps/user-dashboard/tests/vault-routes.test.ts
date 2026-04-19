/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

const authMock = vi.hoisted(() => ({
  verifySessionCookie: vi.fn(async () => ({
    valid: true,
    session: {
      discordId: 'u1',
      discordUsername: 'user1',
    },
  })),
  getCookieConfig: vi.fn(() => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
  })),
}));

const dbClientMock = vi.hoisted(() => ({
  findUserByDiscordId: vi.fn(async (discordId: string) => ({ id: `db-${discordId}`, discord_id: discordId })),
  findOnboardingByDiscordId: vi.fn(async () => null),
  upsertOnboarding: vi.fn(async () => null),
  getAggregatedTrustByDiscordId: vi.fn(async () => ({ total_score: 0, signals_count: 0 })),
  queryOne: vi.fn(async () => null),
}));

const databaseMock = vi.hoisted(() => ({
  db: {
    isConnected: vi.fn(() => true),
    getDegenIdentity: vi.fn(async () => null),
    upsertDegenIdentity: vi.fn(async () => null),
  },
}));

vi.mock('@tiltcheck/auth', () => authMock);
vi.mock('@tiltcheck/db', () => dbClientMock);
vi.mock('@tiltcheck/database', () => databaseMock);
vi.mock('@tiltcheck/agent', () => ({
  runner: {
    runAsync: vi.fn(async function* () {
      yield { content: { parts: [{ text: 'ok' }] } };
    }),
  },
}));

describe('user-dashboard safety control routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.MAGIC_SECRET_KEY = process.env.MAGIC_SECRET_KEY || 'test-magic-key';
    process.env.TILT_API_BASE_URL = 'https://api.test';
  });

  it('returns canonical vault summary using the API payload', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      success: true,
      vault: {
        balance: 4.5,
        locks: [
          {
            id: 'v-active',
            status: 'locked',
            unlockAt: Date.now() + 60_000,
            createdAt: Date.now() - 60_000,
            lockedAmountSOL: 1.25,
          },
          {
            id: 'v-old',
            status: 'unlocked',
            unlockAt: Date.now() - 10_000,
            createdAt: Date.now() - 120_000,
            lockedAmountSOL: 0.75,
          },
        ],
      },
      walletLock: {
        locked: true,
        remainingMs: 90_000,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const { app } = await import('../src/index.js');
    const res = await request(app).get('/api/user/u1/vault').set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/vault/u1',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    expect(res.body.locked).toBe(true);
    expect(res.body.amount).toBeCloseTo(1.25, 6);
    expect(res.body.balance).toBeCloseTo(4.5, 6);
    expect(res.body.walletLock.locked).toBe(true);
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(res.body.secondOwnerId).toBeNull();
  });

  it('forwards lock requests to the canonical vault API contract', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      success: true,
      vault: {
        id: 'v1',
        unlockAt: Date.now() + 3_600_000,
        lockedAmountSOL: 1.5,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const { app } = await import('../src/index.js');
    const res = await request(app)
      .post('/api/user/u1/vault/lock')
      .set('Authorization', 'Bearer test-token')
      .send({ amountSol: 1.5, durationMs: 3_600_000 });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/vault/u1/lock',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          amount: 1.5,
          durationMinutes: 60,
          reason: 'Dashboard safety lock',
        }),
      }),
    );
    expect(res.body.success).toBe(true);
  });

  it('proxies exclusions through the canonical user API', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      success: true,
      data: {
        exclusions: [
          { id: 'e1', category: 'slots', createdAt: new Date().toISOString() },
        ],
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const { app } = await import('../src/index.js');
    const res = await request(app)
      .get('/api/user/u1/exclusions')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/user/u1/exclusions',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    expect(res.body.data.exclusions).toHaveLength(1);
  });

  it('proxies exclusion taxonomy through the canonical user API', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      success: true,
      data: {
        modes: [
          { value: 'category', label: 'Category' },
          { value: 'provider', label: 'Provider' },
        ],
        categories: [
          { value: 'slots', label: 'Slots' },
        ],
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const { app } = await import('../src/index.js');
    const res = await request(app)
      .get('/api/user/exclusions/taxonomy')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/user/exclusions/taxonomy',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    expect(res.body.data.modes).toHaveLength(2);
  });

  it('forwards withdrawal approval queue requests to the canonical vault API', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      success: true,
      approvals: [
        {
          id: 'v1',
          userId: 'owner-1',
          lockedAmountSOL: 2,
          withdrawalProposal: {
            amountSOL: 0.5,
            status: 'pending',
          },
        },
      ],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const { app } = await import('../src/index.js');
    const res = await request(app)
      .get('/api/user/u1/vault/approvals')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/vault/u1/withdrawal-approvals',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    expect(res.body.approvals).toHaveLength(1);
  });

  it('forwards approval decisions for assigned co-owners', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      success: true,
      vault: {
        id: 'v1',
        withdrawalProposal: {
          status: 'approved',
        },
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const { app } = await import('../src/index.js');
    const res = await request(app)
      .post('/api/user/u1/vault/approvals/owner-9/approve')
      .set('Authorization', 'Bearer test-token')
      .send({});

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/vault/owner-9/approve-withdrawal',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(res.body.success).toBe(true);
  });

  it('declines buddy requests through the canonical user API contract', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const { app } = await import('../src/index.js');
    const res = await request(app)
      .post('/api/user/u1/buddies/r-1/decline')
      .set('Authorization', 'Bearer test-token')
      .send({});

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/user/u1/buddies/decline',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ requestId: 'r-1' }),
      }),
    );
  });
});
