/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@tiltcheck/auth', () => ({
  getDiscordAuthUrl: vi.fn(() => 'https://discord.com/oauth2/authorize'),
  verifyDiscordOAuth: vi.fn(),
  exchangeDiscordCode: vi.fn(),
  createToken: vi.fn(async () => 'mock-jwt-token'),
  createSession: vi.fn(),
  destroySession: vi.fn(() => 'session=; Path=/; HttpOnly'),
  verifySessionCookie: vi.fn(),
  verifyToken: vi.fn(),
  getDiscordAvatarUrl: vi.fn(),
  generateOAuthState: vi.fn(() => 'mock-state'),
}));

const mockGetMetadataByToken = vi.fn();

vi.mock('@magic-sdk/admin', () => ({
  Magic: class {
    users = {
      getMetadataByToken: mockGetMetadataByToken,
    };
  },
}));

vi.mock('@tiltcheck/db', () => ({
  findOrCreateUserByDiscord: vi.fn(),
  findUserByDiscordId: vi.fn(),
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
import { getDiscordConfig } from '../../src/routes/auth.utils.js';
import { createSession, exchangeDiscordCode, getDiscordAuthUrl, verifyDiscordOAuth, verifySessionCookie } from '@tiltcheck/auth';
import { createUser, findOrCreateUserByDiscord, findUserByDiscordId, findUserByEmail, findUserById, updateUser } from '@tiltcheck/db';

const app = express();
app.set('trust proxy', 1);
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
    delete process.env.MAGIC_SECRET_KEY;
    delete process.env.MAGIC_PUBLISHABLE_KEY;
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

    // Without the matching oauth_state cookie, state validation still fails closed.
    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body.error).toBe('Invalid OAuth state or expired session');
  });

  it('does not allow oauth_source cookie alone to bypass missing oauth_state cookie', async () => {
    const response = await request(app)
      .get('/auth/discord/callback?state=random_state&code=dummy')
      .set('Cookie', ['oauth_source=extension']);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid OAuth state or expired session');
  });

  it('forwards OAuth callback params from /login to /callback', async () => {
    const response = await request(app).get('/auth/discord/login?code=abc123&state=ext_mock');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/auth/discord/callback?code=abc123&state=ext_mock');
  });

  it('defaults oauth_source cookie to web when login source is omitted', async () => {
    const response = await request(app).get('/auth/discord/login?redirect=%2Fbeta-tester');

    expect(response.status).toBe(302);
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('oauth_source=web')])
    );
  });

  it('uses the proxied site callback host for web OAuth logins', async () => {
    const response = await request(app)
      .get('/auth/discord/login?source=web&redirect=%2Fbeta-tester')
      .set('X-Forwarded-Proto', 'https')
      .set('X-Forwarded-Host', 'tiltcheck.me');

    expect(response.status).toBe(302);
    expect(vi.mocked(getDiscordAuthUrl)).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUri: 'https://tiltcheck.me/api/auth/discord/callback',
      }),
      expect.stringMatching(/^web_/),
    );
  });

  it('keeps the API host callback for direct web OAuth logins on the API domain', async () => {
    const response = await request(app)
      .get('/auth/discord/login?source=web&redirect=%2Fbeta-tester')
      .set('X-Forwarded-Proto', 'https')
      .set('X-Forwarded-Host', 'api.tiltcheck.me');

    expect(response.status).toBe(302);
    expect(vi.mocked(getDiscordAuthUrl)).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUri: 'https://api.tiltcheck.me/auth/discord/callback',
      }),
      expect.stringMatching(/^web_/),
    );
  });

  it('keeps the canonical API callback for stale hub dashboard redirects', async () => {
    const response = await request(app)
      .get('/auth/discord/login?source=web&redirect=https%3A%2F%2Fhub.tiltcheck.me%2Fdashboard%3Ftab%3Dvault')
      .set('X-Forwarded-Proto', 'https')
      .set('X-Forwarded-Host', 'api.tiltcheck.me');

    expect(response.status).toBe(302);
    expect(vi.mocked(getDiscordAuthUrl)).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUri: 'https://api.tiltcheck.me/auth/discord/callback',
      }),
      expect.stringMatching(/^web_/),
    );
  });

  it('prefers the localhost redirect host for web OAuth during local beta flows', async () => {
    const response = await request(app)
      .get('/auth/discord/login?source=web&redirect=http%3A%2F%2Flocalhost%3A3000%2Fbeta-tester')
      .set('X-Forwarded-Proto', 'https')
      .set('X-Forwarded-Host', 'api.tiltcheck.me');

    expect(response.status).toBe(302);
    expect(vi.mocked(getDiscordAuthUrl)).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUri: 'http://localhost:3000/api/auth/discord/callback',
      }),
      expect.stringMatching(/^web_/),
    );
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

  it('links Discord onto the currently authenticated site account instead of creating a second user', async () => {
    vi.mocked(verifySessionCookie).mockResolvedValueOnce({
      valid: true,
      session: {
        userId: 'site-user-1',
        type: 'user',
        roles: ['user'],
        createdAt: 1,
      },
    } as any);
    vi.mocked(verifyDiscordOAuth).mockResolvedValueOnce({
      valid: true,
      user: {
        id: 'discord-user-link',
        username: 'linked-user',
        avatar: 'avatar-123',
      },
    } as any);
    vi.mocked(findUserById).mockResolvedValueOnce({
      id: 'site-user-1',
      email: 'site@example.com',
      roles: ['user'],
      discord_id: null,
      discord_username: null,
      discord_avatar: null,
      wallet_address: null,
    } as any);
    vi.mocked(findUserByDiscordId).mockResolvedValueOnce(null);
    vi.mocked(updateUser).mockResolvedValueOnce({
      id: 'site-user-1',
      email: 'site@example.com',
      roles: ['user'],
      discord_id: 'discord-user-link',
      discord_username: 'linked-user',
      discord_avatar: 'avatar-123',
      wallet_address: null,
    } as any);
    vi.mocked(createSession).mockResolvedValueOnce({
      cookie: 'session=test; Path=/; HttpOnly',
      token: 'session-token',
    } as any);

    const response = await request(app)
      .get('/auth/discord/callback?state=ext_state_ok&code=abc123')
      .set('Cookie', [
        'oauth_state=ext_state_ok',
        'oauth_source=extension',
        'oauth_opener_origin=chrome-extension://test-ext-id',
      ]);

    expect(response.status).toBe(200);
    expect(findOrCreateUserByDiscord).not.toHaveBeenCalled();
    expect(updateUser).toHaveBeenCalledWith(
      'site-user-1',
      expect.objectContaining({
        discord_id: 'discord-user-link',
        discord_username: 'linked-user',
        discord_avatar: 'avatar-123',
      }),
    );
    expect(response.text).toContain('"discordId":"discord-user-link"');
    expect(response.text).toContain('"email":"site@example.com"');
  });

  it('rejects linking when the Discord account already belongs to a different user', async () => {
    vi.mocked(verifySessionCookie).mockResolvedValueOnce({
      valid: true,
      session: {
        userId: 'site-user-2',
        type: 'user',
        roles: ['user'],
        createdAt: 1,
      },
    } as any);
    vi.mocked(verifyDiscordOAuth).mockResolvedValueOnce({
      valid: true,
      user: {
        id: 'discord-user-conflict',
        username: 'conflicted-user',
        avatar: null,
      },
    } as any);
    vi.mocked(findUserById).mockResolvedValueOnce({
      id: 'site-user-2',
      email: 'site2@example.com',
      roles: ['user'],
      discord_id: null,
      discord_username: null,
      discord_avatar: null,
      wallet_address: null,
    } as any);
    vi.mocked(findUserByDiscordId).mockResolvedValueOnce({
      id: 'other-user',
      email: 'other@example.com',
      roles: ['user'],
      discord_id: 'discord-user-conflict',
      discord_username: 'conflicted-user',
      discord_avatar: null,
      wallet_address: null,
    } as any);

    const response = await request(app)
      .get('/auth/discord/callback?state=ext_state_ok&code=abc123')
      .set('Cookie', [
        'oauth_state=ext_state_ok',
        'oauth_source=extension',
        'oauth_opener_origin=chrome-extension://test-ext-id',
      ]);

    expect(response.status).toBe(409);
    expect(response.text).toContain('already linked to another TiltCheck account');
    expect(updateUser).not.toHaveBeenCalled();
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

  it('accepts legacy discord-bot oauth_source cookie as web', async () => {
    vi.mocked(verifyDiscordOAuth).mockResolvedValueOnce({
      valid: true,
      user: {
        id: 'discord-user-legacy',
        username: 'legacy-user',
        avatar: null,
      },
    } as any);
    vi.mocked(findOrCreateUserByDiscord).mockResolvedValueOnce({
      id: 'user-legacy',
      email: null,
      roles: ['user'],
      discord_username: 'legacy-user',
      discord_avatar: null,
    } as any);
    vi.mocked(createSession).mockResolvedValueOnce({
      cookie: 'session=test; Path=/; HttpOnly',
      token: 'session-token',
    } as any);

    const response = await request(app)
      .get('/auth/discord/callback?state=web_state_ok&code=abc123')
      .set('Cookie', ['oauth_state=web_state_ok', 'oauth_source=discord-bot', 'oauth_redirect=/beta-tester']);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/beta-tester');
  });

  it('returns Magic config only when both keys are configured', async () => {
    let response = await request(app).get('/auth/magic/config');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ enabled: false, publishableKey: null });

    process.env.MAGIC_SECRET_KEY = 'magic-secret';
    process.env.MAGIC_PUBLISHABLE_KEY = 'pk_live_magic';

    response = await request(app).get('/auth/magic/config');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ enabled: true, publishableKey: 'pk_live_magic' });
  });

  it('sanitizes embedded whitespace in Discord redirect env values', () => {
    process.env.TILT_DISCORD_REDIRECT_URI = 'https:// api.tiltcheck.me/auth/discord/callback ';

    const config = getDiscordConfig();

    expect(config.redirectUri).toBe('https://api.tiltcheck.me/auth/discord/callback');
  });

  it('logs in an existing user with Magic and issues the standard JWT', async () => {
    process.env.MAGIC_SECRET_KEY = 'magic-secret';
    mockGetMetadataByToken.mockResolvedValueOnce({ email: 'magic@example.com' });
    vi.mocked(findUserByEmail).mockResolvedValueOnce({
      id: 'user-magic-1',
      email: 'magic@example.com',
      roles: ['user'],
      discord_id: null,
      discord_username: null,
      wallet_address: null,
    } as any);
    vi.mocked(updateUser).mockResolvedValueOnce(undefined as any);
    vi.mocked(createSession).mockResolvedValueOnce({
      cookie: 'session=test; Path=/; HttpOnly',
      token: 'session-token',
    } as any);

    const response = await request(app)
      .post('/auth/magic/login')
      .send({ didToken: 'magic-did-token' });

    expect(response.status).toBe(200);
    expect(mockGetMetadataByToken).toHaveBeenCalledWith('magic-did-token');
    expect(response.body.token).toBe('mock-jwt-token');
    expect(response.body.user).toMatchObject({
      id: 'user-magic-1',
      email: 'magic@example.com',
      displayName: 'magic',
    });
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('returns DB-backed identity details for valid cookie sessions on /auth/me', async () => {
    vi.mocked(verifySessionCookie).mockResolvedValueOnce({
      valid: true,
      session: {
        userId: 'site-user-3',
        type: 'user',
        roles: ['user'],
        discordId: 'discord-user-3',
        discordUsername: 'cookie-user',
        createdAt: 1,
      },
    } as any);
    vi.mocked(findUserById).mockResolvedValueOnce({
      id: 'site-user-3',
      email: 'cookie@example.com',
      roles: ['user'],
      discord_id: 'discord-user-3',
      discord_username: 'cookie-user',
      discord_avatar: null,
      wallet_address: 'wallet-123',
    } as any);

    const response = await request(app)
      .get('/auth/me')
      .set('Cookie', ['tiltcheck_session=session-token']);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      userId: 'site-user-3',
      email: 'cookie@example.com',
      discordId: 'discord-user-3',
      discordUsername: 'cookie-user',
      walletAddress: 'wallet-123',
    });
  });

  it('rejects Magic login when the identity does not include an email', async () => {
    process.env.MAGIC_SECRET_KEY = 'magic-secret';
    mockGetMetadataByToken.mockResolvedValueOnce({ email: null });

    const response = await request(app)
      .post('/auth/magic/login')
      .send({ didToken: 'magic-did-token' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_MAGIC_IDENTITY');
    expect(createUser).not.toHaveBeenCalled();
  });
});
