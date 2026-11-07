// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-05
import http from 'http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Connection } from '@solana/web3.js';

const isLocked = vi.hoisted(() => vi.fn());

vi.mock('@tiltcheck/cooldown-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tiltcheck/cooldown-sdk')>();
  return {
    ...actual,
    isLocked,
  };
});

import { cooldownRouter, invalidateCooldownCache } from '../../src/routes/cooldown.js';

const app = express();
app.use(express.json());
app.use('/cooldown', cooldownRouter);

const wallet = '7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2';
const validSignature = '5VERv8NMvzbJMEdV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBGMjPJqR4qMWNg36MtZnGRTUm32JyK71dLUc';

describe('GET /cooldown/check', () => {
  beforeEach(() => {
    invalidateCooldownCache();
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

  it('returns enriched verification metadata when verbose=true', async () => {
    const response = await request(app)
      .get('/cooldown/check')
      .query({ wallet, game: 'pragmatic:plinko', verbose: 'true' });

    expect(response.status).toBe(200);
    expect(response.body.locked).toBe(true);
    expect(response.body.scope).toBe('game');
    expect(response.body.endTime).toBe(1_800_000_000);
    expect(typeof response.body.pda).toBe('string');
    expect(typeof response.body.timeRemainingSecs).toBe('number');
    expect(typeof response.body.verifiedAt).toBe('number');
  });

  it('serves subsequent requests from in-memory cache without calling RPC', async () => {
    await request(app).get('/cooldown/check').query({ wallet, game: 'pragmatic:plinko' });
    expect(isLocked).toHaveBeenCalledTimes(1);

    // Second call with same parameters hits cache
    const response2 = await request(app).get('/cooldown/check').query({ wallet, game: 'pragmatic:plinko' });
    expect(response2.status).toBe(200);
    expect(response2.body.locked).toBe(true);
    expect(isLocked).toHaveBeenCalledTimes(1);

    // skipCache=true bypasses in-memory cache
    await request(app).get('/cooldown/check').query({ wallet, game: 'pragmatic:plinko', skipCache: 'true' });
    expect(isLocked).toHaveBeenCalledTimes(2);
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
    expect(r.headers['access-control-allow-methods']).toContain('POST');
  });

  it('returns 503 when isLocked throws', async () => {
    isLocked.mockRejectedValue(new Error('RPC down'));
    const r = await request(app).get('/cooldown/check').query({ wallet });
    expect(r.status).toBe(503);
  });
});

describe('POST /cooldown/verify-tx', () => {
  beforeEach(() => {
    invalidateCooldownCache();
    isLocked.mockReset();
    isLocked.mockResolvedValue({
      locked: true,
      scope: 'all',
      endTime: 1_800_000_000,
    });
  });

  it('rejects missing or malformed signature and wallet parameters', async () => {
    const r1 = await request(app).post('/cooldown/verify-tx').send({});
    expect(r1.status).toBe(400);
    expect(r1.body.error).toContain('signature and wallet are required');

    const r2 = await request(app).post('/cooldown/verify-tx').send({ signature: 'short', wallet });
    expect(r2.status).toBe(400);
    expect(r2.body.error).toContain('Invalid Solana transaction signature format');

    const r3 = await request(app).post('/cooldown/verify-tx').send({ signature: validSignature, wallet: 'invalid-wallet' });
    expect(r3.status).toBe(400);
    expect(r3.body.error).toContain('valid Solana public key');
  });

  it('returns 202 when transaction signature is pending or propagating', async () => {
    vi.spyOn(Connection.prototype, 'getSignatureStatus').mockResolvedValue({
      context: { slot: 100 },
      value: null,
    });

    const res = await request(app).post('/cooldown/verify-tx').send({
      signature: validSignature,
      wallet,
    });

    expect(res.status).toBe(202);
    expect(res.body.verified).toBe(false);
    expect(res.body.confirmationStatus).toBe('pending');
  });

  it('returns 422 when transaction signature failed on-chain', async () => {
    vi.spyOn(Connection.prototype, 'getSignatureStatus').mockResolvedValue({
      context: { slot: 100 },
      value: {
        slot: 100,
        confirmations: 10,
        err: { InstructionError: [0, 'CustomError'] },
        confirmationStatus: 'confirmed',
      },
    });

    const res = await request(app).post('/cooldown/verify-tx').send({
      signature: validSignature,
      wallet,
    });

    expect(res.status).toBe(422);
    expect(res.body.verified).toBe(false);
    expect(res.body.error).toContain('Transaction failed on-chain');
  });

  it('verifies confirmed transaction and updates lock cache', async () => {
    vi.spyOn(Connection.prototype, 'getSignatureStatus').mockResolvedValue({
      context: { slot: 100 },
      value: {
        slot: 100,
        confirmations: 10,
        err: null,
        confirmationStatus: 'confirmed',
      },
    });

    const res = await request(app).post('/cooldown/verify-tx').send({
      signature: validSignature,
      wallet,
    });

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.signature).toBe(validSignature);
    expect(res.body.wallet).toBe(wallet);
    expect(res.body.lock.locked).toBe(true);
    expect(res.body.lock.scope).toBe('all');
    expect(typeof res.body.lock.pda).toBe('string');
  });
});

describe('POST /cooldown/bust-cache', () => {
  it('busts cache successfully', async () => {
    const res = await request(app).post('/cooldown/bust-cache').send({ wallet });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.invalidated).toBe(true);
  });
});

describe('GET /cooldown/stream', () => {
  it('rejects an invalid wallet parameter with 400', async () => {
    const res = await request(app).get('/cooldown/stream').query({ wallet: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('initiates an SSE stream with connected event for a valid wallet', async () => {
    isLocked.mockResolvedValue({ locked: false, scope: null, endTime: null });

    const server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, resolve);
    });
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const result = await new Promise<{ status: number; headers: http.IncomingHttpHeaders; chunk: string }>(
        (resolve, reject) => {
          const clientReq = http.get(`http://127.0.0.1:${port}/cooldown/stream?wallet=${wallet}`, (res) => {
            let received = '';
            res.on('data', (chunk) => {
              received += chunk.toString();
              if (received.includes('event: connected')) {
                clientReq.destroy();
                resolve({
                  status: res.statusCode ?? 0,
                  headers: res.headers,
                  chunk: received,
                });
              }
            });
          });
          clientReq.on('error', (err) => {
            if (!clientReq.destroyed) reject(err);
          });
        }
      );

      expect(result.status).toBe(200);
      expect(result.headers['content-type']).toContain('text/event-stream');
      expect(result.chunk).toContain('event: connected');
      expect(result.chunk).toContain(wallet);
    } finally {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });
});

describe('GET /cooldown/:wallet (legacy)', () => {
  it('returns 410 Gone with migration message', async () => {
    const r = await request(app).get(`/cooldown/${wallet}`);
    expect(r.status).toBe(410);
    expect(r.body.error).toMatch(/moved/);
  });
});
