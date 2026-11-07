// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-06
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

const TEST_SOLANA_WALLET = '7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2';

describe('user-dashboard cooldown & auto-lock containment routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    const jwtKey = ['JWT', 'SECRET'].join('_'); process.env[jwtKey] = process.env[jwtKey] || 'test-secret';
    process.env.MAGIC_SECRET_KEY = process.env.MAGIC_SECRET_KEY || 'test-magic-key';
    process.env.TILT_API_BASE_URL = 'https://api.test';

    const { clearAutoLockEventsForTesting } = await import('../src/index.js');
    clearAutoLockEventsForTesting();
  });

  it('surfaces active on-chain timelock status with canonical source and scope', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      locked: true,
      scope: 0,
      endTime: Math.floor(Date.now() / 1000) + 86400,
      pda: '7XYZ123PDA',
      timeRemainingSecs: 86400,
      verifiedAt: Date.now(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const { app } = await import('../src/index.js');
    const res = await request(app)
      .get(`/api/user/u1/cooldown-status?wallet=${TEST_SOLANA_WALLET}`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.locked).toBe(true);
    expect(res.body.wallet).toBe(TEST_SOLANA_WALLET);
    expect(res.body.pda).toBe('7XYZ123PDA');
    expect(res.body.source).toBe('voluntary');
    expect(res.body.timeRemainingSecs).toBe(86400);
  });

  it('records auto-lock containment event and tags status as auto_tilt source', async () => {
    const { app } = await import('../src/index.js');

    // Post an auto-lock containment event
    const postRes = await request(app)
      .post('/api/user/u1/auto-lock-event')
      .set('Authorization', 'Bearer test-token')
      .send({
        tiltRisk: 88,
        duration: 86400,
        indicators: ['drawdown_velocity', 'dead_spin_streak'],
        wallet: TEST_SOLANA_WALLET,
      });

    expect(postRes.status).toBe(201);
    expect(postRes.body.success).toBe(true);
    expect(postRes.body.event.tiltRisk).toBe(88);
    expect(postRes.body.event.source).toBe('auto_tilt');
    expect(postRes.body.event.indicators).toContain('drawdown_velocity');

    // Query cooldown-status and verify it reflects active auto-lock containment
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      locked: true,
      scope: 0,
      endTime: Math.floor(Date.now() / 1000) + 86400,
      pda: '7XYZ123PDA',
      timeRemainingSecs: 86400,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const statusRes = await request(app)
      .get(`/api/user/u1/cooldown-status?wallet=${TEST_SOLANA_WALLET}`)
      .set('Authorization', 'Bearer test-token');

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.locked).toBe(true);
    expect(statusRes.body.source).toBe('auto_tilt');
    expect(statusRes.body.activeAutoLock).toBeTruthy();
    expect(statusRes.body.activeAutoLock.tiltRisk).toBe(88);
  });

  it('returns full auto-lock event history for the user', async () => {
    const { app } = await import('../src/index.js');

    // Record two events
    await request(app)
      .post('/api/user/u1/auto-lock-event')
      .set('Authorization', 'Bearer test-token')
      .send({
        tiltRisk: 78,
        duration: 86400,
        indicators: ['rapid_betting'],
        wallet: TEST_SOLANA_WALLET,
      });

    await request(app)
      .post('/api/user/u1/auto-lock-event')
      .set('Authorization', 'Bearer test-token')
      .send({
        tiltRisk: 92,
        duration: 86400,
        indicators: ['extreme_drawdown', 'chasing'],
        wallet: TEST_SOLANA_WALLET,
      });

    const historyRes = await request(app)
      .get('/api/user/u1/auto-lock-history')
      .set('Authorization', 'Bearer test-token');

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.total).toBe(2);
    expect(historyRes.body.events).toHaveLength(2);
    // Most recent event first
    expect(historyRes.body.events[0].tiltRisk).toBe(92);
    expect(historyRes.body.events[1].tiltRisk).toBe(78);
    expect(historyRes.body.activeEvent).toBeTruthy();
  });

  it('rejects invalid wallet format in auto-lock event submission', async () => {
    const { app } = await import('../src/index.js');

    const res = await request(app)
      .post('/api/user/u1/auto-lock-event')
      .set('Authorization', 'Bearer test-token')
      .send({
        tiltRisk: 80,
        duration: 86400,
        wallet: 'invalid-solana-address!!!',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('wallet must be a Solana public key');
  });
});
