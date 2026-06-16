/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-16 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { errorHandler } from '../../src/middleware/error.js';

const mockedDb = vi.hoisted(() => ({
  createAuditLog: vi.fn(),
  findOnboardingByDiscordId: vi.fn(),
  findUserByDiscordId: vi.fn(),
  findUserById: vi.fn(),
  updateUser: vi.fn(),
}));

let mockAuthUser: {
  userId: string;
  discordId: string;
} | null = null;

vi.mock('@tiltcheck/db', () => mockedDb);
vi.mock('@tiltcheck/auth/middleware/express', () => ({
  sessionAuth: vi.fn((_jwtConfig?: unknown, options?: { required?: boolean }) => (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const required = options?.required !== false;
    if (!mockAuthUser) {
      if (required) {
        res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
        return;
      }
      next();
      return;
    }
    (req as Request & { auth?: typeof mockAuthUser }).auth = mockAuthUser;
    next();
  }),
}));

import { telemetryRouter } from '../../src/routes/telemetry.js';

describe('Telemetry auth boundaries', () => {
  const app = express();
  app.use(express.json());
  app.use('/telemetry', telemetryRouter);
  app.use(errorHandler);

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = {
      userId: 'u1',
      discordId: 'd1',
    };
    mockedDb.findOnboardingByDiscordId.mockResolvedValue({
      share_message_contents: false,
      share_financial_data: true,
      share_session_telemetry: true,
      notify_nft_identity_ready: false,
      compliance_bypass: false,
    });
  });

  it('returns 401 for round telemetry without auth', async () => {
    mockAuthUser = null;

    const response = await request(app)
      .post('/telemetry/round')
      .send({ userId: 'd1', bet: 5, win: 0 });

    expect(response.status).toBe(401);
    expect(mockedDb.findUserByDiscordId).not.toHaveBeenCalled();
  });

  it('returns 403 when round telemetry userId does not match caller', async () => {
    mockedDb.findUserByDiscordId.mockResolvedValueOnce({
      id: 'u-other',
      discord_id: 'd-other',
    });

    const response = await request(app)
      .post('/telemetry/round')
      .send({ userId: 'd-other', bet: 5, win: 0 });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
    expect(mockedDb.createAuditLog).not.toHaveBeenCalled();
  });

  it('returns 401 for win-secure without auth', async () => {
    mockAuthUser = null;

    const response = await request(app)
      .post('/telemetry/win-secure')
      .send({ userId: 'd1', amount: 42 });

    expect(response.status).toBe(401);
    expect(mockedDb.findUserByDiscordId).not.toHaveBeenCalled();
  });

  it('returns 403 when win-secure userId does not match caller', async () => {
    mockedDb.findUserByDiscordId.mockResolvedValueOnce({
      id: 'u-other',
      discord_id: 'd-other',
      redeem_wins: 0,
      total_redeemed: 0,
    });

    const response = await request(app)
      .post('/telemetry/win-secure')
      .send({ userId: 'd-other', amount: 42 });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
    expect(mockedDb.updateUser).not.toHaveBeenCalled();
  });
});
