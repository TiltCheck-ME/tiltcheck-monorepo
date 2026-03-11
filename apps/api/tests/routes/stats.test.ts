import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { STATS_CONTRACT_VERSION, statsRouter } from '../../src/routes/stats.js';

describe('stats route', () => {
  const app = express();
  app.use('/stats', statsRouter);
  let tempDataDir = '';

  beforeEach(async () => {
    tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tc-stats-'));
    process.env.STATS_DATA_DIR = tempDataDir;
  });

  afterEach(() => {
    delete process.env.STATS_DATA_DIR;
  });

  it('returns stats payload with defaults when source files are missing', async () => {
    const response = await request(app).get('/stats');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      stats: {
        communitiesProtected: 0,
        scansLast24h: 0,
        highRiskBlocked: 0,
        contractVersion: STATS_CONTRACT_VERSION,
      },
    });
    expect(typeof response.body.stats.updatedAt).toBe('string');
    expect(response.body.stats.sources).toEqual(
      expect.objectContaining({
        trustRollupsPath: expect.stringContaining('trust-rollups.json'),
        domainTrustScoresPath: expect.stringContaining('domain-trust-scores.json'),
        sweepstakesCasinosPath: expect.stringContaining('sweepstakes-casinos.json'),
      }),
    );
  });

  it('aggregates stats from trust data files', async () => {
    await fs.writeFile(
      path.join(tempDataDir, 'domain-trust-scores.json'),
      JSON.stringify({
        generatedAt: '2026-03-08T06:00:00.000Z',
        domains: [{ domain: 'safe.example', score: 72 }, { domain: 'risky.example', score: 20 }],
      }),
      'utf8',
    );
    await fs.writeFile(
      path.join(tempDataDir, 'trust-rollups.json'),
      JSON.stringify({
        batches: [{ generatedAt: '2026-03-08T05:59:00.000Z', domain: { domains: { 'risky.example': { events: 11 } } } }],
      }),
      'utf8',
    );
    await fs.writeFile(
      path.join(tempDataDir, 'sweepstakes-casinos.json'),
      JSON.stringify([
        { name: 'Casino A', risk: 'High' },
        { name: 'Casino B', risk: 'Critical' },
        { name: 'Casino C', risk: 'Low' },
      ]),
      'utf8',
    );

    const response = await request(app).get('/stats');
    expect(response.status).toBe(200);
    expect(response.body.stats).toMatchObject({
      communitiesProtected: 2,
      scansLast24h: 11,
      highRiskBlocked: 3,
      contractVersion: STATS_CONTRACT_VERSION,
      updatedAt: '2026-03-08T06:00:00.000Z',
    });
  });
});
