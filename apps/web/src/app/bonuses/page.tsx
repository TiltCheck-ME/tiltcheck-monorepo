/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import React from 'react';
import type { Metadata } from 'next';
import BonusGrid, { BonusEntry } from '@/components/BonusGrid';
import PublicPageHero from '@/components/PublicPageHero';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Daily Bonus Tracker | TiltCheck',
  description:
    'Sweepstakes and social casino bonuses sourced from CollectClock and TiltCheck inbox intel.',
  openGraph: {
    title: 'Daily Bonus Tracker | TiltCheck',
    description:
      'Sweepstakes and social casino bonuses sourced from CollectClock and TiltCheck inbox intel.',
    url: 'https://tiltcheck.me/bonuses',
  },
};

const COLLECTCLOCK_RAW_URL =
  'https://raw.githubusercontent.com/TiltCheck-ME/CollectClock/main/bonus-data.json';

const COLLECTCLOCK_SITE_URL = 'https://tiltcheck-me.github.io/CollectClock/';
const EMAIL_FEED_API_URL = (() => {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
  if (!apiBase) return null;
  return `${apiBase.replace(/\/$/, '')}/bonuses/inbox`;
})();

type BonusFeedResponse = {
  data?: BonusEntry[];
  available?: boolean;
  updatedAt?: string | null;
};

function normalizeBonusKey(entry: BonusEntry): string {
  return `${entry.brand.trim().toLowerCase()}::${entry.bonus.trim().toLowerCase()}::${entry.url.trim().toLowerCase()}`;
}

function mergeBonuses(...sources: BonusEntry[][]): BonusEntry[] {
  const byKey = new Map<string, BonusEntry>();

  for (const source of sources) {
    for (const entry of source) {
      const key = normalizeBonusKey(entry);
      const existing = byKey.get(key);

      if (!existing || Date.parse(entry.verified) > Date.parse(existing.verified)) {
        byKey.set(key, entry);
      }
    }
  }

  return [...byKey.values()].sort(
    (left, right) => Date.parse(right.verified) - Date.parse(left.verified)
  );
}

type BonusFeedResult = {
  bonuses: BonusEntry[];
  available: boolean;
  updatedAt: string | null;
};

async function fetchCollectClockBonuses(): Promise<BonusFeedResult> {
  try {
    const res = await fetch(COLLECTCLOCK_RAW_URL, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error(
        `[BonusTracker] CollectClock fetch failed: ${res.status} ${res.statusText}`
      );
      return { bonuses: [], available: false, updatedAt: null };
    }
    const data: BonusEntry[] = await res.json();
    const bonuses = Array.isArray(data) ? data : [];
    return {
      bonuses,
      available: bonuses.length > 0,
      updatedAt: bonuses[0]?.verified ?? null,
    };
  } catch (err) {
    console.error('[BonusTracker] Failed to load bonus data:', err);
    return { bonuses: [], available: false, updatedAt: null };
  }
}

async function fetchInboxBonuses(): Promise<BonusFeedResult> {
  if (!EMAIL_FEED_API_URL) {
    return { bonuses: [], available: false, updatedAt: null };
  }

  try {
    const res = await fetch(EMAIL_FEED_API_URL, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.error(
        `[BonusTracker] Inbox bonus feed fetch failed: ${res.status} ${res.statusText}`
      );
      return { bonuses: [], available: false, updatedAt: null };
    }
    const data: BonusFeedResponse = await res.json();
    const bonuses = Array.isArray(data.data) ? data.data : [];
    return {
      bonuses,
      available: Boolean(data.available) && bonuses.length > 0,
      updatedAt: data.updatedAt ?? bonuses[0]?.verified ?? null,
    };
  } catch (err) {
    console.error('[BonusTracker] Failed to load inbox bonus feed:', err);
    return { bonuses: [], available: false, updatedAt: null };
  }
}

export default async function BonusesPage() {
  const [collectClockFeed, inboxFeed] = await Promise.all([
    fetchCollectClockBonuses(),
    fetchInboxBonuses(),
  ]);
  const bonuses = mergeBonuses(inboxFeed.bonuses, collectClockFeed.bonuses);
  const hasAnyFeed = bonuses.length > 0;
  const sourceLabel = inboxFeed.available ? 'COLLECTCLOCK + EMAIL INBOX' : 'COLLECTCLOCK';

  return (
    <main className="public-page text-white">
      <PublicPageHero
        eyebrow="Bonus intel // CollectClock + email feed"
        title={
          <>
            Claim first.
            <br />
            Deposit later.
          </>
        }
        description={
          <p>
            Extend your play without depositing real money. CollectClock keeps the broad tracker live, and inbox-ingested
            casino emails fill in fresh drops that hit the community first.
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
        stats={[
          {
            label: 'Tracked offers',
            value: `${bonuses.length}`,
            description: `Merged from ${sourceLabel.toLowerCase()} so fresh drops do not live in disconnected silos.`,
          },
          {
            label: 'Refresh cadence',
            value: 'Hourly',
            description: 'CollectClock stays on the broad watch while inbox intel fills in faster community sightings.',
          },
          {
            label: 'Player move',
            value: 'Claim first',
            description: 'Use the tracker to stretch sessions with free value before real-money deposits even enter the picture.',
          },
        ]}
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-card">
            <div className="public-page-meta-strip">
              <span>Live feed</span>
              <span className="public-page-meta-strip__separator">/</span>
              <span>{bonuses.length} bonus{bonuses.length !== 1 ? 'es' : ''} tracked</span>
              <span className="public-page-meta-strip__separator">/</span>
              <span>refreshes hourly</span>
              <span className="public-page-meta-strip__separator">/</span>
              <span>sources: {sourceLabel.toLowerCase()}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          {!collectClockFeed.available && inboxFeed.available && (
            <div className="mb-6 public-page-card public-page-card--accent">
              <p className="text-xs font-mono uppercase tracking-widest text-[#17c3b2]">
                [COLLECTCLOCK OFFLINE] Showing inbox-discovered bonuses only.
              </p>
            </div>
          )}

          {!hasAnyFeed ? (
            <div className="public-page-card py-20 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-[#17c3b2] mb-2">
                [DATA UNAVAILABLE]
              </p>
              <p className="font-mono text-[#8a97a8] text-sm">
                CollectClock and inbox feeds are empty or unreachable. Check back shortly or visit{' '}
                <a
                  href={COLLECTCLOCK_SITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#17c3b2] hover:underline"
                >
                  CollectClock directly
                </a>
                .
              </p>
            </div>
          ) : (
            <BonusGrid bonuses={bonuses} />
          )}
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-cta-band">
            <p className="public-page-panel__eyebrow">Feed note</p>
            <h2 className="public-page-cta-band__title">Bonus data stays useful only if you still verify before claiming.</h2>
            <p className="public-page-cta-band__copy">
              CollectClock covers the broad tracker. TiltCheck inbox intel fills in newer drops. The tracker is a signal
              surface, not a replacement for checking terms with your own eyes.
            </p>
            <p className="public-page-cta-band__tagline">Made for Degens. By Degens.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
