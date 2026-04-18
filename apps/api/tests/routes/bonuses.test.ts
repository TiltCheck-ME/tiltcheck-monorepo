/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'node:path';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { bonusesRouter } from '../../src/routes/bonuses.js';

const app = express();
app.use('/bonuses', bonusesRouter);

const TEST_EMAIL_BONUS_FEED_PATH = path.join(process.cwd(), 'data', 'test-bonuses-inbox-feed.json');

describe('Bonuses Routes', () => {
  beforeEach(() => {
    process.env.EMAIL_BONUS_FEED_PATH = TEST_EMAIL_BONUS_FEED_PATH;
    if (existsSync(TEST_EMAIL_BONUS_FEED_PATH)) rmSync(TEST_EMAIL_BONUS_FEED_PATH);
  });

  afterEach(() => {
    delete process.env.EMAIL_BONUS_FEED_PATH;
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
});
