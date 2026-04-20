/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardHandoffUrl } from '@/lib/dashboard-handoff';
import {
  type CasinoEntry,
  type LiveTrustScore,
  PUBLIC_TRUST_SUPPORT_MODULES,
  SCAM_FLAGS,
  findLiveTrustScore,
  formatRiskLabel,
  getRiskBadgeStyle,
  getScoreColor,
  gradeFromNumericScore,
} from '@/lib/casino-trust';
import type { CasinoSeedAuditSurface } from '@/lib/seed-audit-surface';

const LOGIN_URL = '/login?redirect=%2Fdashboard';

type FetchState = 'loading' | 'ready' | 'unavailable';

interface LicenseInfo {
  found: boolean;
  brand?: string | null;
  regulator?: string | null;
  regulatorName?: string | null;
  regulatorTier?: number | null;
  licenseId?: string | null;
  note?: string | null;
  verifyUrl?: string | null;
  active?: boolean;
}

interface DomainResult {
  safe: boolean;
  riskLevel: string;
  message: string;
}

interface ShadowFlag {
  name: string;
  flag: string;
  severity: 'high' | 'medium' | 'low';
  detectedAt: string;
}

interface ScamEntry {
  domain: string;
  source: string;
  classification: string;
}

interface BonusEntry {
  brand: string;
  bonus: string;
  url: string;
  verified: string;
  code: string | null;
}

interface RtpProviderEntry {
  providerName: string;
  gameTitle: string;
  latestReportedRtp: number;
  providerMaxRtp: number;
  delta: number;
  legalTrigger?: {
    tier?: string;
    summary?: string;
  } | null;
}

interface ProofState {
  liveStatus: FetchState;
  liveSource: string;
  liveScore: LiveTrustScore | null;
  licenseStatus: FetchState;
  license: LicenseInfo | null;
  domainStatus: FetchState;
  domainResult: DomainResult | null;
  shadowStatus: FetchState;
  shadowMessage: string | null;
  shadowSupportedSignals: string[];
  shadowFlags: ShadowFlag[];
  scamStatus: 'loading' | 'available' | 'empty' | 'unavailable';
  scamMessage: string | null;
  scamSource: string | null;
  scamMatches: ScamEntry[];
  rtpStatus: FetchState;
  rtpDataNote: string | null;
  rtpProviders: RtpProviderEntry[];
  bonusStatus: FetchState;
  bonusMessage: string | null;
  bonusUpdatedAt: string | null;
  bonusHiddenCount: number;
  bonusMatches: BonusEntry[];
}

const INITIAL_PROOF_STATE: ProofState = {
  liveStatus: 'loading',
  liveSource: 'unavailable',
  liveScore: null,
  licenseStatus: 'loading',
  license: null,
  domainStatus: 'loading',
  domainResult: null,
  shadowStatus: 'loading',
  shadowMessage: null,
  shadowSupportedSignals: [],
  shadowFlags: [],
  scamStatus: 'loading',
  scamMessage: null,
  scamSource: null,
  scamMatches: [],
  rtpStatus: 'loading',
  rtpDataNote: null,
  rtpProviders: [],
  bonusStatus: 'loading',
  bonusMessage: null,
  bonusUpdatedAt: null,
  bonusHiddenCount: 0,
  bonusMatches: [],
};

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

function formatDate(value?: string | null): string {
  if (!value) {
    return 'Unknown';
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return 'Unknown';
  }

  return new Date(parsed).toLocaleDateString();
}

