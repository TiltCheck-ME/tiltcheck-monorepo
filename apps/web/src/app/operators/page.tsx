/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
"use client";

import Link from 'next/link';
import React, { useMemo, useState } from 'react';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const OPERATOR_BENEFITS = [
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
    body: 'Get sandbox keys, mocked responses, and a sane quota cap before you ask for production review.',
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
    <main className="min-h-screen bg-[#0a0c10] px-4 py-24 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-16">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.35em] text-[#17c3b2]">
              Operators / RGaaS
            </p>
            <h1 className="text-4xl font-black uppercase tracking-tighter md:text-6xl">
              Self-serve sandbox keys for operators that want signal, not vibes.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-gray-400 md:text-lg">
              Plug TiltCheck RGaaS into onboarding flows, trust surfaces, affordability checks, or manual review queues.
              Sandbox gets you mocked responses, quota caps, and a live integration path without waiting on ops to wake up.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/operators/pricing"
                className="inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20"
              >
                Pricing and limits
              </Link>
              <Link
                href="/operators/keys"
                className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30"
              >
                Open operator portal
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-[#283347] bg-black/40 p-8">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Why teams ship this</p>
            <div className="space-y-5">
              {OPERATOR_BENEFITS.map((item) => (
                <article key={item.title} className="rounded-2xl border border-[#17c3b2]/20 bg-[#17c3b2]/5 p-5">
                  <h2 className="text-lg font-black uppercase tracking-tight text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.body}</p>
                </article>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-[#ef4444]/30 bg-[#ef4444]/5 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ef4444]">Sandbox contract</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li>Mode is locked to sandbox until manual review says otherwise.</li>
                <li>Quota defaults to 1000 requests per rolling 24h window.</li>
                <li>No trust-rollup writes. No fake production flexing. Just mocked proof.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-[#283347] bg-black/30 p-8">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Flow</p>
            <ol className="space-y-5 text-sm text-gray-300">
              <li>
                <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2]">Step 01</span>
                Submit operator details with your work email and a dev reCAPTCHA token.
              </li>
              <li>
                <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2]">Step 02</span>
                Verify the email link. The token is signed, single-use, and dies after 24 hours.
              </li>
              <li>
                <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2]">Step 03</span>
                Log in with Magic or Discord, view keys in the operator portal, and hit the sandbox mock route.
              </li>
            </ol>
          </div>

          <div className="rounded-3xl border border-[#17c3b2]/25 bg-black/50 p-8">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">Request sandbox access</p>
            <h2 className="text-2xl font-black uppercase tracking-tight">Get sandbox keys without the ops scavenger hunt</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Use your operator email. In dev, any non-empty reCAPTCHA token passes unless you literally send garbage that says invalid.
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
          </div>
        </section>

        <section className="rounded-3xl border border-[#283347] bg-black/30 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Need the docs?</p>
              <h2 className="text-2xl font-black uppercase tracking-tight">Curl it before you buy into it.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-400">
                Quickstart docs and Postman collection live in-repo so your team can hit the mock route immediately after verification.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/docs/RGAAS-QUICKSTART"
                className="inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/30 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2]"
              >
                Quickstart
              </a>
              <Link
                href="/operators/pricing"
                className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white"
              >
                Pricing and limits
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
