import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { statsRouter } from '../../src/routes/stats.js';

describe('stats route', () => {
  const app = express();
  app.use('/stats', statsRouter);

  afterEach(() => {
    delete process.env.STATS_COMMUNITIES_PROTECTED;
    delete process.env.STATS_SCANS_24H;
    delete process.env.STATS_HIGH_RISK_BLOCKED_24H;
  });

  it('returns stats payload with defaults', async () => {
    const response = await request(app).get('/stats');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      stats: {
        communitiesProtected: 0,
        scansLast24h: 0,
        highRiskBlocked: 0,
      },
    });
    expect(typeof response.body.stats.updatedAt).toBe('string');
  });

  it('uses configured env values and clamps invalid negatives to defaults', async () => {
    process.env.STATS_COMMUNITIES_PROTECTED = '12';
    process.env.STATS_SCANS_24H = '-4';
    process.env.STATS_HIGH_RISK_BLOCKED_24H = '9';

    const response = await request(app).get('/stats');
    expect(response.status).toBe(200);
    expect(response.body.stats).toMatchObject({
      communitiesProtected: 12,
      scansLast24h: 0,
      highRiskBlocked: 9,
    });
  });
});