function ProofBadge({ status }: { status: 'live' | 'baseline' | 'warning' | 'unavailable' }) {
  const styles = {
    live: 'border-[#17c3b2]/40 text-[#17c3b2] bg-[#17c3b2]/10',
    baseline: 'border-[#283347] text-gray-300 bg-black/20',
    warning: 'border-[#ffd700]/30 text-[#ffd700] bg-[#ffd700]/10',
    unavailable: 'border-[#ef4444]/30 text-[#ef4444] bg-[#ef4444]/10',
  };

  const labels = {
    live: 'Live proof',
    baseline: 'Baseline proof',
    warning: 'Partial proof',
    unavailable: 'Unavailable',
  };

  return (
    <span className={`inline-flex items-center border px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

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

function ProofCard({
  eyebrow,
  title,
  description,
  status,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  status: 'live' | 'baseline' | 'warning' | 'unavailable';
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-[#283347] bg-black/40 p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">{eyebrow}</p>
          <h2 className="text-xl font-black uppercase tracking-tight text-white">{title}</h2>
          <p className="mt-2 text-sm text-gray-400">{description}</p>
        </div>
        <ProofBadge status={status} />
      </div>
      {children}
    </article>
  );
}

export default function CasinoProofPage({ casino, seedAudit }: { casino: CasinoEntry; seedAudit: CasinoSeedAuditSurface }) {
  const { user, loading: authLoading } = useAuth();
  const [proof, setProof] = useState<ProofState>(INITIAL_PROOF_STATE);

  const primaryDomain = casino.monitoredDomain ?? casino.domainCandidates[0] ?? null;
  const staticScoreColor = getScoreColor(casino.score);

  const apiUrl = useMemo(() => (
    (process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me').replace(/\/$/, '')
  ), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadProof() {
      const domainQuery = primaryDomain ? encodeURIComponent(primaryDomain) : null;
      const licenseAuthority = casino.meta.license?.split(' / ')[0]?.trim() || undefined;

      const requests = await Promise.allSettled([
        fetch(`${apiUrl}/rgaas/casino-scores`, { signal: controller.signal, cache: 'no-store' }),
        primaryDomain && domainQuery
          ? fetch(`${apiUrl}/rgaas/license-check?domain=${domainQuery}`, { signal: controller.signal, cache: 'no-store' })
          : Promise.resolve(null),
        primaryDomain && domainQuery
          ? fetch(`${apiUrl}/rgaas/domain-check?domain=${domainQuery}`, { signal: controller.signal, cache: 'no-store' })
          : Promise.resolve(null),
        fetch(`${apiUrl}/rgaas/shadow-bans`, { signal: controller.signal, cache: 'no-store' }),
        fetch(`${apiUrl}/rgaas/scam-domains`, { signal: controller.signal, cache: 'no-store' }),
        primaryDomain
          ? fetch(
            `${apiUrl}/rgaas/rtp/discrepancy/${encodeURIComponent(primaryDomain)}${licenseAuthority ? `?licenseAuthority=${encodeURIComponent(licenseAuthority)}` : ''}`,
            { signal: controller.signal, cache: 'no-store' },
          )
          : Promise.resolve(null),
        fetch(`${apiUrl}/bonuses/inbox`, {
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'include',
          headers: (() => {
            const token = typeof window !== 'undefined' ? window.localStorage.getItem('tc_token')?.trim() || null : null;
            return token ? { Authorization: `Bearer ${token}` } : undefined;
          })(),
        }),
      ]);

      if (cancelled) {
        return;
      }

      const nextState: ProofState = {
        ...INITIAL_PROOF_STATE,
        licenseStatus: primaryDomain ? 'unavailable' : 'unavailable',
        domainStatus: primaryDomain ? 'unavailable' : 'unavailable',
        rtpStatus: primaryDomain ? 'unavailable' : 'unavailable',
      };

      const [
        liveResult,
        licenseResult,
        domainResult,
        shadowResult,
        scamResult,
        rtpResult,
        bonusResult,
      ] = requests;

      if (liveResult.status === 'fulfilled' && liveResult.value?.ok) {
        const livePayload = await liveResult.value.json() as { casinos?: LiveTrustScore[]; source?: string };
        const liveScores = Array.isArray(livePayload.casinos) ? livePayload.casinos : [];
        nextState.liveScore = findLiveTrustScore(casino, liveScores);
        nextState.liveSource = livePayload.source ?? 'unavailable';
        nextState.liveStatus = nextState.liveScore ? 'ready' : 'unavailable';
      } else {
        nextState.liveStatus = 'unavailable';
      }

      if (primaryDomain && licenseResult.status === 'fulfilled' && licenseResult.value?.ok) {
        nextState.license = await licenseResult.value.json() as LicenseInfo;
        nextState.licenseStatus = 'ready';
      } else {
        nextState.licenseStatus = 'unavailable';
      }

      if (primaryDomain && domainResult.status === 'fulfilled' && domainResult.value?.ok) {
        const domainPayload = await domainResult.value.json() as DomainResult;
        nextState.domainResult = domainPayload;
        nextState.domainStatus = 'ready';
      } else {
        nextState.domainStatus = 'unavailable';
      }

      if (shadowResult.status === 'fulfilled' && shadowResult.value?.ok) {
        const shadowPayload = await shadowResult.value.json() as {
          availability?: 'available' | 'unavailable';
          message?: string;
          supportedSignals?: string[];
          flags?: ShadowFlag[];
        };
        const keys = [
          normalizeName(casino.name),
          ...casino.domainCandidates.map((domain) => normalizeName(domain)),
        ];
        const flags = (Array.isArray(shadowPayload.flags) ? shadowPayload.flags : []).filter((flag) => {
          const haystack = `${flag.name} ${flag.flag}`.toLowerCase();
          return keys.some((key) => haystack.includes(key));
        });
        nextState.shadowStatus = shadowPayload.availability === 'available' ? 'ready' : 'unavailable';
        nextState.shadowMessage = shadowPayload.message ?? null;
        nextState.shadowSupportedSignals = Array.isArray(shadowPayload.supportedSignals)
          ? shadowPayload.supportedSignals
          : [];
        nextState.shadowFlags = flags;
      } else {
        nextState.shadowStatus = 'unavailable';
        nextState.shadowMessage = 'Trust Engine payout and ToS feed unavailable.';
      }

      if (scamResult.status === 'fulfilled' && scamResult.value?.ok) {
        const scamPayload = await scamResult.value.json() as {
          availability?: 'available' | 'empty' | 'unavailable';
          message?: string;
          source?: string | null;
          scams?: ScamEntry[];
        };
        const matches = (Array.isArray(scamPayload.scams) ? scamPayload.scams : []).filter((entry) =>
          casino.domainCandidates.some((domain) => entry.domain === domain || domain.endsWith(`.${entry.domain}`) || entry.domain.endsWith(`.${domain}`))
        );
        nextState.scamStatus = scamPayload.availability ?? 'unavailable';
        nextState.scamMessage = scamPayload.message ?? null;
        nextState.scamSource = scamPayload.source ?? null;
        nextState.scamMatches = matches;
      } else {
        nextState.scamStatus = 'unavailable';
        nextState.scamMessage = 'Repository blacklist unavailable.';
      }

      if (primaryDomain && rtpResult.status === 'fulfilled' && rtpResult.value?.ok) {
        const rtpPayload = await rtpResult.value.json() as {
          providerBreakdown?: RtpProviderEntry[];
          dataNote?: string;
        };
        nextState.rtpStatus = 'ready';
        nextState.rtpDataNote = rtpPayload.dataNote ?? null;
        nextState.rtpProviders = Array.isArray(rtpPayload.providerBreakdown) ? rtpPayload.providerBreakdown : [];
      } else {
        nextState.rtpStatus = 'unavailable';
        nextState.rtpDataNote = primaryDomain
          ? 'RTP proof unavailable.'
          : 'No monitored domain available. RTP proof cannot run without a platform target.';
      }

      if (bonusResult.status === 'fulfilled' && bonusResult.value?.ok) {
        const bonusPayload = await bonusResult.value.json() as {
          available?: boolean;
          updatedAt?: string | null;
          message?: string;
          suppression?: {
            active?: boolean;
            hiddenCount?: number;
          };
          data?: BonusEntry[];
        };
        const normalizedBrand = normalizeName(casino.name);
        const bonusMatches = (Array.isArray(bonusPayload.data) ? bonusPayload.data : []).filter((entry) => {
          const entryBrand = normalizeName(entry.brand);
          const entryHost = extractHostname(entry.url);
          return (
            entryBrand === normalizedBrand ||
            casino.domainCandidates.some((domain) => entryHost === domain || entryHost?.endsWith(`.${domain}`))
          );
        });
        nextState.bonusStatus = bonusPayload.available ? 'ready' : 'unavailable';
        nextState.bonusMessage = bonusPayload.message ?? null;
        nextState.bonusUpdatedAt = bonusPayload.updatedAt ?? null;
        nextState.bonusHiddenCount = Math.max(0, Number(bonusPayload.suppression?.hiddenCount ?? 0));
        nextState.bonusMatches = bonusMatches.sort((left, right) => Date.parse(right.verified) - Date.parse(left.verified));
      } else {
        nextState.bonusStatus = 'unavailable';
        nextState.bonusMessage = 'Bonus inbox unavailable.';
      }

      setProof(nextState);
    }

    void loadProof();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiUrl, casino, primaryDomain]);

  const liveGrade = proof.liveScore ? gradeFromNumericScore(Math.round(proof.liveScore.currentScore)) : casino.grade;
  const liveRisk = proof.liveScore
    ? formatRiskLabel(proof.liveScore.riskLevel)
    : formatRiskLabel(casino.risk);
  const liveRiskStyle = getRiskBadgeStyle(liveRisk);
  const liveScoreColor = getScoreColor(proof.liveScore ? Math.round(proof.liveScore.currentScore) : casino.score);
  const violationCount = casino.meta.violations?.length ?? 0;
  const primaryActionHref = authLoading ? '#' : user?.userId ? getDashboardHandoffUrl('/dashboard') : LOGIN_URL;
  const hasLiveFeed = proof.liveSource !== 'unavailable';
  const liveProofStatus = proof.liveScore ? 'live' : hasLiveFeed ? 'warning' : 'unavailable';
  const licenseProofStatus = !primaryDomain
    ? 'unavailable'
    : proof.licenseStatus === 'ready' && proof.domainStatus === 'ready' && Boolean(proof.license?.found)
      ? 'live'
      : proof.licenseStatus === 'ready' || proof.domainStatus === 'ready'
        ? 'warning'
        : 'unavailable';
  const liveSourceLabel = hasLiveFeed ? proof.liveSource : 'Feed unavailable';
  const lastLiveUpdateLabel = proof.liveScore?.updatedAt
    ? formatDate(proof.liveScore.updatedAt)
    : hasLiveFeed
      ? 'No live match timestamp'
      : 'Feed unavailable';
  const seedAuditStatus = seedAudit.summary.statusTone;
  const seedAuditRequiredFields = seedAudit.support.requiredFields;

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#283347] px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">
            <Link href="/casinos" className="hover:text-[#17c3b2]">Casinos</Link>
            <span>/</span>
            <span>{casino.name}</span>
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">Public trust evidence</p>
              <h1 className="text-4xl font-black uppercase tracking-tighter md:text-6xl">{casino.name}</h1>
              <p className="mt-5 max-w-3xl text-base text-gray-400 md:text-lg">
                This page frames the broader trust read for {casino.name}. Manual bet verification stays on /tools/verify.
                Here, TiltCheck separates proof quality, public verification coverage, and other trust evidence without faking certainty.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span
                  className="border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]"
                  style={{ color: liveRiskStyle.color, borderColor: liveRiskStyle.border }}
                >
                  {liveRisk} risk
                </span>
                <span className="border border-[#283347] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
                  {casino.category}
                </span>
                <span className="border border-[#283347] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
                  {primaryDomain ?? 'Domain unavailable'}
                </span>
                {proof.liveScore && (
                  <span className="border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2]">
                    {proof.liveScore.events24h} live events / 24h
                  </span>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/casinos"
                  className="inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20"
                >
                  Back to lookup
                </Link>
                <a
                  href="#supporting-proof-modules"
                  className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30"
                >
                  Open supporting modules
                </a>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[#283347] bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">Manual bet verification</p>
                  <p className="mt-2 text-sm text-gray-400">
                    /tools/verify is the raw math checker. Use it when you already have the seeds, nonce, and exact bet inputs.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#283347] bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">Proof quality</p>
                  <p className="mt-2 text-sm text-gray-400">
                    This page shows partial proof when feeds are thin and says insufficient sample when public coverage is missing or stale.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#283347] bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">Other trust evidence</p>
                  <p className="mt-2 text-sm text-gray-400">
                    Licensing, payout friction, scam flags, bonus evidence, and RTP references stay separate so one proof lane does not pretend to cover all of them.
                  </p>
                </div>
              </div>
            </div>

            <aside className="rounded-2xl border border-[#283347] bg-black/40 p-6">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">Current read</p>
              <div className="flex items-end justify-between gap-4 border-b border-[#283347] pb-5">
                <div>
                  <div className="text-5xl font-black" style={{ color: liveScoreColor }}>{liveGrade}</div>
                  <p className="text-sm text-gray-400">
                    {proof.liveScore ? `${Math.round(proof.liveScore.currentScore)}/100 live score` : `${casino.score}/100 curated baseline`}
                  </p>
                </div>
                <ProofBadge status={proof.liveScore ? 'live' : 'baseline'} />
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-500">Curated license basis</dt>
                  <dd className="text-right text-white">{casino.meta.license ?? 'Not curated'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-500">Known violations</dt>
                  <dd className="text-right text-white">{violationCount}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-500">Live feed source</dt>
                  <dd className="text-right text-white">{liveSourceLabel}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-500">Last live update</dt>
                  <dd className="text-right text-white">{lastLiveUpdateLabel}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 xl:grid-cols-3">
          <ProofCard
            eyebrow="Seed health auditor"
            title="Proof quality + seed hygiene"
            description="Engine-backed read of the proof inputs attached to this surface. Manual single-bet verification stays separate."
            status={seedAuditStatus}
          >
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-[#283347] bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Current read</p>
                  <p className="mt-2 text-sm font-black uppercase text-white">{seedAudit.summary.categoryLabel}</p>
                  <p className="mt-2 text-sm text-gray-400">{seedAudit.result.proofQuality.summary}</p>
                </div>
                <div className="rounded-xl border border-[#283347] bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Confidence + sample</p>
                  <p className="mt-2 text-sm font-black uppercase text-white">{seedAudit.result.proofQuality.confidence} confidence</p>
                  <p className="mt-2 text-sm text-gray-400">{seedAudit.summary.sampleSummary}</p>
                </div>
              </div>

              <div className="rounded-xl border border-[#283347] bg-black/30 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Formula comparison</p>
                <p className="mt-2 text-sm text-white">{seedAudit.summary.formulaSummary}</p>
                <p className="mt-2 text-sm text-gray-400">{seedAudit.summary.continuitySummary}</p>
              </div>

              <div className="rounded-xl border border-[#283347] bg-black/30 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Seed-health findings</p>
                {seedAudit.summary.highlightedFindings.length > 0 ? (
                  <ul className="mt-3 space-y-3">
                    {seedAudit.summary.highlightedFindings.map((finding) => (
                      <li key={`${finding.code}-${finding.summary}`} className="border border-[#283347] bg-black/40 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2]">
                          {finding.code.replace(/-/g, ' ')}
                        </p>
                        <p className="mt-2 text-sm text-white">{finding.summary}</p>
                        {finding.recommendation && (
                          <p className="mt-2 text-sm text-gray-400">{finding.recommendation}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-gray-400">{seedAudit.summary.findingSummary}</p>
                )}
              </div>

              <div className="rounded-xl border border-[#283347] bg-black/30 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Support metadata</p>
                <p className="mt-2 text-sm text-white">{seedAudit.support.summary}</p>
                <dl className="mt-3 space-y-2 text-sm text-gray-400">
                  <div className="flex items-start justify-between gap-4">
                    <dt>Algorithm</dt>
                    <dd className="text-right text-white">{seedAudit.support.algorithmName}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt>Hash family</dt>
                    <dd className="text-right text-white">{seedAudit.support.hashFamily}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt>Formula variant</dt>
                    <dd className="text-right text-white">{seedAudit.support.formulaVariant}</dd>
                  </div>
                </dl>
                {seedAuditRequiredFields.length > 0 && (
                  <p className="mt-3 text-[11px] font-mono text-gray-500">
                    Needs: {seedAuditRequiredFields.join(' · ')}
                  </p>
                )}
                {seedAudit.summary.highlightedEvidence.length > 0 && (
                  <ul className="mt-3 space-y-2 text-[11px] font-mono text-gray-500">
                    {seedAudit.summary.highlightedEvidence.map((evidence) => (
                      <li key={`${evidence.code}-${evidence.summary}`}>{evidence.summary}</li>
                    ))}
                  </ul>
                )}
              </div>

              {seedAudit.summary.proofNotes.length > 0 && (
                <ul className="space-y-2 text-[11px] font-mono text-gray-500">
                  {seedAudit.summary.proofNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </div>
          </ProofCard>

          <ProofCard
            eyebrow="Live trust engine"
            title="Casino score"
            description="Pulled from the live trust-rollup feed when available. This is a proof-quality read, not manual bet verification."
            status={liveProofStatus}
          >
            {proof.liveScore ? (
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <div className="text-4xl font-black" style={{ color: liveScoreColor }}>
                    {Math.round(proof.liveScore.currentScore)}
                  </div>
                  <span className="text-sm text-gray-400">{liveGrade} grade</span>
                </div>
                <p className="text-sm text-gray-300">
                  Risk level: <span style={{ color: liveRiskStyle.color }}>{liveRisk}</span>
                </p>
                <p className="text-sm text-gray-400">
                  {proof.liveScore.events24h} live trust events were observed in the last 24 hours.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                {hasLiveFeed
                  ? 'The live trust feed is up, but it returned no current casino or domain match for this page. Treat that as partial proof, not a clean read.'
                  : 'Live trust feed unavailable. The page falls back to curated baseline only, which is an insufficient sample for live proof quality.'}
              </p>
            )}
          </ProofCard>

          <ProofCard
            eyebrow="Registry + domain"
            title="License and domain verification"
            description="Runs the current monitored domain through the license registry and SusLink."
            status={licenseProofStatus}
          >
            {primaryDomain ? (
              <div className="space-y-4 text-sm">
                <div className="rounded-xl border border-[#283347] bg-black/30 p-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Monitored domain</p>
                  <p className="font-mono text-white">{primaryDomain}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-[#283347] bg-black/30 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Registry status</p>
                    <p className="mt-2 text-sm text-white">
                      {proof.licenseStatus === 'ready'
                        ? proof.license?.found ? 'Match found' : 'No registry match'
                        : 'Registry unavailable'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#283347] bg-black/30 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Domain scan</p>
                    <p className="mt-2 text-sm text-white">
                      {proof.domainStatus === 'ready' && proof.domainResult
                        ? formatRiskLabel(proof.domainResult.riskLevel)
                        : 'Domain scan unavailable'}
                    </p>
                  </div>
                </div>
                {proof.licenseStatus === 'ready' && proof.license ? (
                  proof.license.found ? (
                    <div className="space-y-1 text-gray-300">
                      <p>Registry match: <span className="text-white">{proof.license.brand}</span></p>
                      <p>Regulator: <span className="text-[#17c3b2]">{proof.license.regulatorName}</span></p>
                      {proof.license.licenseId && <p>License ID: <span className="font-mono text-white">{proof.license.licenseId}</span></p>}
                      {proof.license.verifyUrl && (
                        <a href={proof.license.verifyUrl} target="_blank" rel="noreferrer" className="text-[#17c3b2] hover:underline">
                          Open regulator verification
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-yellow-300">
                      TiltCheck registry returned no license match for this domain. That is not proof of safety or fraud.
                    </p>
                  )
                ) : (
                  <p className="text-sm text-gray-400">License registry unavailable for this domain.</p>
                )}
                {proof.domainStatus === 'ready' && proof.domainResult && (
                  <div className="rounded-xl border border-[#283347] bg-black/30 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">SusLink scan</p>
                    <p className={`mt-2 text-sm font-black uppercase ${proof.domainResult.safe ? 'text-[#17c3b2]' : 'text-[#ef4444]'}`}>
                      {formatRiskLabel(proof.domainResult.riskLevel)}
                    </p>
                    <p className="mt-2 text-sm text-gray-400">{proof.domainResult.message}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No monitored domain is curated for this casino yet, so domain proof cannot run without faking it.
              </p>
            )}
          </ProofCard>

          <ProofCard
            eyebrow="Blacklist check"
            title="Scam registry"
            description="Checks the repository-backed scam domain blacklist only. This is one trust lane, not the whole proof story."
            status={
              proof.scamStatus === 'available'
                ? proof.scamMatches.length > 0 ? 'warning' : 'live'
                : proof.scamStatus === 'empty'
                  ? 'warning'
                  : 'unavailable'
            }
          >
            {proof.scamStatus === 'available' ? (
              proof.scamMatches.length > 0 ? (
                <div className="space-y-3">
                  {proof.scamMatches.map((entry) => (
                    <div key={entry.domain} className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 p-4">
                      <p className="font-mono text-sm text-white">{entry.domain}</p>
                      <p className="mt-1 text-sm text-gray-400">{entry.classification}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  No blacklist hit for the monitored domain. That only means this repo-backed blacklist did not flag it.
                </p>
              )
            ) : (
              <p className="text-sm text-gray-400">
                {proof.scamMessage ?? 'Scam blacklist unavailable.'}
              </p>
            )}
          </ProofCard>

          <ProofCard
            eyebrow="Payout + ToS feed"
            title="Live payout delay signals"
            description="Only shows trust-engine payout friction and ToS volatility events."
            status={proof.shadowStatus === 'ready' ? (proof.shadowFlags.length > 0 ? 'warning' : 'live') : 'unavailable'}
          >
            {proof.shadowStatus === 'ready' ? (
              <div className="space-y-3">
                {proof.shadowFlags.length > 0 ? (
                  proof.shadowFlags.map((flag, index) => (
                    <div key={`${flag.name}-${index}`} className="rounded-xl border border-[#ffd700]/30 bg-[#ffd700]/5 p-4">
                      <p className="text-sm font-black uppercase text-white">{flag.name}</p>
                      <p className="mt-1 text-sm text-gray-400">{flag.flag}</p>
                      <p className="mt-2 text-[11px] font-mono text-gray-500">{formatDate(flag.detectedAt)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">
                    No live payout or ToS volatility events matched this casino in the current feed window. That is limited evidence, not a safety verdict.
                  </p>
                )}
                {proof.shadowSupportedSignals.length > 0 && (
                  <p className="text-[11px] font-mono text-gray-500">
                    Coverage: {proof.shadowSupportedSignals.join(' · ')}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                {proof.shadowMessage ?? 'Trust Engine payout feed unavailable.'}
              </p>
            )}
          </ProofCard>

          <ProofCard
            eyebrow="RTP drift"
            title="Provider discrepancy evidence"
            description="Reads submitted RTP reports for this platform. No reports means insufficient sample, not a clean bill."
            status={proof.rtpStatus === 'ready' ? (proof.rtpProviders.length > 0 ? 'live' : 'warning') : 'unavailable'}
          >
            {proof.rtpStatus === 'ready' ? (
              proof.rtpProviders.length > 0 ? (
                <div className="space-y-3">
                  {proof.rtpProviders.slice(0, 3).map((entry) => (
                    <div key={`${entry.providerName}-${entry.gameTitle}`} className="rounded-xl border border-[#283347] bg-black/30 p-4">
                      <p className="text-sm font-black uppercase text-white">{entry.providerName}</p>
                      <p className="mt-1 text-sm text-gray-400">{entry.gameTitle}</p>
                      <p className="mt-2 text-sm text-[#17c3b2]">
                        Max delta: {entry.delta.toFixed(2)}%
                      </p>
                    </div>
                  ))}
                  <p className="text-[11px] font-mono text-gray-500">
                    Need real-time telemetry for stronger proof. Static RTP pages are not enough on their own.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  {proof.rtpDataNote ?? 'No RTP reports were returned for this platform yet.'}
                </p>
              )
            ) : (
              <p className="text-sm text-gray-400">
                {proof.rtpDataNote ?? 'RTP discrepancy proof unavailable.'}
              </p>
            )}
          </ProofCard>

          <ProofCard
            eyebrow="Inbox + bonus feed"
            title="Bonus evidence"
            description="Checks active inbox-discovered bonus offers tied to this casino."
            status={proof.bonusStatus === 'ready' ? (proof.bonusMatches.length > 0 ? 'live' : 'warning') : 'unavailable'}
          >
            {proof.bonusStatus === 'ready' ? (
              proof.bonusMatches.length > 0 ? (
                <div className="space-y-3">
                  {proof.bonusMatches.slice(0, 3).map((entry) => (
                    <div key={`${entry.brand}-${entry.url}`} className="rounded-xl border border-[#283347] bg-black/30 p-4">
                      <p className="text-sm font-black uppercase text-white">{entry.brand}</p>
                      <p className="mt-1 text-sm text-gray-400">{entry.bonus}</p>
                      <p className="mt-2 text-[11px] font-mono text-gray-500">Verified {formatDate(entry.verified)}</p>
                    </div>
                  ))}
                  {proof.bonusHiddenCount > 0 && (
                    <p className="text-[11px] font-mono text-[#17c3b2]">
                      {proof.bonusHiddenCount} matching promo{proof.bonusHiddenCount === 1 ? '' : 's'} hidden by your active filters.
                    </p>
                  )}
                  <p className="text-[11px] font-mono text-gray-500">Feed updated: {formatDate(proof.bonusUpdatedAt)}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  {proof.bonusHiddenCount > 0
                    ? 'Inbox feed is live, but your active filters suppressed the matching promo evidence for this casino.'
                    : 'Inbox feed is live, but it returned no active bonus evidence for this casino.'}
                </p>
              )
            ) : (
              <p className="text-sm text-gray-400">
                {proof.bonusMessage ?? 'Bonus feed unavailable.'}
              </p>
            )}
          </ProofCard>
        </div>
      </section>

      <section id="supporting-proof-modules" className="border-y border-[#283347] bg-black/20 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">Supporting evidence modules</p>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white">Open the underlying evidence lanes</h2>
            </div>
            <p className="max-w-2xl text-sm text-gray-400">
              This page stays canonical for {casino.name}. Use these modules when you need raw bet verification, the broader feed, reference datasets, or a manual domain check.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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

      <section className="border-y border-[#283347] bg-black/30 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">Curated baseline</p>
              <h2 className="text-3xl font-black uppercase tracking-tight">What the static grade already says</h2>
              <p className="mt-3 max-w-3xl text-sm text-gray-400">
                Static grading stays on the page so the trust read does not collapse when a live feed goes dark.
                This is baseline evidence, not live telemetry.
              </p>
              <div className="mt-8 space-y-4">
                <PillarBar label="Financial integrity" score={casino.financialPayouts} color={staticScoreColor} />
                <PillarBar label="Proof quality & transparency" score={casino.fairnessTransparency} color={staticScoreColor} />
                <PillarBar label="Promotional honesty" score={casino.promotionalHonesty} color={staticScoreColor} />
                <PillarBar label="Operational support" score={casino.operationalSupport} color={staticScoreColor} />
                <PillarBar label="Community reputation" score={casino.communityReputation} color={staticScoreColor} />
              </div>
            </div>

            <aside className="rounded-2xl border border-[#283347] bg-black/40 p-6">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">Known issues</p>
              {violationCount > 0 ? (
                <ul className="space-y-3">
                  {casino.meta.violations?.map((violation) => (
                    <li key={violation} className="rounded-xl border border-[#ef4444]/25 bg-[#ef4444]/5 p-4 text-sm text-gray-300">
                      {violation}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-xl border border-[#283347] bg-black/30 p-4 text-sm text-gray-400">
                  No curated violations are attached to this casino right now. That is not a clean bill of health. It is just the current baseline record.
                </div>
              )}

              <div className="mt-6 rounded-xl border border-[#283347] bg-black/30 p-4">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Fallback community flags</p>
                <ul className="space-y-2 text-sm text-gray-400">
                  {SCAM_FLAGS.slice(0, 3).map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2]">Next action</p>
          <h2 className="text-3xl font-black uppercase tracking-tight">When public proof is not enough</h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-[#283347] bg-black/40 p-6">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">Dashboard handoff</p>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">Use the dashboard for account-bound actions</h3>
              <p className="mt-3 text-sm text-gray-400">
                Saved alerts, linked identity, and account-specific follow-up actions need auth. Public pages stop before that line.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={primaryActionHref}
                  className={`inline-flex items-center justify-center rounded-xl border px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${authLoading ? 'pointer-events-none border-[#283347] text-gray-500' : 'border-[#17c3b2]/40 bg-[#17c3b2]/10 text-[#17c3b2] hover:bg-[#17c3b2]/20'}`}
                >
                  {authLoading ? 'Checking auth...' : user?.userId ? 'Open dashboard' : 'Log in for dashboard'}
                </Link>
                <Link
                  href="/casinos"
                  className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30"
                >
                  Back to lookup
                </Link>
              </div>
            </article>

            <article className="rounded-2xl border border-[#283347] bg-black/40 p-6">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">Telemetry handoff</p>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">Use the extension for live session proof</h3>
              <p className="mt-3 text-sm text-gray-400">
                RTP drift, in-session game telemetry, and platform-level evidence need real play-session capture. Static pages cannot fake that.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/extension"
                  className="inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20"
                >
                  Open extension
                </Link>
                <Link
                  href="/intel/rtp"
                  className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30"
                >
                  View RTP intel
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-[#283347] px-4 py-8 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Made for Degens. By Degens.</p>
      </section>
    </main>
  );
}
