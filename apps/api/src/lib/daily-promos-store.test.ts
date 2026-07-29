// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18
import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import {
  getLiveDailyPromos,
  isPromoExpired,
  isPromoStale,
  readDailyPromosLive,
} from './daily-promos-store.js';

describe('daily-promos-store', () => {
  it('marks expired promos', () => {
    expect(
      isPromoExpired({
        id: '1',
        brand: 'Pulsz',
        slug: 'pulsz',
        bonus: '10 free spins',
        bonusType: 'free_spins',
        code: null,
        url: 'https://www.pulsz.com/',
        source: 'email-inbox',
        verified: '2026-07-01',
        asOf: '2026-07-01T00:00:00.000Z',
        expiresAt: '2020-01-01T00:00:00.000Z',
        expiryMessage: null,
        imageUrl: null,
        status: 'live',
      }),
    ).toBe(true);
  });

  it('marks stale when verified older than 7 days', () => {
    expect(
      isPromoStale({
        id: '2',
        brand: 'McLuck',
        slug: 'mcluck',
        bonus: 'Daily login',
        bonusType: 'daily_login',
        code: null,
        url: 'https://www.mcluck.com/',
        source: 'discord',
        verified: '2020-01-01',
        asOf: '2020-01-01T00:00:00.000Z',
        expiresAt: null,
        expiryMessage: null,
        imageUrl: null,
        status: 'live',
      }),
    ).toBe(true);
  });

  it('loads live file and drops ancient rows', () => {
    const dir = path.join(tmpdir(), `daily-promos-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, 'daily-promos.live.json');
    writeFileSync(
      filePath,
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        promos: [
          {
            id: 'fresh',
            brand: 'Stake.us',
            slug: 'stake-us',
            bonus: '5 free spins',
            bonusType: 'free_spins',
            code: null,
            url: 'https://stake.us/',
            source: 'email-inbox',
            verified: new Date().toISOString().slice(0, 10),
            asOf: new Date().toISOString(),
            expiresAt: null,
            expiryMessage: null,
            imageUrl: null,
            status: 'live',
          },
          {
            id: 'ancient',
            brand: 'Pulsz',
            slug: 'pulsz',
            bonus: 'old',
            bonusType: 'other',
            code: null,
            url: 'https://www.pulsz.com/',
            source: 'discord',
            verified: '2019-01-01',
            asOf: '2019-01-01T00:00:00.000Z',
            expiresAt: null,
            expiryMessage: null,
            imageUrl: null,
            status: 'live',
          },
        ],
      }),
      'utf8',
    );

    const file = readDailyPromosLive(filePath);
    expect(file.promos).toHaveLength(2);
    const live = getLiveDailyPromos(filePath);
    expect(live.map((p) => p.id)).toEqual(['fresh']);
    rmSync(dir, { recursive: true, force: true });
  });
});
