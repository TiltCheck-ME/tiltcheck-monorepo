/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */
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
}));
const mockAuthUser = vi.hoisted(() => ({
  id: 'user-1',
  discordId: 'discord-self',
  walletAddress: 'wallet-1',
}));

vi.mock('@tiltcheck/db', () => mockedDb);
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
});
