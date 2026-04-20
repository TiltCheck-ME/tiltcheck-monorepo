/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'node:path';
import { existsSync, rmSync, writeFileSync } from 'node:fs';

const mockedAuth = vi.hoisted(() => ({
  optionalAuthMiddleware: vi.fn((req: any, _res: any, next: any) => {
    if (req.headers.authorization === 'Bearer linked-token') {
      req.user = {
        id: 'user-1',
        discordId: 'discord-linked',
      };
    }
    next();
  }),
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

const TEST_EMAIL_BONUS_FEED_PATH = path.join(process.cwd(), 'data', 'test-bonuses-inbox-feed.json');

describe('Bonuses Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EMAIL_BONUS_FEED_PATH = TEST_EMAIL_BONUS_FEED_PATH;
    process.env.INTERNAL_API_SECRET = 'test-internal-secret';
    if (existsSync(TEST_EMAIL_BONUS_FEED_PATH)) rmSync(TEST_EMAIL_BONUS_FEED_PATH);
  });

  afterEach(() => {
    delete process.env.EMAIL_BONUS_FEED_PATH;
    delete process.env.INTERNAL_API_SECRET;
    if (existsSync(TEST_EMAIL_BONUS_FEED_PATH)) rmSync(TEST_EMAIL_BONUS_FEED_PATH);
  });

  it('returns an explicit empty inbox feed state', async () => {
    const response = await request(app).get('/bonuses/inbox');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      source: 'email-inbox',
      available: false,
      total: 0,
      data: [],
    });
    expect(response.body.message).toContain('Inbox bonus feed is empty');
  });

  it('returns active persisted inbox bonuses', async () => {
    writeFileSync(
      TEST_EMAIL_BONUS_FEED_PATH,
      JSON.stringify({
        updatedAt: '2026-04-17T12:00:00.000Z',
        bonuses: [
          {
            id: 'mcluck-claim',
            brand: 'McLuck',
            bonus: '100% match bonus up to $500',
            url: 'https://mcluck.com/promos/claim',
            verified: '2026-04-17T12:00:00.000Z',
            code: 'DROP500',
            source: 'email-inbox',
            senderDomain: 'mcluck.com',
            senderEmail: 'promos@mcluck.com',
            subject: 'Match bonus drop',
            bonusType: 'Match',
            bonusValue: '100%',
            terms: '100% match bonus up to $500 | Code DROP500',
            expiryMessage: 'expires in 2 days',
            expiresAt: '2099-04-19T12:00:00.000Z',
            isExpired: false,
            discoveredAt: '2026-04-17T12:00:00.000Z',
            updatedAt: '2026-04-17T12:00:00.000Z',
            lastPublishedAt: '2026-04-17T12:05:00.000Z',
          },
        ],
      }),
      'utf8'
    );

    const response = await request(app).get('/bonuses/inbox');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      source: 'email-inbox',
      available: true,
      total: 1,
      updatedAt: '2026-04-17T12:00:00.000Z',
    });
    expect(response.body.data).toEqual([
      expect.objectContaining({
        brand: 'McLuck',
        code: 'DROP500',
        url: 'https://mcluck.com/promos/claim',
      }),
    ]);
  });

  it('suppresses excluded inbox bonuses for authenticated users', async () => {
    mockedExclusionCache.getForbiddenGamesProfile.mockResolvedValueOnce({
      userId: 'user-1',
      blockedGameIds: [],
      blockedCategories: [],
      blockedProviders: [],
      blockedCasinos: ['stake'],
      exclusions: [],
      updatedAt: '2026-04-19T00:00:00.000Z',
    });
    mockedExclusionCache.profileBlocksTarget.mockImplementation((_profile, target) => (
      target?.casino === 'stake-us' || target?.casino === 'stake'
    ));

    writeFileSync(
      TEST_EMAIL_BONUS_FEED_PATH,
      JSON.stringify({
        updatedAt: '2026-04-19T12:00:00.000Z',
        bonuses: [
          {
            id: 'stake-drop',
            brand: 'Stake.us',
            bonus: '25 free spins',
            url: 'https://stake.us/promotions/free-spins',
            verified: '2026-04-19T12:00:00.000Z',
            code: 'SPIN25',
            source: 'email-inbox',
            senderDomain: 'stake.us',
            senderEmail: 'promos@stake.us',
            subject: 'Free spins',
            bonusType: 'Free spins',
            bonusValue: '25',
            terms: '25 free spins',
            expiryMessage: 'expires tonight',
            expiresAt: '2099-04-19T12:00:00.000Z',
            isExpired: false,
            discoveredAt: '2026-04-19T12:00:00.000Z',
            updatedAt: '2026-04-19T12:00:00.000Z',
          },
          {
            id: 'mcluck-drop',
            brand: 'McLuck',
            bonus: '100% match bonus',
            url: 'https://mcluck.com/promos/claim',
            verified: '2026-04-19T12:00:00.000Z',
            code: 'DROP500',
            source: 'email-inbox',
            senderDomain: 'mcluck.com',
            senderEmail: 'promos@mcluck.com',
            subject: 'Match bonus',
            bonusType: 'Match',
            bonusValue: '100%',
            terms: '100% match bonus',
            expiryMessage: 'expires in 2 days',
            expiresAt: '2099-04-19T12:00:00.000Z',
            isExpired: false,
            discoveredAt: '2026-04-19T12:00:00.000Z',
            updatedAt: '2026-04-19T12:00:00.000Z',
          },
        ],
      }),
      'utf8'
    );

    const response = await request(app)
      .get('/bonuses/inbox')
      .set('Authorization', 'Bearer linked-token');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.data).toEqual([
      expect.objectContaining({
        brand: 'McLuck',
      }),
    ]);
    expect(response.body.suppression).toEqual({
      active: true,
      hiddenCount: 1,
    });
  });

  it('suppresses excluded collectclock bonuses for internal service calls', async () => {
    mockedDb.findUserByDiscordId.mockResolvedValueOnce({
      id: 'user-9',
      discord_id: 'discord-internal',
    });
    mockedExclusionCache.getForbiddenGamesProfile.mockResolvedValueOnce({
      userId: 'user-9',
      blockedGameIds: [],
      blockedCategories: [],
      blockedProviders: [],
      blockedCasinos: ['stake'],
      exclusions: [],
      updatedAt: '2026-04-19T00:00:00.000Z',
    });
    mockedExclusionCache.profileBlocksTarget.mockImplementation((_profile, target) => (
      target?.casino === 'stake-us' || target?.casino === 'stake'
    ));

    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ([
        {
          brand: 'Stake.us',
          bonus: '25 free spins',
          url: 'https://stake.us/promotions/free-spins',
          verified: '2026-04-19T12:00:00.000Z',
          code: 'SPIN25',
        },
        {
          brand: 'McLuck',
          bonus: '100% match bonus',
          url: 'https://mcluck.com/promos/claim',
          verified: '2026-04-19T12:00:00.000Z',
          code: 'DROP500',
        },
      ]),
    })) as any;

    const response = await request(app)
      .get('/bonuses?discordId=discord-internal')
      .set('x-internal-secret', 'test-internal-secret');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      expect.objectContaining({
        brand: 'McLuck',
      }),
    ]);
    expect(response.body.suppression).toEqual({
      active: true,
      hiddenCount: 1,
    });
  });
});
