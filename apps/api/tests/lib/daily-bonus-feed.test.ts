/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-16 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { existsSync, rmSync, writeFileSync } from 'node:fs';

const TEST_EMAIL_BONUS_FEED_PATH = path.join(process.cwd(), 'data', 'test-daily-bonus-feed-lib.json');

describe('buildDailyBonusFeed', () => {
  beforeEach(() => {
    process.env.EMAIL_BONUS_FEED_PATH = TEST_EMAIL_BONUS_FEED_PATH;
    if (existsSync(TEST_EMAIL_BONUS_FEED_PATH)) rmSync(TEST_EMAIL_BONUS_FEED_PATH);
  });

  afterEach(() => {
    delete process.env.EMAIL_BONUS_FEED_PATH;
    if (existsSync(TEST_EMAIL_BONUS_FEED_PATH)) rmSync(TEST_EMAIL_BONUS_FEED_PATH);
  });

  it('merges inbox and local fallback entries with source tags', async () => {
    vi.resetModules();
    writeFileSync(
      TEST_EMAIL_BONUS_FEED_PATH,
      JSON.stringify({
        updatedAt: '2026-06-16T12:00:00.000Z',
        bonuses: [
          {
            id: 'mcluck-inbox',
            brand: 'McLuck',
            bonus: '100% match up to $500',
            url: 'https://mcluck.com/promos/claim',
            verified: '2026-06-16T12:00:00.000Z',
            code: 'DROP500',
            source: 'email-inbox',
            senderDomain: 'mcluck.com',
            senderEmail: 'promo@mcluck.com',
            subject: 'Bonus drop',
            bonusType: 'Match',
            bonusValue: '$500',
            terms: 'Wagering applies',
            expiryMessage: 'Valid through end of year',
            expiresAt: '2026-12-31T23:59:59.999Z',
            isExpired: false,
            discoveredAt: '2026-06-16T12:00:00.000Z',
            updatedAt: '2026-06-16T12:00:00.000Z',
            lastPublishedAt: null,
            imageUrl: null,
          },
        ],
      }),
    );

    const { buildDailyBonusFeed } = await import('../../src/lib/daily-bonus-feed.js');
    const feedAll = await buildDailyBonusFeed({ usOnly: false });
    const feed = await buildDailyBonusFeed({ usOnly: true });

    const mcluckAny = feedAll.data.find((entry) => entry.brand === 'McLuck');
    expect(mcluckAny).toBeDefined();
    expect(mcluckAny?.sources).toContain('email-inbox');
    expect(mcluckAny?.isUsCasino).toBe(true);

    const mcluck = feed.data.find((entry) => entry.brand === 'McLuck');
    expect(mcluck).toBeDefined();
    expect(feed.sources.some((source) => source.key === 'email-inbox' && source.count > 0)).toBe(true);
  });

  it('does not treat non-alphanumeric brands as US casinos', async () => {
    vi.resetModules();
    writeFileSync(
      TEST_EMAIL_BONUS_FEED_PATH,
      JSON.stringify({
        updatedAt: '2026-06-16T12:00:00.000Z',
        bonuses: [
          {
            id: 'symbol-brand',
            brand: '!!!',
            bonus: 'Fake promo',
            url: 'https://example.com/promo',
            verified: '2026-06-16T12:00:00.000Z',
            code: null,
            source: 'email-inbox',
            senderDomain: 'example.com',
            senderEmail: 'promo@example.com',
            subject: 'Bonus',
            bonusType: 'Unknown',
            bonusValue: '0',
            terms: 'None',
            expiryMessage: 'Valid through end of year',
            expiresAt: '2026-12-31T23:59:59.999Z',
            isExpired: false,
            discoveredAt: '2026-06-16T12:00:00.000Z',
            updatedAt: '2026-06-16T12:00:00.000Z',
            lastPublishedAt: null,
            imageUrl: null,
          },
        ],
      }),
    );

    const { buildDailyBonusFeed } = await import('../../src/lib/daily-bonus-feed.js');
    const feed = await buildDailyBonusFeed({ usOnly: false });
    const symbolBrand = feed.data.find((entry) => entry.brand === '!!!');

    expect(symbolBrand).toBeDefined();
    expect(symbolBrand?.isUsCasino).toBe(false);
  });
});
