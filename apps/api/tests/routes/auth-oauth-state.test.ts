import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@tiltcheck/auth', () => ({
  getDiscordAuthUrl: vi.fn(() => 'https://discord.com/oauth2/authorize'),
  verifyDiscordOAuth: vi.fn(),
  createSession: vi.fn(),
  destroySession: vi.fn(() => 'session=; Path=/; HttpOnly'),
  verifySessionCookie: vi.fn(),
  getDiscordAvatarUrl: vi.fn(),
  generateOAuthState: vi.fn(() => 'mock-state'),
}));

vi.mock('@tiltcheck/db', () => ({
  findOrCreateUserByDiscord: vi.fn(),
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  findUserById: vi.fn(),
}));

vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => next(),
  getJWTConfig: vi.fn(() => ({
    secret: 'test-secret',
    issuer: 'test',
    audience: 'test',
    expiresIn: '7d',
  })),
}));

import { authRouter } from '../../src/routes/auth.js';

const app = express();
app.use((req, _res, next) => {
  const cookieHeader = req.headers.cookie || '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((item) => {
    const [rawKey, ...rest] = item.trim().split('=');
    if (!rawKey) return;
    cookies[rawKey] = decodeURIComponent(rest.join('=') || '');
  });
  (req as any).cookies = cookies;
  next();
});
app.use(express.json());
app.use('/auth', authRouter);

describe('Auth callback state/source validation', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    vi.clearAllMocks();
  });

  it('rejects callback when oauth_source cookie mismatches state prefix', async () => {
    const response = await request(app)
      .get('/auth/discord/callback?state=web_abc123&code=dummy')
      .set('Cookie', ['oauth_source=extension']);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid OAuth source');
  });

  it('allows local extension fallback only when state prefix indicates extension', async () => {
    const response = await request(app).get('/auth/discord/callback?state=ext_abc123');

    // State validation passes; it then fails on missing code.
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing authorization code');
  });

  it('does not allow oauth_source cookie alone to bypass missing oauth_state cookie', async () => {
    const response = await request(app)
      .get('/auth/discord/callback?state=random_state&code=dummy')
      .set('Cookie', ['oauth_source=extension']);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid OAuth state');
  });

  it('forwards OAuth callback params from /login to /callback', async () => {
    const response = await request(app).get('/auth/discord/login?code=abc123&state=ext_mock');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/auth/discord/callback?code=abc123&state=ext_mock');
  });
});
