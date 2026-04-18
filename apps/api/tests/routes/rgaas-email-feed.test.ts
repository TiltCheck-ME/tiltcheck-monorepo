/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { rgaasRouter } from '../../src/routes/rgaas.js';
import { eventRouter } from '@tiltcheck/event-router';
import { suslink } from '@tiltcheck/suslink';

vi.mock('@tiltcheck/event-types', () => ({
  createEvent: vi.fn(),
}));

vi.mock('../../src/lib/safety.js', () => ({
  evaluateBreathalyzer: vi.fn(),
  evaluateSentiment: vi.fn(),
  evaluateSentimentV2: vi.fn(),
}));

vi.mock('../../src/lib/live-feed-data.js', () => ({
  loadDomainBlacklist: vi.fn(),
}));

vi.mock('@tiltcheck/trust-engines', () => ({
  trustEngines: {
    getCasinoScore: vi.fn(),
    getCasinoBreakdown: vi.fn(),
    getCasinoScores: vi.fn(() => ({})),
    explainCasinoScore: vi.fn(),
    getDegenScore: vi.fn(),
    getDegenBreakdown: vi.fn(),
    explainDegenScore: vi.fn(),
  },
}));

vi.mock('@tiltcheck/event-router', () => ({
  eventRouter: {
    publish: vi.fn(),
  },
}));

vi.mock('@tiltcheck/suslink', () => ({
  suslink: {
    scanUrl: vi.fn(),
  },
}));

vi.mock('@tiltcheck/tiltcheck-core', () => ({
  getUserTiltStatus: vi.fn(),
  evaluateRtpLegalTrigger: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/rgaas', rgaasRouter);

const TEST_EMAIL_BONUS_FEED_PATH = path.join(process.cwd(), 'data', 'test-email-bonus-feed-rgaas-email.json');
const TEST_TRUST_SIGNALS_LOG_PATH = path.join(process.cwd(), 'data', 'test-trust-signals-rgaas-email.jsonl');

describe('RGaaS email bonus feed routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EMAIL_BONUS_FEED_PATH = TEST_EMAIL_BONUS_FEED_PATH;
    process.env.TRUST_SIGNALS_LOG_PATH = TEST_TRUST_SIGNALS_LOG_PATH;
    if (existsSync(TEST_EMAIL_BONUS_FEED_PATH)) rmSync(TEST_EMAIL_BONUS_FEED_PATH);
    if (existsSync(TEST_TRUST_SIGNALS_LOG_PATH)) rmSync(TEST_TRUST_SIGNALS_LOG_PATH);
  });

  afterEach(() => {
    delete process.env.EMAIL_BONUS_FEED_PATH;
    delete process.env.TRUST_SIGNALS_LOG_PATH;
    if (existsSync(TEST_EMAIL_BONUS_FEED_PATH)) rmSync(TEST_EMAIL_BONUS_FEED_PATH);
    if (existsSync(TEST_TRUST_SIGNALS_LOG_PATH)) rmSync(TEST_TRUST_SIGNALS_LOG_PATH);
  });

  it('persists inbox bonuses, appends trust signals, and publishes active bonus alerts', async () => {
    vi.mocked(suslink.scanUrl)
      .mockResolvedValueOnce({ riskLevel: 'low', reason: 'sender clean' } as any)
      .mockResolvedValueOnce({ riskLevel: 'low', reason: 'claim link clean' } as any);

    const response = await request(app)
      .post('/rgaas/email-ingest')
      .send({
        raw_email: [
          'From: promos@mcluck.com',
          'Date: Thu, 16 Apr 2026 12:00:00 +0000',
          'Subject: Match bonus drop',
          '',
          'Get a 100% match bonus up to $500 expires in 2 days.',
          'Use code DROP500 at https://mcluck.com/promos/claim',
          'Unsubscribe: https://mcluck.com/unsubscribe',
        ].join('\n'),
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.bonusFeed.detected).toBe(1);
    expect(response.body.bonusFeed.added).toBe(1);
    expect(response.body.bonusFeed.publishedEvents).toBe(1);

    expect(vi.mocked(eventRouter.publish)).toHaveBeenCalledWith(
      'bonus.discovered',
      'rgaas-api',
      expect.objectContaining({
        casino_name: 'McLuck',
        source: 'email-inbox',
        is_expired: false,
      }),
      undefined,
      expect.objectContaining({
        discoveredVia: 'email-ingest',
        senderDomain: 'mcluck.com',
      }),
    );

    const persistedFeed = JSON.parse(readFileSync(TEST_EMAIL_BONUS_FEED_PATH, 'utf8')) as {
      bonuses: Array<Record<string, unknown>>;
    };
    expect(persistedFeed.bonuses).toHaveLength(1);
    expect(persistedFeed.bonuses[0]).toMatchObject({
      brand: 'McLuck',
      code: 'DROP500',
      url: 'https://mcluck.com/promos/claim',
      source: 'email-inbox',
      lastPublishedAt: expect.any(String),
    });

    const trustSignalsLog = readFileSync(TEST_TRUST_SIGNALS_LOG_PATH, 'utf8').trim().split('\n');
    expect(trustSignalsLog).toHaveLength(1);
    expect(JSON.parse(trustSignalsLog[0])).toMatchObject({
      senderDomain: 'mcluck.com',
      casinoBrand: 'McLuck',
      source: 'email-ingest',
    });

    const feedResponse = await request(app).get('/rgaas/bonus-feed');
    expect(feedResponse.status).toBe(200);
    expect(feedResponse.body.success).toBe(true);
    expect(feedResponse.body.source).toBe('email-inbox');
    expect(feedResponse.body.bonuses).toHaveLength(1);
    expect(feedResponse.body.bonuses[0].brand).toBe('McLuck');
  });

  it('does not publish expired inbox bonuses', async () => {
    vi.mocked(suslink.scanUrl)
      .mockResolvedValueOnce({ riskLevel: 'low', reason: 'sender clean' } as any)
      .mockResolvedValueOnce({ riskLevel: 'low', reason: 'claim link clean' } as any);

    const response = await request(app)
      .post('/rgaas/email-ingest')
      .send({
        raw_email: [
          'From: promos@realprize.com',
          'Date: Mon, 01 Apr 2024 12:00:00 +0000',
          'Subject: Free spins expired',
          '',
          '10 free spins offer expired yesterday.',
          'Claim link: https://www.realprize.com/promos/free-spins',
        ].join('\n'),
      });

    expect(response.status).toBe(200);
    expect(response.body.bonusFeed.detected).toBe(1);
    expect(response.body.bonusFeed.publishedEvents).toBe(0);
    expect(vi.mocked(eventRouter.publish)).not.toHaveBeenCalled();
  });
});
