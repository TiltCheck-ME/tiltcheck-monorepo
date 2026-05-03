/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';

type VerificationState = 'pending' | 'success' | 'error';

type VerifiedPartner = {
  id: string;
  name: string;
  appId: string;
  secretKey: string;
  mode: string;
  dailyQuotaLimit: number | null;
  dailyQuotaUsed: number | null;
};

type VerificationPayload = {
  success: boolean;
  partner: VerifiedPartner;
  next: {
    portalUrl: string;
    docsUrl: string;
    apiBaseUrl: string;
  };
};

export default function OperatorVerifyPage() {
  const [state, setState] = useState<VerificationState>('pending');
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<VerificationPayload | null>(null);

  const token = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    const params = new URLSearchParams(window.location.search);
    return params.get('token')?.trim() || '';
  }, []);

  useEffect(() => {
    if (!token) {
      setState('error');
      setError('Verification token missing. The link is cooked.');
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/partner/verify-sandbox`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({ token }),
        });

        const body = (await response.json().catch(() => null)) as VerificationPayload | { error?: string } | null;
        if (!response.ok || !body || !('partner' in body)) {
          throw new Error((body && 'error' in body && body.error) || 'Verification failed.');
        }

        setPayload(body);
        setState('success');
      } catch (verifyError) {
        setState('error');
        setError(verifyError instanceof Error ? verifyError.message : 'Verification failed.');
      }
    };

    void verify();
  }, [token]);

  return (
    <main className="min-h-screen bg-[#0a0c10] px-4 py-24 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">Operators / Verify</p>
          <h1 className="text-4xl font-black uppercase tracking-tighter md:text-5xl">
            Activate sandbox keys
            <br />
            without guessing.
          </h1>
          <p className="mt-4 max-w-3xl text-sm text-gray-400 md:text-base">
            This link is single-use and expires after 24 hours. Replay-safe by design. No skem links, no mystery state.
          </p>
        </div>

        {state === 'pending' && (
          <section className="rounded-3xl border border-[#17c3b2]/30 bg-black/40 p-8">
            <p className="text-sm font-mono text-[#17c3b2]">Consuming token and activating sandbox credentials...</p>
          </section>
        )}

        {state === 'error' && (
          <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400">Verification failed</p>
            <h2 className="mt-3 text-2xl font-black uppercase tracking-tight">That link is dead.</h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-300">{error || 'The token expired or was already used.'}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/operators"
                className="inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20"
              >
                Request a new link
              </Link>
              <Link
                href="/operators/keys"
                className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/40"
              >
                Open key portal
              </Link>
            </div>
          </section>
        )}

        {state === 'success' && payload && (
          <section className="rounded-3xl border border-[#17c3b2]/30 bg-black/40 p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#17c3b2]">Sandbox activated</p>
            <h2 className="mt-3 text-2xl font-black uppercase tracking-tight">{payload.partner.name} is live in sandbox mode.</h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-300">
              Save the secret now. The portal can show it again for the verified operator email, but your logs should still
              keep their hands off it.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#283347] bg-black/50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">App ID</p>
                <p className="mt-3 break-all font-mono text-sm text-white">{payload.partner.appId}</p>
              </div>
              <div className="rounded-2xl border border-[#283347] bg-black/50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Secret key</p>
                <p className="mt-3 break-all font-mono text-sm text-white">{payload.partner.secretKey}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#17c3b2]/20 bg-[#17c3b2]/5 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#17c3b2]">Quota</p>
              <p className="mt-3 text-sm text-gray-300">
                Sandbox mode, {payload.partner.dailyQuotaLimit ?? 'n/a'} requests per 24h window. Mock responses only. No
                trust-rollup writes happen here.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/operators/keys"
                className="inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2] px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-[#14a99a]"
              >
                Open operator portal
              </Link>
              <Link
                href="/docs/RGAAS-QUICKSTART"
                className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/40"
              >
                Read docs
              </Link>
            </div>
          </section>
        )}

        <p className="mt-10 text-center text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
          Made for Degens. By Degens.
        </p>
      </div>
    </main>
  );
}
