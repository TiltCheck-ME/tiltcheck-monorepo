/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const poolsMock = vi.hoisted(() => ({
  getTriviaJackpotSnapshot: vi.fn(() => ({
    pool: 1.25,
    contributions: 3,
    lastWinner: null,
    lastPayout: 0,
    updatedAt: 1,
  })),
  contributeTriviaJackpot: vi.fn().mockResolvedValue(undefined),
  recordTriviaJackpotPayout: vi.fn().mockResolvedValue(undefined),
  resetTriviaJackpotPool: vi.fn().mockResolvedValue(undefined),
  getMicrograntPoolSnapshot: vi.fn(() => ({
    pool: 0.75,
    contributions: 2,
    updatedAt: 1,
  })),
}));

vi.mock('../../src/services/community-pools.js', () => poolsMock);

import { triviaRouter } from '../../src/routes/trivia.js';

const app = express();
app.use(express.json());
app.use('/trivia', triviaRouter);

describe('Trivia Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('allows voluntary jackpot treasury contributions', async () => {
    const res = await request(app)
      .post('/trivia/jackpot/contribute')
      .send({ amountSol: 0.5, source: 'manual_donation', signature: 'sig-1' });

    expect(res.status).toBe(200);
    expect(poolsMock.contributeTriviaJackpot).toHaveBeenCalledWith(0.5, 'manual_donation', 'sig-1');
    expect(res.body).toEqual({ pool: 1.25, contributions: 3 });
  });

  it('rejects penalty-funded jackpot contributions', async () => {
    const res = await request(app)
      .post('/trivia/jackpot/contribute')
      .send({ amountSol: 0.5, source: 'wallet_early_unlock:user-1' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('TRIVIA_JACKPOT_DEFERRED');
    expect(poolsMock.contributeTriviaJackpot).not.toHaveBeenCalled();
  });

  it('keeps jackpot payouts disabled by default', async () => {
    const res = await request(app)
      .post('/trivia/jackpot/payout')
      .send({ winner: 'user-1', amountSol: 0.25 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('TRIVIA_JACKPOT_PAYOUTS_DISABLED');
    expect(poolsMock.recordTriviaJackpotPayout).not.toHaveBeenCalled();
  });

  it('allows jackpot payouts only behind the review gate flag', async () => {
    vi.stubEnv('TRIVIA_JACKPOT_PAYOUTS_ENABLED', 'true');

    const res = await request(app)
      .post('/trivia/jackpot/payout')
      .send({ winner: 'user-1', amountSol: 0.25 });

    expect(res.status).toBe(200);
    expect(poolsMock.recordTriviaJackpotPayout).toHaveBeenCalledWith('user-1', 0.25);
    expect(res.body).toEqual({ pool: 1.25, lastWinner: null, lastPayout: 0 });
  });
});
