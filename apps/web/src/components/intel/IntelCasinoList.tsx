/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
'use client';

import Link from 'next/link';
import type { CasinoSummary, ListFilters } from '@tiltcheck/intel-tools';
import { getScoreColor } from '@/lib/casino-trust';

function filterLabel(filters: ListFilters): string {
  const parts: string[] = [];
  if (filters.geo === 'us-crypto') parts.push('US crypto');
  if (filters.geo === 'us-sweeps') parts.push('US sweeps');
  if (filters.category) parts.push(filters.category);
  if (filters.query) parts.push(`"${filters.query}"`);
  return parts.join(' · ') || 'All tracked';
}

export default function IntelCasinoList({
  title,
  filters,
  casinos,
  onShare,
}: {
  title: string;
  filters: ListFilters;
  casinos: CasinoSummary[];
  onShare?: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[#283347] bg-black/20 p-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#17c3b2]">{filterLabel(filters)}</p>
          <h3 className="mt-1 text-base font-black text-white">{title}</h3>
        </div>
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="rounded-xl border border-[#17c3b2]/30 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#17c3b2] hover:bg-[#17c3b2]/10"
          >
            Share list
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {casinos.map((casino) => {
          const score = casino.liveScore ?? casino.score;
          const color = getScoreColor(score);
          return (
            <li key={casino.slug}>
              <Link
                href={casino.auditHref}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 px-3 py-2 transition-colors hover:border-[#17c3b2]/30"
              >
                <div>
                  <p className="text-sm font-bold text-white">{casino.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">{casino.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black" style={{ color }}>
                    {casino.liveScore ?? casino.grade}
                  </p>
                  <p className="text-[10px] text-gray-500">{casino.dataSource}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
