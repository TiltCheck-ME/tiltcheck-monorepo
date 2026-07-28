/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
"use client";

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import BrandTagline from '@/components/BrandTagline';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const OPERATOR_BENEFITS = [
  {
    title: 'Instant Redeem',
    body: 'Players pay a fee to cash out faster at the cashier. TiltCheck orchestrates gates and settlement; your processor holds the funds. One processor contract can cover many casino domains.',
  },
  {
    title: 'Trust scoring API',
    body: 'Expose casino-grade trust signals, scam flags, and behavioral risk context inside your product without hand-building another brittle scorecard.',
  },
  {
    title: 'Breathalyzer and RG signals',
    body: 'Detect loss-chasing velocity, streak pressure, and intervention moments before a session goes fully cooked.',
  },
  {
    title: 'Sandbox first',
    body: 'Get sandbox keys, mocked responses, and a sane quota cap. Production Instant Redeem needs a float-desk grant — processor holds funds.',
  },
];

export default function OperatorsPage() {
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const apiBase = useMemo(
    () => (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, ''),
    [],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState('submitting');
    setError(null);

    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') || '').trim();

    try {
      const response = await fetch(`${apiBase}/partner/register-sandbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          email,
          companyName: String(data.get('companyName') || ''),
          casinoDomain: String(data.get('casinoDomain') || ''),
          intendedUseCase: String(data.get('intendedUseCase') || ''),
          recaptchaToken: String(data.get('recaptchaToken') || 'dev-recaptcha-pass'),
          honeypot: String(data.get('honeypot') || ''),
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'Sandbox signup failed');
      }

      setSubmittedEmail(email);
      setSubmitState('success');
    } catch (submitError) {
      setSubmitState('error');
      setError(submitError instanceof Error ? submitError.message : 'Sandbox signup failed');
    }
  }

  return (
    <main className="public-page public-page--tight min-h-screen bg-[#0a0c10] px-4 py-16 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <header>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.35em] text-[#17c3b2]">Operators / Instant Redeem + RGaaS</p>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Sandbox keys. Paid exits. Trust signal — not vibes.</h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-400 leading-relaxed">
            Processors ship Instant Redeem across many domains under one float desk. Operators get the badge.
            RGaaS covers tilt signals. Free sandbox: mocked responses, 1k req/24h, Phase 5 production grant-gated.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/operators/instant-redeem" className="inline-flex items-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2] hover:bg-[#17c3b2]/20">
              Instant Redeem
            </Link>
            <Link href="/operators/pricing" className="inline-flex items-center rounded-xl border border-[#283347] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:border-[#17c3b2]/30">
              Pricing
            </Link>
            <Link href="/operators/keys" className="inline-flex items-center rounded-xl border border-[#283347] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:border-[#17c3b2]/30">
              Key portal
            </Link>
            <a href="/docs/RGAAS-QUICKSTART" className="inline-flex items-center rounded-xl border border-[#283347] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white">
              Quickstart docs
            </a>
          </div>
        </header>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          {OPERATOR_BENEFITS.map((item) => (
            <li key={item.title} className="rounded-xl border border-[#283347] bg-black/30 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-white">{item.title}</p>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{item.body}</p>
            </li>
          ))}
        </ul>

        <section className="rounded-2xl border border-[#17c3b2]/25 bg-black/50 p-6 md:p-8">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">Sandbox signup</p>
          <h2 className="text-xl font-black uppercase tracking-tight">Request keys</h2>
          <p className="mt-2 text-sm text-gray-400">
            Work email → verify link (24h, single-use) → portal. Flow: submit → verify → curl mock route.
          </p>

            {submitState === 'success' ? (
              <div className="mt-8 rounded-2xl border border-[#17c3b2]/30 bg-[#17c3b2]/5 p-6">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2]">Verification sent</p>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight">Inbox check time.</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-300">
                  We queued a verification link for <span className="font-mono text-white">{submittedEmail}</span>. Open it,
                  activate the sandbox keys, then head to the portal.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/operators/keys"
                    className="inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2]"
                  >
                    Open keys portal
                  </Link>
                  <Link
                    href="/docs"
                    className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white"
                  >
                    Read docs
                  </Link>
                </div>
              </div>
            ) : (
              <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
                <input type="text" name="honeypot" defaultValue="" className="hidden" tabIndex={-1} aria-hidden="true" />

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Work email</label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="ops@yourcasino.com"
                      className="w-full rounded-xl border border-[#283347] bg-black/50 px-4 py-4 text-sm text-white focus:border-[#17c3b2] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Company name</label>
                    <input
                      name="companyName"
                      required
                      placeholder="Example Casino Group"
                      className="w-full rounded-xl border border-[#283347] bg-black/50 px-4 py-4 text-sm text-white focus:border-[#17c3b2] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Casino domain</label>
                    <input
                      name="casinoDomain"
                      required
                      placeholder="casino.example.com"
                      className="w-full rounded-xl border border-[#283347] bg-black/50 px-4 py-4 text-sm text-white focus:border-[#17c3b2] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">reCAPTCHA token</label>
                    <input
                      name="recaptchaToken"
                      required
                      defaultValue="dev-recaptcha-pass"
                      className="w-full rounded-xl border border-[#283347] bg-black/50 px-4 py-4 text-sm text-white focus:border-[#17c3b2] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Intended use case</label>
                  <textarea
                    name="intendedUseCase"
                    required
                    minLength={20}
                    rows={6}
                    placeholder="Tell us where RGaaS lives in your flow: trust scoring, registration friction checks, live session intervention, manual review, whatever."
                    className="w-full rounded-xl border border-[#283347] bg-black/50 px-4 py-4 text-sm text-white focus:border-[#17c3b2] focus:outline-none"
                  />
                </div>

                {submitState === 'error' && error && (
                  <div className="rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-3 text-sm font-mono text-[#ef4444]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitState === 'submitting'}
                  className="inline-flex w-fit items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2] px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-[#11b2a3] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitState === 'submitting' ? 'Provisioning sandbox...' : 'Request sandbox keys'}
                </button>
              </form>
            )}
        </section>

        <p className="text-center text-gray-500">
          <BrandTagline compact />
        </p>
      </div>
    </main>
  );
}
