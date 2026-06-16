/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-16 */
import React from 'react';
import type { Metadata } from 'next';
import DailyBonusFeed from '@/components/DailyBonusFeed';
import PublicPageHero from '@/components/PublicPageHero';
import {
  getDailyFeedApiUrl,
  type DailyBonusFeedResponse,
} from '@/lib/daily-bonus-feed';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'US Daily Bonus Feed | TiltCheck',
  description:
    'Daily bonus intel for US sweepstakes and social casinos — merged from CollectClock, email inbox parsing, and local cache.',
  openGraph: {
    title: 'US Daily Bonus Feed | TiltCheck',
    description:
      'Daily bonus intel for US sweepstakes and social casinos — merged from CollectClock, email inbox parsing, and local cache.',
    url: 'https://tiltcheck.me/bonuses',
  },
};

const COLLECTCLOCK_SITE_URL = 'https://tiltcheck-me.github.io/CollectClock/';

const EMPTY_FEED: DailyBonusFeedResponse = {
  updatedAt: new Date().toISOString(),
  total: 0,
  usTotal: 0,
  data: [],
  sources: [
    {
      key: 'email-inbox',
      label: 'Email inbox',
      available: false,
      count: 0,
      updatedAt: null,
      detail: 'No active inbox promos',
    },
    {
      key: 'collectclock',
      label: 'CollectClock',
      available: false,
      count: 0,
      updatedAt: null,
      detail: 'CollectClock unreachable',
    },
    {
      key: 'local-fallback',
      label: 'Local cache',
      available: false,
      count: 0,
      updatedAt: null,
      detail: 'No local cache',
    },
  ],
};

async function fetchDailyBonusFeed(): Promise<DailyBonusFeedResponse> {
  const apiUrl = getDailyFeedApiUrl(true);

  try {
    const response = await fetch(apiUrl, { next: { revalidate: 300 } });
    if (!response.ok) {
      console.error(`[BonusFeed] daily-feed fetch failed: ${response.status} ${response.statusText}`);
      return EMPTY_FEED;
    }
    return await response.json() as DailyBonusFeedResponse;
  } catch (error) {
    console.error('[BonusFeed] Failed to load daily bonus feed:', error);
    return EMPTY_FEED;
  }
}

export default async function BonusesPage() {
  const feed = await fetchDailyBonusFeed();
  const hasAnyFeed = feed.data.length > 0;
  const liveSources = feed.sources.filter((source) => source.available).map((source) => source.label);

  return (
    <main className="public-page public-page--tight text-white">
      <PublicPageHero
        compact
        eyebrow="Bonus intel"
        title="US daily bonus feed"
        description={
          <p>
            One lane for US casino promos — CollectClock daily trackers, parsed email drops, and cached intel merged into a single feed.
          </p>
        }
        actions={
          <a
            href={COLLECTCLOCK_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            data-text="VIEW COLLECTCLOCK"
          >
            VIEW COLLECTCLOCK
          </a>
        }
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          {!hasAnyFeed && (
            <div className="mb-6 public-page-card public-page-card--accent">
              <p className="text-xs font-mono uppercase tracking-widest text-[#17c3b2]">
                [FEED OFFLINE] All sources are empty or unreachable. Inbox crawler and CollectClock sync run on schedule — check back shortly.
              </p>
            </div>
          )}

          {hasAnyFeed && liveSources.length > 0 && (
            <div className="mb-6 public-page-card">
              <p className="text-xs font-mono uppercase tracking-widest text-[#8a97a8]">
                Live sources: {liveSources.join(' · ')} · {feed.usTotal} US casino offers indexed
              </p>
            </div>
          )}

          <DailyBonusFeed initialFeed={feed} usOnlyDefault />
        </div>
      </section>
    </main>
  );
}
