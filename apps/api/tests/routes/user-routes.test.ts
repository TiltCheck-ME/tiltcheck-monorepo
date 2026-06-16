/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-16 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockedDb = vi.hoisted(() => ({
  findOnboardingByDiscordId: vi.fn(),
  upsertOnboarding: vi.fn(),
  findUserByDiscordId: vi.fn(),
  findUserByWallet: vi.fn(),
  updateUser: vi.fn(),
  getAggregatedTrustByDiscordId: vi.fn(),
  getUserBuddies: vi.fn(),
  getPendingBuddyRequests: vi.fn(),
  sendBuddyRequest: vi.fn(),
  acceptBuddyRequest: vi.fn(),
  removeBuddy: vi.fn(),
  getAuditLogsByUser: vi.fn(),
  addExclusion: vi.fn(),
  removeExclusion: vi.fn(),
}));
const mockedExclusionCache = vi.hoisted(() => ({
  getForbiddenGamesProfile: vi.fn(),
  invalidateExclusionCache: vi.fn(),
}));
const mockJttGetBalance = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ total_fees_lamports: 0 }),
);
const mockDiscordGetEntitlements = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockAuthUser = vi.hoisted(() => ({
  id: 'user-1',
  discordId: 'discord-self',
  walletAddress: 'wallet-1',
  roles: [] as string[],
}));
let authEnabled = true;

vi.mock('@tiltcheck/db', () => mockedDb);
vi.mock('../../src/services/exclusion-cache.js', () => mockedExclusionCache);
vi.mock('@tiltcheck/justthetip', () => ({
  justthetip: {
    credits: {
      getBalance: (...args: unknown[]) => mockJttGetBalance(...args),
    },
  },
}));
vi.mock('@tiltcheck/discord-monetization', async () => {
  const actual = await vi.importActual<typeof import('@tiltcheck/discord-monetization')>(
    '@tiltcheck/discord-monetization',
  );
  return {
    ...actual,
    DiscordShopManager: class {
      getEntitlements(...args: unknown[]) {
        return mockDiscordGetEntitlements(...args);
      }
    },
  };
});
vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    if (!authEnabled) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }
    if (!req.user) {
      req.user = { ...mockAuthUser };
    }
    next();
  },
  internalServiceAuth: (_req: any, _res: any, next: any) => {
    next();
  },
}));

import { userRouter } from '../../src/routes/user.js';
import { errorHandler } from '../../src/middleware/error.js';

