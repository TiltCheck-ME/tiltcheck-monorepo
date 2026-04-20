/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-20 */
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

vi.mock('@tiltcheck/auth', () => ({
  verifySessionCookie: vi.fn(async () => ({
    valid: false,
    session: null,
  })),
  getCookieConfig: vi.fn(() => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
  })),
}));

vi.mock('@tiltcheck/db', () => ({
  findUserByDiscordId: vi.fn(async () => null),
  findOnboardingByDiscordId: vi.fn(async () => null),
  upsertOnboarding: vi.fn(async () => null),
  getAggregatedTrustByDiscordId: vi.fn(async () => null),
  queryOne: vi.fn(async () => null),
}));

vi.mock('@tiltcheck/database', () => ({
  db: {
    isConnected: vi.fn(() => false),
    getDegenIdentity: vi.fn(async () => null),
    upsertDegenIdentity: vi.fn(async () => null),
  },
}));

vi.mock('@tiltcheck/agent', () => ({
  runner: {
    runAsync: vi.fn(async function* () {
      yield { content: { parts: [{ text: 'ok' }] } };
    }),
  },
}));

describe('user-dashboard canonical host redirect', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'test-secret';
    process.env.MAGIC_SECRET_KEY = 'test-magic-key';
    process.env.TILT_API_BASE_URL = 'https://api.test';
  });

  it('redirects stale hub host traffic to dashboard.tiltcheck.me', async () => {
    const { app } = await import('../src/index.js');
    const res = await request(app)
      .get('/dashboard?tab=vault')
      .redirects(0)
      .set('Host', 'hub.tiltcheck.me');

    expect(res.status).toBe(308);
    expect(res.headers.location).toBe('https://dashboard.tiltcheck.me/dashboard?tab=vault');
  }, 15000);
});
