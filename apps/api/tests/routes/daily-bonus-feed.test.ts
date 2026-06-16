/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-16 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'node:path';
import { existsSync, rmSync, writeFileSync } from 'node:fs';

const mockedAuth = vi.hoisted(() => ({
  optionalAuthMiddleware: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

const mockedExclusionCache = vi.hoisted(() => ({
  getForbiddenGamesProfile: vi.fn(),
  profileBlocksTarget: vi.fn(),
}));

const mockedDb = vi.hoisted(() => ({
  findUserByDiscordId: vi.fn(),
}));

vi.mock('../../src/middleware/auth.js', () => mockedAuth);
vi.mock('../../src/services/exclusion-cache.js', () => mockedExclusionCache);
vi.mock('@tiltcheck/db', () => mockedDb);

import { bonusesRouter } from '../../src/routes/bonuses.js';

const app = express();
app.use('/bonuses', bonusesRouter);

const TEST_EMAIL_BONUS_FEED_PATH = path.join(process.cwd(), 'data', 'test-daily-bonus-feed.json');

describe('GET /bonuses/daily-feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EMAIL_BONUS_FEED_PATH = TEST_EMAIL_BONUS_FEED_PATH;
    if (existsSync(TEST_EMAIL_BONUS_FEED_PATH)) rmSync(TEST_EMAIL_BONUS_FEED_PATH);
  });

  afterEach(() => {
    delete process.env.EMAIL_BONUS_FEED_PATH;
    if (existsSync(TEST_EMAIL_BONUS_FEED_PATH)) rmSync(TEST_EMAIL_BONUS_FEED_PATH);
  });

  it('returns a unified feed with source metadata', async () => {
    writeFileSync(
      TEST_EMAIL_BONUS_FEED_PATH,
      JSON.stringify({
        updatedAt: '2026-06-16T12:00:00.000Z',
        bonuses: [
          {
            id: 'stake-us-inbox',
            brand: 'Stake.us',
            bonus: '25 SC daily drop from inbox',
            url: 'https://stake.us/promo',
            verified: '2026-06-16T12:00:00.000Z',
            code: 'DROP25',
            source: 'email-inbox',
            senderDomain: 'stake.us',
            senderEmail: 'promo@stake.us',
            subject: 'Daily bonus',
            bonusType: 'Daily',
            bonusValue: '25 SC',
            terms: 'Daily login',
            expiryMessage: 'today only',
            expiresAt: '2026-06-16T23:59:59.999Z',
            isExpired: false,
            discoveredAt: '2026-06-16T12:00:00.000Z',
            updatedAt: '2026-06-16T12:00:00.000Z',
            lastPublishedAt: null,
            imageUrl: null,
          },
        ],
      }),
    );

    const response = await request(app).get('/bonuses/daily-feed');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      total: expect.any(Number),
      usTotal: expect.any(Number),
      updatedAt: expect.any(String),
    });
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(Array.isArray(response.body.sources)).toBe(true);
    expect(response.body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'email-inbox' }),
        expect.objectContaining({ key: 'collectclock' }),
        expect.objectContaining({ key: 'local-fallback' }),
      ]),
    );

    const stakeEntry = response.body.data.find((entry: { brand: string }) => entry.brand === 'Stake.us');
    expect(stakeEntry).toMatchObject({
      brand: 'Stake.us',
      sources: expect.arrayContaining(['email-inbox']),
      isUsCasino: true,
      code: 'DROP25',
    });
  });

  it('honors usOnly=false to include non-US entries when present', async () => {
    const response = await request(app).get('/bonuses/daily-feed?usOnly=false');

    expect(response.status).toBe(200);
    expect(response.body.total).toBeGreaterThanOrEqual(response.body.data.length);
  });
});
