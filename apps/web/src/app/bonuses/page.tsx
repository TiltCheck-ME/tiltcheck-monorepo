// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17
import React from 'react';
import type { Metadata } from 'next';
import BonusGrid, { BonusEntry } from '@/components/BonusGrid';

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
    <main className="min-h-screen bg-[#0a0c10] text-white">
      {/* Page header */}
        <section className="border-b border-[#283347] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="brand-eyebrow">
            BONUS INTEL // COLLECTCLOCK + EMAIL FEED
          </p>
          <h1 className="brand-page-title">
            <span className="text-[#17c3b2]">Claim first.</span>
            <br />
            Deposit later.
          </h1>
          <p className="brand-lead mx-auto mb-6">
            Extend your play without depositing real money. CollectClock keeps the broad tracker live, and inbox-ingested casino emails fill in fresh drops that hit the community first.
          </p>
          <a
            href={COLLECTCLOCK_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-mono font-bold uppercase tracking-widest text-[#17c3b2] border border-[#17c3b2]/40 px-4 py-2 hover:bg-[#17c3b2]/10 transition-all duration-200"
          >
            VIEW COLLECTCLOCK &rarr;
          </a>
        </div>
      </section>

      {/* Stats bar */}
      <div className="border-b border-[#283347] bg-[#0d1117]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6 flex-wrap">
          <span className="text-xs font-mono uppercase tracking-widest text-[#8a97a8]">
            LIVE FEED:
          </span>
          <span className="text-xs font-mono font-bold text-[#17c3b2]">
            {bonuses.length} BONUS{bonuses.length !== 1 ? 'ES' : ''} TRACKED
          </span>
          <span className="text-xs font-mono text-[#4B5563]">|</span>
          <span className="text-xs font-mono text-[#8a97a8] uppercase tracking-widest">
            REFRESHES HOURLY
          </span>
          <span className="text-xs font-mono text-[#4B5563]">|</span>
          <span className="text-xs font-mono text-[#8a97a8] uppercase tracking-widest">
            SOURCES: {sourceLabel}
          </span>
        </div>
      </div>

      {/* Main content */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {!collectClockFeed.available && inboxFeed.available && (
            <div className="mb-6 border border-[#17c3b2]/30 bg-[#0d1117] px-4 py-3">
              <p className="text-xs font-mono uppercase tracking-widest text-[#17c3b2]">
                [COLLECTCLOCK OFFLINE] Showing inbox-discovered bonuses only.
              </p>
            </div>
          )}

          {!hasAnyFeed ? (
            <div className="py-20 text-center border border-[#283347] bg-[#0d1117]/40">
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

      {/* Footer note */}
      <section className="border-t border-[#283347] py-8 px-4 bg-[#0d1117]/60">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-[#4B5563] mb-2">
            Bonus data sourced from CollectClock and the TiltCheck casino inbox. Always verify before claiming.
          </p>
          <p className="text-sm font-black uppercase tracking-widest text-[#17c3b2]">
            Made for Degens. By Degens.
          </p>
        </div>
      </section>
    </main>
  );
}
