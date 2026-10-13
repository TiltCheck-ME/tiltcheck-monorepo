// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const isLocked = vi.hoisted(() => vi.fn());

vi.mock('@tiltcheck/cooldown-sdk', () => ({
  isLocked,
}));

import { cooldownRouter } from '../../src/routes/cooldown.js';

const app = express();
app.use('/cooldown', cooldownRouter);

const wallet = '7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2';

describe('GET /cooldown/check', () => {
  beforeEach(() => {
    isLocked.mockReset();
    isLocked.mockResolvedValue({
      locked: true,
      scope: 'game',
      endTime: 1_800_000_000,
    });
  });

  it('returns the lock status with 30s cache and open CORS', async () => {
    const response = await request(app)
      .get('/cooldown/check')
      .query({ wallet, game: 'pragmatic:plinko' });

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('public, max-age=30');
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.body).toEqual({
      locked: true,
      scope: 'game',
      endTime: 1_800_000_000,
    });
    expect(isLocked).toHaveBeenCalledOnce();
    const [, calledWallet, calledOpts] = isLocked.mock.calls[0] as [unknown, { toBase58(): string }, { game?: string; category?: string }];
    expect(calledWallet.toBase58()).toBe(wallet);
    expect(calledOpts.game).toBe('pragmatic:plinko');
  });

  it('passes category param', async () => {
    isLocked.mockResolvedValue({ locked: false, scope: null, endTime: null });
    await request(app).get('/cooldown/check').query({ wallet, category: 'crash' });
    const opts = (isLocked.mock.calls[0] as [unknown, unknown, { category?: string }])[2];
    expect(opts.category).toBe('crash');
  });

  it('rejects a missing or bad wallet', async () => {
    const r1 = await request(app).get('/cooldown/check');
    expect(r1.status).toBe(400);

    const r2 = await request(app).get('/cooldown/check').query({ wallet: 'nope' });
    expect(r2.status).toBe(400);
    expect(isLocked).not.toHaveBeenCalled();
  });

  it('answers CORS preflight', async () => {
    const r = await request(app).options('/cooldown/check');
    expect(r.status).toBe(204);
    expect(r.headers['access-control-allow-origin']).toBe('*');
    expect(r.headers['access-control-allow-methods']).toContain('GET');
  });

  it('returns 503 when isLocked throws', async () => {
    isLocked.mockRejectedValue(new Error('RPC down'));
    const r = await request(app).get('/cooldown/check').query({ wallet });
    expect(r.status).toBe(503);
  });
});

describe('GET /cooldown/:wallet (legacy)', () => {
  it('returns 410 Gone with migration message', async () => {
    const r = await request(app).get(`/cooldown/${wallet}`);
    expect(r.status).toBe(410);
    expect(r.body.error).toMatch(/moved/);
  });
});
