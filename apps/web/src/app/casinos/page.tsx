/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PublicPageHero, { PublicPageSectionHeader } from '@/components/PublicPageHero';
import RtpDriftTicker from '@/components/RtpDriftTicker';
import CasinoGradingMethodology from '@/components/CasinoGradingMethodology';
import {
  ALL_CATEGORIES,
  CASINOS,
  PUBLIC_TRUST_SUPPORT_MODULES,
  TRUST_PILLAR_DEFINITIONS,
  type LiveTrustScore,
  casinoMatchesQuery,
  findLiveTrustScore,
  formatRiskLabel,
  formatTrustTimestamp,
  getCasinoPillarScore,
  getRiskBadgeStyle,
  getScoreColor,
  gradeFromNumericScore,
} from '@/lib/casino-trust';

const PAGE_SIZE = 18;

function PillarBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] font-black uppercase tracking-[0.18em]">
        <span className="text-gray-500">{label}</span>
        <span style={{ color }}>{score}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden bg-white/5">
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{ width: `${score}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}55` }}
        />
      </div>
    </div>
  );
}

function casinoHasInstantRedeem(casino: (typeof CASINOS)[number], enabledDomains: Set<string>): boolean {
  const candidates = [
    casino.monitoredDomain,
    ...(casino.domainCandidates ?? []),
  ]
    .filter(Boolean)
    .map((domain) => String(domain).replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase());
  return candidates.some((domain) => enabledDomains.has(domain));
}

