// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18
'use client';

import { useMemo, useState } from 'react';
import type { DailyBonusFeedEntry } from '@/lib/daily-bonus-feed';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'free_spins', label: 'Free spins' },
  { id: 'daily_login', label: 'Daily' },
  { id: 'code', label: 'Codes' },
  { id: 'other', label: 'Other' },
] as const;

function matchesFilter(entry: DailyBonusFeedEntry, filter: string): boolean {
  if (filter === 'all') return true;
  const type = (entry.bonusType || 'other').toLowerCase();
  if (filter === 'other') {
    return !['free_spins', 'daily_login', 'code', 'deposit_match'].includes(type);
  }
  return type === filter;
}

export default function DailyBonusFeed({
  entries,
  sourceSummary,
}: {
  entries: DailyBonusFeedEntry[];
  sourceSummary: string;
}) {
  const [filter, setFilter] = useState<string>('all');
  const visible = useMemo(
    () => entries.filter((e) => matchesFilter(e, filter)),
    [entries, filter],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`min-h-[36px] border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${
              filter === f.id
                ? 'border-[#17c3b2] bg-[#17c3b2] text-black'
                : 'border-[#283347] text-gray-400 hover:border-[#17c3b2]/50 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-[11px] font-mono uppercase tracking-[0.16em] text-gray-500">
        {visible.length} offers · {sourceSummary.toLowerCase()} · verify terms before claiming
      </p>

      {visible.length === 0 ? (
        <div className="public-page-card py-16 text-center">
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[#17c3b2]">
            [NO MATCHES]
          </p>
          <p className="font-mono text-sm text-[#8a97a8]">
            No live promos for this filter yet. Priority Sweeps gather is warming up — CollectClock
            rows still merge in when the API can reach them.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((entry) => (
            <article
              key={entry.id}
              className="public-page-card flex flex-col justify-between border border-[#283347] bg-[#0a0c10]/80 p-4"
            >
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#17c3b2]">
                    {entry.bonusType || 'offer'}
                  </span>
                  {(entry.sources || []).slice(0, 2).map((src) => (
                    <span
                      key={src}
                      className="border border-[#283347] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gray-500"
                    >
                      {src}
                    </span>
                  ))}
                  {entry.stale ? (
                    <span className="border border-yellow-500/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-yellow-400">
                      stale
                    </span>
                  ) : null}
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white">{entry.brand}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#c4ced8]">{entry.bonus}</p>
                {entry.code ? (
                  <p className="mt-2 font-mono text-xs uppercase tracking-widest text-[#ffd700]">
                    Code: {entry.code}
                  </p>
                ) : null}
                <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-gray-600">
                  Verified {entry.verified}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary text-[10px]"
                >
                  Open offer
                </a>
                {entry.slug ? (
                  <a
                    href={`/casinos/${entry.slug}`}
                    className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#17c3b2] hover:underline"
                  >
                    Trust page
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-[11px] text-gray-600">Made for Degens. By Degens.</p>
    </div>
  );
}
