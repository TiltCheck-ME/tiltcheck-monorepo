/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockedDb = vi.hoisted(() => ({
  findOnboardingByDiscordId: vi.fn(),
  findUserByDiscordId: vi.fn(),
  findUserById: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('@tiltcheck/db', () => mockedDb);

import { telemetryRouter } from '../../src/routes/telemetry.js';

describe('Telemetry consent enforcement', () => {
  const app = express();
  app.use(express.json());
  app.use('/telemetry', telemetryRouter);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips win-secure persistence when financial consent is disabled', async () => {
    mockedDb.findUserByDiscordId.mockResolvedValueOnce({
      id: 'u1',
      discord_id: 'd1',
      redeem_wins: 2,
      total_redeemed: 10,
    });
    mockedDb.findOnboardingByDiscordId.mockResolvedValueOnce({
      share_message_contents: false,
      share_financial_data: false,
      share_session_telemetry: true,
      notify_nft_identity_ready: false,
      compliance_bypass: false,
    });

    const response = await request(app)
      .post('/telemetry/win-secure')
      .send({ userId: 'd1', amount: 42 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      skipped: true,
      reason: 'financial_data_consent_required',
    });
    expect(mockedDb.updateUser).not.toHaveBeenCalled();
  });

  it('persists win-secure metrics when financial consent is enabled', async () => {
    mockedDb.findUserByDiscordId.mockResolvedValueOnce({
      id: 'u1',
      discord_id: 'd1',
      discord_username: 'tester',
      redeem_wins: 2,
      total_redeemed: 10,
    });
    mockedDb.findOnboardingByDiscordId.mockResolvedValueOnce({
      share_message_contents: false,
      share_financial_data: true,
      share_session_telemetry: true,
      notify_nft_identity_ready: false,
      compliance_bypass: false,
    });
    mockedDb.updateUser.mockResolvedValueOnce({
      id: 'u1',
      redeem_wins: 3,
      total_redeemed: 52,
    });

    const response = await request(app)
      .post('/telemetry/win-secure')
      .send({ userId: 'd1', amount: 42 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.skipped).toBeUndefined();
    expect(mockedDb.updateUser).toHaveBeenCalledWith('u1', expect.objectContaining({
      redeem_wins: 3,
      total_redeemed: 52,
    }));
  });
});
