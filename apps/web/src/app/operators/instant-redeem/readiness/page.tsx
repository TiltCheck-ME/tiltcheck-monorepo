/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import BrandTagline from '@/components/BrandTagline';

type ReadinessCheck = {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
};

type ReadinessPayload = {
  marketReady?: boolean;
  phase?: string;
  checklist?: ReadinessCheck[];
  talkTrack?: { oneLiner?: string; thirtySeconds?: string };
  onboarding?: Record<string, string>;
  metrics?: { enabledDomains?: number };
};

const STATUS_STYLE: Record<ReadinessCheck['status'], string> = {
  pass: 'border-[#17c3b2]/40 text-[#17c3b2]',
  warn: 'border-[#f59e0b]/40 text-[#f59e0b]',
  fail: 'border-[#ef4444]/40 text-[#ef4444]',
};

export default function InstantRedeemReadinessPage() {
  const [payload, setPayload] = useState<ReadinessPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me').replace(/\/$/, '');
    fetch(`${apiUrl}/v1/redeem/readiness`, { cache: 'no-store' })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as ReadinessPayload | null;
        if (!body) throw new Error('Readiness payload missing');
        setPayload(body);
      })
      .catch(() => {
        setError('Readiness API unavailable. Check API deploy + /v1/redeem/readiness.');
      });
  }, []);

  const checklist = payload?.checklist ?? [];
  const marketReady = payload?.marketReady === true;

  return (
    <main className="public-page public-page--tight min-h-screen bg-[#0a0c10] px-4 py-16 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <header>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.35em] text-[#17c3b2]">
            Team readiness / Instant Redeem
          </p>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
            Onboard the pod. Ship the wedge.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-400 leading-relaxed">
            Live checklist for BD, eng, and ops. Marketable framing, scam hard-blocks, irrevocable
            redeems, processor scale path — all in one readiness surface.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/operators/instant-redeem"
              className="inline-flex items-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2]"
            >
              Product page
            </Link>
            <a
              href="/docs/product/instant-redeem-pitch-one-pager"
              className="inline-flex items-center rounded-xl border border-[#283347] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-300"
            >
              Pitch one-pager
            </a>
            <a
              href="/docs/OPERATOR-INSTANT-REDEEM-TEAM-READINESS"
              className="inline-flex items-center rounded-xl border border-[#283347] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-300"
            >
              Team doc
            </a>
            <a
              href="/docs/OPERATOR-INSTANT-REDEEM-PHASE5-PRODUCTION"
              className="inline-flex items-center rounded-xl border border-[#283347] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-300"
            >
              Phase 5
            </a>
          </div>
        </header>

        <section
          className={`rounded-2xl border p-6 ${
            marketReady
              ? 'border-[#17c3b2]/30 bg-[#17c3b2]/5'
              : 'border-[#ef4444]/30 bg-[#ef4444]/5'
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">
            Status · {payload?.phase ?? 'sandbox'}
          </p>
          <p className="mt-2 text-xl font-black uppercase tracking-tight">
            {error
              ? 'Readiness unavailable'
              : marketReady
                ? 'Partner-ready (API scaffolding — no live money default)'
                : 'Not ready'}
          </p>
          <p className="mt-2 text-sm text-gray-300 leading-relaxed">
            {payload?.talkTrack?.oneLiner ||
              'Instant Redeem is a partner cashier product: paid fast exit, irrevocable settle intent, scam hard-block — TiltCheck orchestrates; processor holds float.'}
          </p>
          {typeof payload?.metrics?.enabledDomains === 'number' && (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-gray-500">
              Enabled domains in registry: {payload.metrics.enabledDomains}
            </p>
          )}
        </section>

        {error && (
          <div className="rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-3 text-sm text-[#ef4444]">
            {error}
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-black uppercase tracking-tight">Checklist</h2>
          {checklist.length === 0 && !error ? (
            <p className="text-sm text-gray-500">Loading readiness…</p>
          ) : (
            checklist.map((check) => (
              <article
                key={check.id}
                className={`rounded-xl border bg-black/30 p-4 ${STATUS_STYLE[check.status]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-wide text-white">{check.label}</p>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{check.status}</span>
                </div>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">{check.detail}</p>
              </article>
            ))
          )}
        </section>

        <section className="rounded-2xl border border-[#283347] bg-black/30 p-6 text-sm text-gray-400 leading-relaxed">
          <h2 className="text-lg font-black uppercase tracking-tight text-white">Talk track</h2>
          <p className="mt-2">{payload?.talkTrack?.thirtySeconds}</p>
          <p className="mt-4 text-xs text-gray-500">
            Irrevocable rule: no cancel endpoint succeeds. No more canceled redeems.
          </p>
        </section>

        <p className="text-center text-gray-500">
          <BrandTagline compact />
        </p>
      </div>
    </main>
  );
}
