/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-13 */
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
  findUserByDiscordId: vi.fn(async (discordId: string) => ({
    id: `db-${discordId}`,
    discord_id: discordId,
    redeem_wins: 8,
    total_redeemed: 420,
  })),
  findOnboardingByDiscordId: vi.fn(async () => ({
    redeem_threshold: 100,
  })),
  upsertOnboarding: vi.fn(async () => null),
  getUserBuddies: vi.fn(async () => []),
  getPendingBuddyRequests: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  sendBuddyRequest: vi.fn(async () => null),
  getAggregatedTrustByDiscordId: vi.fn(async () => null),
}));

const databaseMock = vi.hoisted(() => ({
  db: {
    isConnected: vi.fn(() => true),
    getDegenIdentity: vi.fn(async () => null),
    upsertDegenIdentity: vi.fn(async () => null),
    getUserSessions: vi.fn(async () => []),
    getVaultHistory: vi.fn(async () => []),
  },
}));

vi.mock('@tiltcheck/auth', () => authMock);
vi.mock('@tiltcheck/db', () => dbClientMock);
vi.mock('@tiltcheck/database', () => databaseMock);

describe('user-dashboard sessions route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.MAGIC_SECRET_KEY = process.env.MAGIC_SECRET_KEY || 'test-magic-key';
    databaseMock.db.isConnected.mockReturnValue(true);
    databaseMock.db.getUserSessions.mockResolvedValue([
      {
        casino_name: 'Stake',
        net_pl: 150,
        duration_ms: 30 * 60 * 1000,
        created_at: '2026-04-12T09:30:00.000Z',
        completed_at: '2026-04-12T10:00:00.000Z',
      },
      {
        casino_name: 'Shuffle',
        net_pl: 120,
        duration_ms: 40 * 60 * 1000,
        created_at: '2026-04-11T09:20:00.000Z',
        completed_at: '2026-04-11T10:00:00.000Z',
      },
      {
        casino_name: 'Rollbit',
        net_pl: -40,
        duration_ms: 20 * 60 * 1000,
        created_at: '2026-04-10T09:40:00.000Z',
        completed_at: '2026-04-10T10:00:00.000Z',
      },
    ]);
    databaseMock.db.getVaultHistory.mockResolvedValue([
      {
        amount_sol: 80,
        status: 'locked',
        created_at: '2026-04-12T11:00:00.000Z',
      },
    ]);
  });

  it('returns redeem-framed analytics with secured wins and redeem windows', async () => {
    const { app } = await import('../src/index.js');
    const response = await request(app).get('/api/user/u1/sessions');

    expect(response.status).toBe(200);
    expect(response.body.stats).toMatchObject({
      netSessionPL: 230,
      securedAmount: 80,
      securedWins: 1,
      redeemWindowCount: 2,
      avgSession: 30,
    });
    expect(response.body.context).toMatchObject({
      redeemThreshold: 100,
      lifetimeRedeemWins: 8,
      lifetimeTotalRedeemed: 420,
    });
    expect(response.body.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          casino_name: 'Stake',
          outcome: 'secured_win',
          outcome_label: 'SECURED WIN',
          secured_amount: 80,
          redeem_threshold_hit: true,
        }),
        expect.objectContaining({
          casino_name: 'Shuffle',
          outcome: 'redeem_window',
          outcome_label: 'REDEEM WINDOW',
          redeem_threshold_hit: true,
        }),
        expect.objectContaining({
          casino_name: 'Rollbit',
          outcome: 'down_session',
          outcome_label: 'DOWN SESSION',
          redeem_threshold_hit: false,
        }),
      ]),
    );
  });
});
