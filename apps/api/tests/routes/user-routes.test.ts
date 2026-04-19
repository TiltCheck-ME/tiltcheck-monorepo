/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
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
const mockAuthUser = vi.hoisted(() => ({
  id: 'user-1',
  discordId: 'discord-self',
  walletAddress: 'wallet-1',
}));

vi.mock('@tiltcheck/db', () => mockedDb);
vi.mock('../../src/services/exclusion-cache.js', () => mockedExclusionCache);
vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
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
      discord_id: 'd1',
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

    const response = await request(app).get('/user/d1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.discordId).toBe('d1');
    expect(response.body.user.discordId).toBe('d1');
    expect(response.body.analytics.trustScore).toBe(88);
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
