/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
'use client';

import Link from 'next/link';
import type { CasinoSummary } from '@tiltcheck/intel-tools';
import { formatRiskLabel, getRiskBadgeStyle, getScoreColor } from '@/lib/casino-trust';

export default function IntelCasinoCard({ casino }: { casino: CasinoSummary }) {
  const score = casino.liveScore ?? casino.score;
  const color = getScoreColor(score);
  const riskStyle = getRiskBadgeStyle(casino.liveRisk ?? casino.risk);

  return (
    <article className="rounded-2xl border border-[#283347] bg-black/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">{casino.category}</p>
          <h3 className="mt-1 text-lg font-black text-white">{casino.name}</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black" style={{ color }}>{casino.liveScore ?? casino.grade}</p>
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
            {casino.liveScore ? 'live score' : casino.grade}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
          style={{ color: riskStyle.color, borderColor: riskStyle.border }}
        >
          {formatRiskLabel(casino.liveRisk ?? casino.risk)}
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-gray-400">
          {casino.dataSource}
        </span>
      </div>
      <Link
        href={casino.auditHref}
        className="mt-4 inline-flex text-[11px] font-black uppercase tracking-[0.16em] text-[#17c3b2] hover:underline"
      >
        Open full audit
      </Link>
    </article>
  );
}
