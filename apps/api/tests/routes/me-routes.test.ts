/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockedDb = vi.hoisted(() => ({
  createUser: vi.fn(),
  deleteRow: vi.fn(),
  findOnboardingByDiscordId: vi.fn(),
  findUserByDiscordId: vi.fn(),
  upsertOnboarding: vi.fn(),
}));

const mockAuthUser = vi.hoisted(() => ({
  id: 'user-1',
  discordId: 'discord-self',
  walletAddress: 'wallet-1',
}));

vi.mock('@tiltcheck/db', () => mockedDb);
vi.mock('../../src/middleware/auth.js', () => ({
  optionalAuthMiddleware: (req: any, _res: any, next: any) => {
    if (!req.user) {
      req.user = { ...mockAuthUser };
    }
    next();
  },
}));

import { meRouter } from '../../src/routes/me.js';
import { errorHandler } from '../../src/middleware/error.js';

describe('Me onboarding status routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/me', meRouter);
  app.use(errorHandler);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('lets an internal bot-style write show up in a web-style read', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'test-internal-secret');

    const persistedRow = {
      discord_id: 'discord-shared',
      is_onboarded: true,
      has_accepted_terms: true,
      risk_level: 'moderate',
      cooldown_enabled: true,
      voice_intervention_enabled: true,
      share_message_contents: false,
      share_financial_data: false,
      share_session_telemetry: false,
      notify_nft_identity_ready: false,
      daily_limit: null,
      redeem_threshold: 250,
      quiz_scores: JSON.stringify({
        answers: { delusion_check: -1 },
        completedSteps: ['terms', 'quiz', 'preferences', 'completed'],
      }),
      tutorial_completed: true,
      notifications_tips: true,
      notifications_trivia: true,
      notifications_promos: false,
      compliance_bypass: false,
      joined_at: new Date('2026-05-03T00:00:00.000Z'),
      updated_at: new Date('2026-05-03T00:00:00.000Z'),
    };

    mockedDb.findUserByDiscordId.mockResolvedValueOnce(null);
    mockedDb.createUser.mockResolvedValueOnce({
      id: 'user-shared',
      discord_id: 'discord-shared',
      roles: ['user'],
    });
    mockedDb.findOnboardingByDiscordId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persistedRow)
      .mockResolvedValueOnce(persistedRow);
    mockedDb.upsertOnboarding.mockResolvedValueOnce(persistedRow);

    const writeResponse = await request(app)
      .post('/me/onboarding-status')
      .set('Authorization', 'Bearer test-internal-secret')
      .send({
        discordId: 'discord-shared',
        step: 'completed',
        hasAcceptedTerms: true,
        riskLevel: 'moderate',
        quizScores: { delusion_check: -1 },
        preferences: {
          cooldownEnabled: true,
          voiceInterventionEnabled: true,
          redeemThreshold: 250,
          notifications: {
            tips: true,
            trivia: true,
            promos: false,
          },
        },
      });

    expect(writeResponse.status).toBe(200);
    expect(mockedDb.createUser).toHaveBeenCalledWith({
      discord_id: 'discord-shared',
      discord_username: 'discord-shared',
      roles: ['user'],
    });
    expect(mockedDb.upsertOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        discord_id: 'discord-shared',
        is_onboarded: true,
        has_accepted_terms: true,
        risk_level: 'moderate',
        voice_intervention_enabled: true,
        redeem_threshold: 250,
      }),
    );

    const readResponse = await request(app).get('/me/onboarding-status');

    expect(readResponse.status).toBe(200);
    expect(readResponse.body.completedSteps).toEqual(['terms', 'quiz', 'preferences', 'completed']);
    expect(readResponse.body.completedAt).toBe('2026-05-03T00:00:00.000Z');
    expect(readResponse.body.preferences.voiceInterventionEnabled).toBe(true);
    expect(readResponse.body.preferences.redeemThreshold).toBe(250);
    expect(readResponse.body.quizScores).toEqual({ delusion_check: -1 });
  });

  it('rejects internal writes without a discord id target', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'test-internal-secret');

    const response = await request(app)
      .post('/me/onboarding-status')
      .set('Authorization', 'Bearer test-internal-secret')
      .send({ step: 'terms' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('discordId is required');
    expect(mockedDb.upsertOnboarding).not.toHaveBeenCalled();
  });
});
