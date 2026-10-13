/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { tipsRouter } from '../../src/routes/tips.js';

let mockAuthUser: {
  userId: string;
  discordId: string;
  walletAddress?: string;
} | null = null;

vi.mock('express-rate-limit', () => ({
  default: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

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

vi.mock('@tiltcheck/justthetip', () => ({
  getTipsForWallet: vi.fn().mockReturnValue([]),
  getTipTotals: vi.fn().mockReturnValue({ byDay: {}, byGame: {} }),
}));

const app = express();
app.use(express.json());
app.use('/tips', tipsRouter);

describe('GET /tips/log', () => {
  beforeEach(() => {
    mockAuthUser = {
      userId: 'mock-user-1',
      discordId: 'discord-1',
      walletAddress: 'wallet-1',
    };
  });

  it('returns 401 without a session', async () => {
    mockAuthUser = null;
    const response = await request(app).get('/tips/log?wallet=wallet-1');
    expect(response.status).toBe(401);
  });

  it('returns 403 when the session has no linked wallet', async () => {
    mockAuthUser = { userId: 'mock-user-1', discordId: 'discord-1' };
    const response = await request(app).get('/tips/log');
    expect(response.status).toBe(403);
  });

  it('returns 403 when querying a different wallet', async () => {
    const response = await request(app).get('/tips/log?wallet=somebody-else');
    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/cannot query another wallet/i);
  });

  it('returns the session wallet log', async () => {
    const response = await request(app).get('/tips/log');
    expect(response.status).toBe(200);
    expect(response.body.wallet).toBe('wallet-1');
  });
});
