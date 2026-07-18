/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */
import React from 'react';
import type { Metadata } from 'next';
import BonusGrid, { type BonusEntry } from '@/components/BonusGrid';
import DailyBonusFeed from '@/components/DailyBonusFeed';
import PublicPageHero from '@/components/PublicPageHero';
import { fetchDailyBonusFeed } from '@/lib/daily-bonus-feed';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Daily Bonus Tracker | TiltCheck',
  description:
    'Free spins and daily promos at priority sweeps casinos — gathered from inbox, Discord drops, and CollectClock.',
  openGraph: {
    title: 'Daily Bonus Tracker | TiltCheck',
    description:
      'Free spins and daily promos at priority sweeps casinos — gathered from inbox, Discord drops, and CollectClock.',
    url: 'https://tiltcheck.me/bonuses',
  },
};

const COLLECTCLOCK_RAW_URL =
  'https://raw.githubusercontent.com/TiltCheck-ME/CollectClock/main/bonus-data.json';
const COLLECTCLOCK_SITE_URL = 'https://tiltcheck-me.github.io/CollectClock/';

async function fetchCollectClockFallback(): Promise<BonusEntry[]> {
  try {
    const res = await fetch(COLLECTCLOCK_RAW_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function BonusesPage() {
  const feed = await fetchDailyBonusFeed();
  const fallback = feed.available ? [] : await fetchCollectClockFallback();
  const useFallback = !feed.available && fallback.length > 0;

  return (
    <main className="public-page public-page--tight text-white">
      <PublicPageHero
        compact
        eyebrow="Daily promos"
        title="Free spins. Daily drops. Receipts optional."
        description={
          <p>
            Priority sweeps promos gathered for `/bonuses` — free spins, daily logins, and codes.
            Trusted inbox/Discord hits go live; public-page scrapes stay proposals until promoted.
            Always verify terms on the casino site.
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
          {feed.available ? (
            <DailyBonusFeed entries={feed.entries} sourceSummary={feed.sourceSummary} />
          ) : useFallback ? (
            <>
              <div className="mb-6 public-page-card public-page-card--accent">
                <p className="text-xs font-mono uppercase tracking-widest text-[#17c3b2]">
                  [DAILY-FEED OFFLINE] Showing CollectClock fallback only.
                </p>
              </div>
              <BonusGrid bonuses={fallback} />
              <p className="mt-8 text-center text-[11px] text-gray-600">Made for Degens. By Degens.</p>
            </>
          ) : (
            <div className="public-page-card py-20 text-center">
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[#17c3b2]">
                [NO LIVE PROMOS YET]
              </p>
              <p className="font-mono text-sm text-[#8a97a8]">
                Priority Sweeps gather has nothing live and CollectClock is unreachable. Run{' '}
                <code className="text-[#17c3b2]">pnpm ops:promos:gather</code> after inbox/Discord
                sources have data, or check back soon.
              </p>
              <p className="mt-8 text-[11px] text-gray-600">Made for Degens. By Degens.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