export default function CasinosPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [liveScores, setLiveScores] = useState<LiveTrustScore[]>([]);
  const [liveSource, setLiveSource] = useState('unavailable');
  const [instantRedeemDomains, setInstantRedeemDomains] = useState<Set<string>>(new Set());

  useEffect(() => {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me').replace(/\/$/, '');

    fetch(`${apiUrl}/rgaas/casino-scores`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { casinos?: LiveTrustScore[]; source?: string } | null) => {
        setLiveScores(Array.isArray(payload?.casinos) ? payload.casinos : []);
        setLiveSource(payload?.source ?? 'unavailable');
      })
      .catch(() => {
        setLiveScores([]);
        setLiveSource('unavailable');
      });

    fetch(`${apiUrl}/v1/redeem/capabilities`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { capabilities?: Array<{ domain?: string }> } | null) => {
        const domains = new Set(
          (payload?.capabilities ?? [])
            .map((entry) => String(entry.domain || '').toLowerCase())
            .filter(Boolean),
        );
        setInstantRedeemDomains(domains);
      })
      .catch(() => {
        setInstantRedeemDomains(new Set());
      });
  }, []);

  const filteredCasinos = useMemo(() => (
    CASINOS.filter((casino) => {
      const matchesCategory = category === 'All' || casino.category === category;
      return matchesCategory && casinoMatchesQuery(casino, query);
    })
  ), [category, query]);

  const liveMatchedCount = useMemo(() => (
    CASINOS.reduce((count, casino) => count + (findLiveTrustScore(casino, liveScores) ? 1 : 0), 0)
  ), [liveScores]);
  const liveFeedLabel = liveSource === 'unavailable' ? 'feed unavailable' : liveSource;

  const totalPages = Math.max(1, Math.ceil(filteredCasinos.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedCasinos = filteredCasinos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [category, query]);

  return (
    <main className="public-page public-page--tight text-white">
      <PublicPageHero
        compact
        eyebrow="Casino trust"
        title="Look up the operator. Read the proof."
        description={
          <p>
            Grades, pillars, license basis, and known issues on every card. Instant Redeem badges
            mark operators (or their payment processors) who ship paid-and-now exits.{' '}
            <Link href="#grading-methodology" className="text-[#17c3b2] hover:underline">
              How grades are built
            </Link>
            {' · '}
            <Link href="/operators/instant-redeem" className="text-[#17c3b2] hover:underline">
              Operator Instant Redeem
            </Link>
            .
          </p>
        }
      />

      <CasinoGradingMethodology />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <p className="mb-4 text-[11px] font-mono uppercase tracking-[0.16em] text-gray-500">
            {CASINOS.length} tracked · {liveMatchedCount} live matches · {instantRedeemDomains.size} Instant Redeem · feed: {liveFeedLabel}
          </p>
          <div className="mb-8 flex flex-col gap-4 lg:flex-row">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search casino or domain..."
              className="flex-1 rounded-2xl border border-[#283347] bg-black/40 px-5 py-4 text-sm text-white outline-none transition-colors focus:border-[#17c3b2]"
            />
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setCategory(entry)}
                  className={`rounded-xl border px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                    category === entry
                      ? 'border-[#17c3b2] bg-[#17c3b2]/10 text-[#17c3b2]'
                      : 'border-[#283347] text-gray-400 hover:border-[#17c3b2]/30 hover:text-white'
                  }`}
                >
                  {entry}
                </button>
              ))}
            </div>
          </div>

          <p className="mb-6 text-[11px] font-mono uppercase tracking-[0.18em] text-gray-500">
            Showing {pagedCasinos.length} of {filteredCasinos.length} lookup results
          </p>

          {pagedCasinos.length === 0 ? (
            <div className="rounded-2xl border border-[#283347] bg-black/30 px-6 py-12 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">No match</p>
              <p className="mt-3 text-sm text-gray-400">No casino matched that search. Tighten the spelling or try the domain.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {pagedCasinos.map((casino) => {
                const live = findLiveTrustScore(casino, liveScores);
                const displayScore = live ? Math.round(live.currentScore) : casino.score;
                const displayGrade = live ? gradeFromNumericScore(displayScore) : casino.grade;
                const displayRisk = live ? formatRiskLabel(live.riskLevel) : formatRiskLabel(casino.risk);
                const riskStyle = getRiskBadgeStyle(displayRisk);
                const scoreColor = getScoreColor(displayScore);
                const violationCount = casino.meta.violations?.length ?? 0;
                const hasInstantRedeem = casinoHasInstantRedeem(casino, instantRedeemDomains);

                const violations = casino.meta.violations ?? [];
                const previewViolations = violations.slice(0, 2);

                return (
                  <article key={casino.slug} className="public-page-card p-6 border border-[#283347]/50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">{casino.category}</p>
                        <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">{casino.name}</h2>
                        <p className="mt-2 text-sm font-mono text-gray-500">{casino.monitoredDomain ?? 'Domain not curated yet'}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-black" style={{ color: scoreColor }}>{displayGrade}</div>
                        <p className="text-[11px] font-mono text-gray-500">{displayScore}/100</p>
                        <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-gray-600">
                          {live ? 'Live overlay' : `Curated ${casino.grade}`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className="border px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em]"
                        style={{ color: riskStyle.color, borderColor: riskStyle.border }}
                      >
                        {displayRisk} risk
                      </span>
                      <span className="border border-[#283347] px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
                        {live ? 'Live score matched' : 'Curated baseline'}
                      </span>
                      {live && (
                        <span className="border border-[#17c3b2]/30 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2]">
                          {live.events24h} events / 24h
                        </span>
                      )}
                      {hasInstantRedeem && (
                        <span
                          className="border border-[#17c3b2]/50 bg-[#17c3b2]/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2]"
                          title="Operator or payment processor enabled Instant Redeem on this domain"
                        >
                          Instant Redeem
                        </span>
                      )}
                      {violationCount > 0 && (
                        <span className="border border-[#ef4444]/30 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#ef4444]">
                          {violationCount} known issues
                        </span>
                      )}
                    </div>

                    {live?.updatedAt && (
                      <p className="mt-3 text-[10px] font-mono uppercase tracking-wider text-gray-500">
                        Live feed updated {formatTrustTimestamp(live.updatedAt)}
                      </p>
                    )}

                    <div className="mt-5 space-y-3">
                      {TRUST_PILLAR_DEFINITIONS.map((pillar) => (
                        <PillarBar
                          key={pillar.key}
                          label={pillar.shortLabel}
                          score={getCasinoPillarScore(casino, pillar.key)}
                          color={scoreColor}
                        />
                      ))}
                    </div>

                    <div className="mt-5 rounded-xl border border-[#283347] bg-black/30 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                        Curated evidence on this card
                      </p>
                      <dl className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <dt className="text-gray-500 shrink-0">License basis</dt>
                          <dd className="text-right text-gray-300">{casino.meta.license ?? 'Not curated yet'}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-gray-500 shrink-0">Baseline grade</dt>
                          <dd className="text-right text-white font-mono">{casino.grade}</dd>
                        </div>
                      </dl>
                      {previewViolations.length > 0 ? (
                        <ul className="mt-3 space-y-1.5 text-xs text-gray-400 leading-relaxed list-disc list-inside">
                          {previewViolations.map((violation) => (
                            <li key={violation}>{violation}</li>
                          ))}
                          {violations.length > previewViolations.length && (
                            <li className="list-none text-[10px] font-mono uppercase tracking-wider text-gray-500">
                              +{violations.length - previewViolations.length} more on full audit
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                          No curated violations attached. That is not a clean bill — just no documented issue on file yet.
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={`/casinos/${casino.slug}`}
                        className="inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20"
                      >
                        Full audit
                      </Link>
                      {casino.affiliateUrl && (
                        <a
                          href={casino.affiliateUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30"
                        >
                          Visit casino
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-[#283347] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-gray-300 transition-all hover:border-[#17c3b2]/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-gray-500">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-[#283347] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-gray-300 transition-all hover:border-[#17c3b2]/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <PublicPageSectionHeader
            compact
            eyebrow="More tools"
            title="Double-check before you deposit."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PUBLIC_TRUST_SUPPORT_MODULES.map((module) => (
              <article key={module.key} className="rounded-2xl border border-[#283347] bg-black/30 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">{module.eyebrow}</p>
                <h3 className="mt-3 text-xl font-black uppercase tracking-tight text-white">{module.title}</h3>
                <p className="mt-3 text-sm text-gray-400">{module.description}</p>
                <Link
                  href={module.href}
                  className="mt-5 inline-flex items-center justify-center rounded-xl border border-[#283347] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30 hover:text-[#17c3b2]"
                >
                  {module.ctaLabel}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <RtpDriftTicker />
    </main>
  );
}
