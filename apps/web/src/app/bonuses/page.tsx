// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09
import React from 'react';
import type { Metadata } from 'next';
import BonusGrid, { BonusEntry } from '@/components/BonusGrid';

export const metadata: Metadata = {
  title: 'Daily Bonus Tracker | TiltCheck',
  description:
    'Sweepstakes and social casino daily login bonuses, verified by the community. Data sourced from CollectClock.',
  openGraph: {
    title: 'Daily Bonus Tracker | TiltCheck',
    description:
      'Sweepstakes and social casino daily login bonuses, verified by the community.',
    url: 'https://tiltcheck.me/bonuses',
  },
};

const COLLECTCLOCK_RAW_URL =
  'https://raw.githubusercontent.com/TiltCheck-ME/CollectClock/main/bonus-data.json';

const COLLECTCLOCK_SITE_URL = 'https://tiltcheck-me.github.io/CollectClock/';

async function fetchBonuses(): Promise<BonusEntry[]> {
  try {
    const res = await fetch(COLLECTCLOCK_RAW_URL, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error(
        `[BonusTracker] CollectClock fetch failed: ${res.status} ${res.statusText}`
      );
      return [];
    }
    const data: BonusEntry[] = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[BonusTracker] Failed to load bonus data:', err);
    return [];
  }
}

export default async function BonusesPage() {
  const bonuses = await fetchBonuses();

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      {/* Page header */}
      <section className="border-b border-[#283347] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">
            BONUS INTEL // COLLECTCLOCK DATA
          </p>
          <h1 className="neon neon-main text-4xl md:text-5xl mb-6" data-text="CLAIM FIRST. DEPOSIT LATER.">
            CLAIM FIRST. DEPOSIT LATER.
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono leading-relaxed mb-6">
            Extend your play without depositing real money. Every sweepstakes and social casino bonus worth claiming, community-verified and refreshed hourly. CollectClock data.
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
            SOURCE: COLLECTCLOCK
          </span>
        </div>
      </div>

      {/* Main content */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {bonuses.length === 0 ? (
            <div className="py-20 text-center border border-[#283347] bg-[#0d1117]/40">
              <p className="font-mono text-xs uppercase tracking-widest text-[#17c3b2] mb-2">
                [DATA UNAVAILABLE]
              </p>
              <p className="font-mono text-[#8a97a8] text-sm">
                CollectClock feed is unreachable. Check back shortly or visit{' '}
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
            Bonus data sourced from CollectClock. Last refreshed hourly. Always verify before claiming.
          </p>
          <p className="text-sm font-black uppercase tracking-widest text-[#17c3b2]">
            Made for Degens. By Degens.
          </p>
        </div>
      </section>
    </main>
  );
}
