/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@tiltcheck/auth', () => ({
  getDiscordAuthUrl: vi.fn(() => 'https://discord.com/oauth2/authorize'),
  verifyDiscordOAuth: vi.fn(),
  exchangeDiscordCode: vi.fn(),
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
import { createSession, exchangeDiscordCode, verifyDiscordOAuth } from '@tiltcheck/auth';
import { findOrCreateUserByDiscord } from '@tiltcheck/db';

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
    process.env.DISCORD_CLIENT_ID = 'test-client-id';
    process.env.DISCORD_CLIENT_SECRET = 'test-client-secret';
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
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('Missing authorization code');
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

  it('rejects invalid activity token exchange payload', async () => {
    const response = await request(app)
      .post('/auth/discord/activity/token')
      .send({ code: 'bad' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_CODE');
  });

  it('exchanges activity code and returns Discord token payload', async () => {
    vi.mocked(exchangeDiscordCode).mockResolvedValueOnce({
      success: true,
      tokens: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        scope: 'identify',
      },
    });

    const response = await request(app)
      .post('/auth/discord/activity/token')
      .send({
        code: 'mock-authorization-code-12345',
        redirectUri: 'http://localhost:5173/tools/daad.html',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      access_token: 'mock-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'identify',
    });
  });

  it('fails closed for extension callback when trusted opener origin is missing', async () => {
    vi.mocked(verifyDiscordOAuth).mockResolvedValueOnce({
      valid: true,
      user: {
        id: 'discord-user-1',
        username: 'tester',
        avatar: null,
      },
    } as any);
    vi.mocked(findOrCreateUserByDiscord).mockResolvedValueOnce({
      id: 'user-1',
      email: null,
      roles: ['user'],
      discord_username: 'tester',
      discord_avatar: null,
    } as any);
    vi.mocked(createSession).mockResolvedValueOnce({
      cookie: 'session=test; Path=/; HttpOnly',
      token: 'session-token',
    } as any);

    const response = await request(app)
      .get('/auth/discord/callback?state=ext_state_ok&code=abc123')
      .set('Cookie', ['oauth_state=ext_state_ok', 'oauth_source=extension']);

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('Missing trusted extension origin');
  });

  it('rejects unsafe redirect URL at login entrypoint', async () => {
    const response = await request(app).get('/auth/discord/login?redirect=https://evil.example/pwn');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_REDIRECT');
  });

  it('falls back to default redirect when oauth_redirect cookie is unsafe', async () => {
    vi.mocked(verifyDiscordOAuth).mockResolvedValueOnce({
      valid: true,
      user: {
        id: 'discord-user-2',
        username: 'tester2',
        avatar: null,
      },
    } as any);
    vi.mocked(findOrCreateUserByDiscord).mockResolvedValueOnce({
      id: 'user-2',
      email: null,
      roles: ['user'],
      discord_username: 'tester2',
      discord_avatar: null,
    } as any);
    vi.mocked(createSession).mockResolvedValueOnce({
      cookie: 'session=test; Path=/; HttpOnly',
      token: 'session-token',
    } as any);

    const response = await request(app)
      .get('/auth/discord/callback?state=web_state_ok&code=abc123')
      .set('Cookie', ['oauth_state=web_state_ok', 'oauth_source=web', 'oauth_redirect=https://evil.example/pwn']);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://tiltcheck.me/play/profile.html');
  });
});