describe('User route ordering and shape', () => {
  const app = express();
  app.use(express.json());
  app.use('/user', userRouter);
  app.use(errorHandler);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    authEnabled = true;
    mockAuthUser.roles = [];
    mockJttGetBalance.mockResolvedValue({ total_fees_lamports: 0 });
    mockDiscordGetEntitlements.mockResolvedValue([]);
  });

  it('resolves /onboarding before dynamic /:discordId route', async () => {
    mockedDb.findOnboardingByDiscordId.mockResolvedValueOnce(null);

    const response = await request(app).get('/user/onboarding');

    expect(response.status).toBe(200);
    expect(response.body.isOnboarded).toBe(false);
    expect(mockedDb.findOnboardingByDiscordId).toHaveBeenCalledWith('discord-self');
  });

  it('returns canonical profile payload with backward-compatible fields', async () => {
    mockedDb.findUserByDiscordId.mockResolvedValueOnce({
      id: 'u1',
      discord_id: 'discord-self',
      discord_username: 'tester',
      discord_avatar: null,
      wallet_address: 'wallet-1',
      total_redeemed: 12,
      redeem_wins: 3,
      redeem_threshold: 400,
    });
    mockedDb.findOnboardingByDiscordId.mockResolvedValueOnce({
      total_redeemed: 12,
      redeem_threshold: 400,
      risk_level: 'moderate',
      daily_limit: 500,
    });
    mockedDb.getAggregatedTrustByDiscordId.mockResolvedValueOnce({
      total_score: 88,
      signals_count: 21,
    });

    const response = await request(app).get('/user/discord-self');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.discordId).toBe('discord-self');
    expect(response.body.user.discordId).toBe('discord-self');
    expect(response.body.analytics.trustScore).toBe(88);
  });

  it('returns 401 for profile lookup without auth', async () => {
    authEnabled = false;

    const response = await request(app).get('/user/discord-self');

    expect(response.status).toBe(401);
    expect(mockedDb.findUserByDiscordId).not.toHaveBeenCalled();
  });

  it('returns 403 when reading another user profile', async () => {
    const response = await request(app).get('/user/discord-other');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
    expect(mockedDb.findUserByDiscordId).not.toHaveBeenCalled();
  });

  it('returns 401 for activities without auth', async () => {
    authEnabled = false;

    const response = await request(app).get('/user/discord-self/activities');

    expect(response.status).toBe(401);
    expect(mockedDb.findUserByDiscordId).not.toHaveBeenCalled();
  });

  it('returns 401 for wallet lookup without auth', async () => {
    authEnabled = false;

    const response = await request(app).get('/user/lookup/wallet-1');

    expect(response.status).toBe(401);
    expect(mockedDb.findUserByWallet).not.toHaveBeenCalled();
  });

  it('returns 401 for resolve without auth', async () => {
    authEnabled = false;

    const response = await request(app).get('/user/resolve').query({ identity: 'discord-self' });

    expect(response.status).toBe(401);
    expect(mockedDb.findUserByDiscordId).not.toHaveBeenCalled();
  });

  it('returns internal consent state before dynamic discordId lookup', async () => {
    mockedDb.findOnboardingByDiscordId.mockResolvedValueOnce({
      share_message_contents: true,
      share_financial_data: false,
      share_session_telemetry: true,
      notify_nft_identity_ready: false,
      compliance_bypass: false,
    });

    const response = await request(app).get('/user/internal/consents/d1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      messageContents: true,
      financialData: false,
      sessionTelemetry: true,
      notifyNftIdentityReady: false,
      complianceBypass: false,
    });
    expect(mockedDb.findOnboardingByDiscordId).toHaveBeenCalledWith('d1');
  });

  it('GET /user/:id/elite treats founders as fee-waived without Discord entitlements', async () => {
    vi.stubEnv('FOUNDER_USERNAMES', 'whale');
    mockJttGetBalance.mockResolvedValueOnce({ total_fees_lamports: 2_000_000_000 });
    mockedDb.findUserByDiscordId.mockResolvedValueOnce({
      discord_username: 'Whale',
    });

    const response = await request(app).get('/user/discord-123/elite');

    expect(response.status).toBe(200);
    expect(response.body.isElite).toBe(true);
    expect(response.body.feeSavedSol).toBeGreaterThan(0);
    expect(mockDiscordGetEntitlements).not.toHaveBeenCalled();
  });

  it('GET /user/:id/elite uses Discord entitlements when fee waiver SKUs are configured', async () => {
    vi.stubEnv('DISCORD_SKU_JTT_FEE_WAIVER_IDS', 'fee-sku-9');
    vi.stubEnv('DISCORD_BOT_TOKEN', 'bot-test');
    vi.stubEnv('DISCORD_CLIENT_ID', 'app-test');
    mockJttGetBalance.mockResolvedValueOnce({ total_fees_lamports: 1_000_000_000 });
    mockedDb.findUserByDiscordId.mockResolvedValueOnce({
      discord_username: 'normie',
    });
    mockDiscordGetEntitlements.mockResolvedValueOnce([
      { sku_id: 'fee-sku-9', consumed: false, deleted: false },
    ]);

    const response = await request(app).get('/user/discord-456/elite');

    expect(response.status).toBe(200);
    expect(response.body.isElite).toBe(true);
    expect(mockDiscordGetEntitlements).toHaveBeenCalled();
  });

  it('GET /user/:id/elite returns free tier when no founder and no entitlement', async () => {
    vi.stubEnv('FOUNDER_USERNAMES', 'someone_else');
    mockJttGetBalance.mockResolvedValueOnce({ total_fees_lamports: 500_000_000 });
    mockedDb.findUserByDiscordId.mockResolvedValueOnce({
      discord_username: 'normie',
    });

    const response = await request(app).get('/user/discord-789/elite');

    expect(response.status).toBe(200);
    expect(response.body.isElite).toBe(false);
    expect(response.body.feeSavedSol).toBe(0);
  });

  it('gates /upgrade until live payment validation exists', async () => {
    const response = await request(app)
      .post('/user/upgrade')
      .send({ signature: 'signature', tier: 'elite' });

    expect(response.status).toBe(503);
    expect(response.body.code).toBe('PAYMENTS_UNAVAILABLE');
    expect(response.body.error).toContain('temporarily unavailable');
    expect(mockedDb.updateUser).not.toHaveBeenCalled();
  });

  it('allows an authenticated user to read their own exclusions', async () => {
    mockedDb.findUserByDiscordId.mockResolvedValueOnce({
      id: 'user-1',
      discord_id: 'discord-self',
    });
    mockedExclusionCache.getForbiddenGamesProfile.mockResolvedValueOnce({
      userId: 'user-1',
      exclusions: [],
      blockedGameIds: [],
      blockedCategories: [],
      blockedProviders: [],
      blockedCasinos: [],
    });

    const response = await request(app).get('/user/discord-self/exclusions');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        userId: 'user-1',
        exclusions: [],
        blockedGameIds: [],
        blockedCategories: [],
        blockedProviders: [],
        blockedCasinos: [],
      },
    });
    expect(mockedDb.findUserByDiscordId).toHaveBeenCalledWith('discord-self');
    expect(mockedExclusionCache.getForbiddenGamesProfile).toHaveBeenCalledWith('user-1');
  });

  it('blocks an authenticated user from writing exclusions for another Discord identity', async () => {
    const response = await request(app)
      .post('/user/discord-other/exclusions')
      .send({ gameId: 'game-1' });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
    expect(response.body.error).toContain('your own exclusions');
    expect(mockedDb.findUserByDiscordId).not.toHaveBeenCalled();
    expect(mockedDb.addExclusion).not.toHaveBeenCalled();
  });

  it('allows internal service reads with x-internal-secret', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'test-internal-secret');
    mockedDb.findUserByDiscordId.mockResolvedValueOnce({
      id: 'user-2',
      discord_id: 'discord-other',
    });
    mockedExclusionCache.getForbiddenGamesProfile.mockResolvedValueOnce({
      userId: 'user-2',
      exclusions: [],
      blockedGameIds: ['game-2'],
      blockedCategories: [],
      blockedProviders: [],
      blockedCasinos: [],
    });

    const response = await request(app)
      .get('/user/discord-other/exclusions')
      .set('x-internal-secret', 'test-internal-secret');

    expect(response.status).toBe(200);
    expect(response.body.data.userId).toBe('user-2');
    expect(mockedDb.findUserByDiscordId).toHaveBeenCalledWith('discord-other');
    expect(mockedExclusionCache.getForbiddenGamesProfile).toHaveBeenCalledWith('user-2');
  });

  it('allows internal service writes with x-internal-secret', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'test-internal-secret');
    mockedDb.findUserByDiscordId.mockResolvedValueOnce({
      id: 'user-2',
      discord_id: 'discord-other',
    });
    mockedDb.addExclusion.mockResolvedValueOnce({
      id: 'ex-1',
      userId: 'user-2',
      gameId: 'game-2',
      category: null,
      reason: 'keep it blocked',
    });

    const response = await request(app)
      .post('/user/discord-other/exclusions')
      .set('x-internal-secret', 'test-internal-secret')
      .send({ gameId: 'game-2', reason: 'keep it blocked' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      data: {
        id: 'ex-1',
        userId: 'user-2',
        gameId: 'game-2',
        category: null,
        reason: 'keep it blocked',
      },
    });
    expect(mockedDb.addExclusion).toHaveBeenCalledWith({
      userId: 'user-2',
      gameId: 'game-2',
      category: undefined,
      reason: 'keep it blocked',
    });
    expect(mockedExclusionCache.invalidateExclusionCache).toHaveBeenCalledWith('user-2');
  });

  it('accepts canonical provider exclusions for internal service writes', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'test-internal-secret');
    mockedDb.findUserByDiscordId.mockResolvedValueOnce({
      id: 'user-2',
      discord_id: 'discord-other',
    });
    mockedDb.addExclusion.mockResolvedValueOnce({
      id: 'ex-2',
      userId: 'user-2',
      gameId: null,
      category: null,
      provider: 'pragmatic-play',
      casino: null,
      reason: 'provider tilt',
    });

    const response = await request(app)
      .post('/user/discord-other/exclusions')
      .set('x-internal-secret', 'test-internal-secret')
      .send({ provider: 'Pragmatic Play', reason: 'provider tilt' });

    expect(response.status).toBe(201);
    expect(response.body.data.provider).toBe('pragmatic-play');
    expect(mockedDb.addExclusion).toHaveBeenCalledWith({
      userId: 'user-2',
      gameId: undefined,
      category: undefined,
      provider: 'pragmatic-play',
      casino: undefined,
      reason: 'provider tilt',
    });
    expect(mockedExclusionCache.invalidateExclusionCache).toHaveBeenCalledWith('user-2');
  });

  it('allows internal service deletes with x-internal-secret', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'test-internal-secret');
    mockedDb.findUserByDiscordId.mockResolvedValueOnce({
      id: 'user-2',
      discord_id: 'discord-other',
    });
    mockedDb.removeExclusion.mockResolvedValueOnce(true);

    const response = await request(app)
      .delete('/user/discord-other/exclusions/ex-1')
      .set('x-internal-secret', 'test-internal-secret');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(mockedDb.removeExclusion).toHaveBeenCalledWith('ex-1', 'user-2');
    expect(mockedExclusionCache.invalidateExclusionCache).toHaveBeenCalledWith('user-2');
  });
});
