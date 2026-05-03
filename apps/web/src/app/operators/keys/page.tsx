/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
"use client";

import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDiscordLoginApiBase, getDiscordLoginUrl } from '@/lib/discord-login';
import { signInWithMagicEmail } from '@/lib/magicAuth';

type SandboxPartner = {
  id: string;
  name: string;
  appId: string;
  secretKey: string;
  contactEmail: string | null;
  websiteUrl: string | null;
  casinoDomain: string | null;
  intendedUseCase: string | null;
  mode: string;
  dailyQuotaLimit: number | null;
  dailyQuotaUsed: number | null;
  dailyQuotaRemaining: number | null;
  quotaWindowStartedAt: string | null;
  emailVerifiedAt: string | null;
  lastProductionAccessRequestedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type PortalResponse = {
  success: boolean;
  operatorEmail: string;
  partners: SandboxPartner[];
};

export default function OperatorKeysPage() {
  const apiBase = getDiscordLoginApiBase();
  const { user, loading } = useAuth();
  const [magicEmail, setMagicEmail] = useState('');
  const [magicLoading, setMagicLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalData, setPortalData] = useState<PortalResponse | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const signedInEmail = useMemo(() => user?.email?.trim() || '', [user?.email]);
  const discordLoginUrl = useMemo(() => getDiscordLoginUrl('/operators/keys'), []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setToken(window.localStorage.getItem('tc_token'));
  }, []);

  const fetchPortal = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/partner/operators/keys`, {
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const payload = (await response.json().catch(() => null)) as PortalResponse | { error?: string } | null;
      if (!response.ok || !payload || !('partners' in payload)) {
        throw new Error((payload && 'error' in payload && payload.error) || 'Failed to load operator portal.');
      }
      setPortalData(payload);
    } catch (portalError) {
      setPortalData(null);
      setError(portalError instanceof Error ? portalError.message : 'Failed to load operator portal.');
    } finally {
      setFetching(false);
    }
  }, [apiBase, token]);

  useEffect(() => {
    if (!loading && (token || user?.userId)) {
      void fetchPortal();
    }
  }, [fetchPortal, loading, token, user?.userId]);

  async function handleMagicSignIn() {
    if (!magicEmail.trim()) {
      setError('Enter the operator email that owns the sandbox keys.');
      return;
    }

    setMagicLoading(true);
    setError(null);
    try {
      await signInWithMagicEmail(apiBase, magicEmail.trim());
      if (typeof window !== 'undefined') {
        setToken(window.localStorage.getItem('tc_token'));
      }
      await fetchPortal();
    } catch (magicError) {
      setError(magicError instanceof Error ? magicError.message : 'Magic sign-in failed.');
    } finally {
      setMagicLoading(false);
    }
  }

  async function handleProductionRequest(partnerId: string) {
    setRequestingId(partnerId);
    setRequestMessage(null);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/partner/operators/request-production`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ partnerId }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to request production access.');
      }
      setRequestMessage(payload?.message || 'Production access request recorded.');
      await fetchPortal();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to request production access.');
    } finally {
      setRequestingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0c10] px-4 py-24 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">Operators / Sandbox Keys</p>
          <h1 className="text-4xl font-black uppercase tracking-tighter md:text-5xl">
            Operator portal.
            <br />
            Grab the keys and stop guessing.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-400 md:text-base">
            This page is the low-friction operator lane: see your sandbox app IDs, secret keys, quota usage, and the manual
            step for production review. Magic email works if Discord is not your thing. No scavenger hunt.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-[#17c3b2]/25 bg-black/40 p-8">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-[#17c3b2]">Portal status</p>
            <h2 className="mb-3 text-2xl font-black uppercase tracking-tight">Authenticate with the operator email</h2>
            <p className="text-sm leading-relaxed text-gray-400">
              We scope portal access to the verified operator email on the sandbox partner record. If the email does not
              match, the portal stays shut. Correct behavior. No skem.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && discordLoginUrl) {
                    window.location.assign(discordLoginUrl);
                  }
                }}
                className="rounded-2xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20"
              >
                Log in with Discord
              </button>
              <div className="rounded-2xl border border-[#283347] bg-black/50 p-4">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  Magic email lane
                </label>
                <input
                  type="email"
                  value={magicEmail}
                  onChange={(event) => setMagicEmail(event.target.value)}
                  placeholder={signedInEmail || 'operator@example.com'}
                  className="w-full rounded-xl border border-[#283347] bg-black/40 px-4 py-3 text-sm text-white focus:border-[#17c3b2] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleMagicSignIn}
                  disabled={magicLoading}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/40 hover:text-[#17c3b2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {magicLoading ? 'Sending login link...' : 'Sign in with Magic'}
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-[#283347] bg-black/30 p-5 text-sm text-gray-400">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-gray-500">Signed-in context</p>
              <p className="mt-2">
                Current web identity: <span className="font-mono text-white">{signedInEmail || user?.username || 'none'}</span>
              </p>
              <p className="mt-2">
                If your sandbox keys were issued to another inbox, use that inbox here. The portal does not care about vibes.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#283347] bg-black/30 p-8">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Fast path</p>
            <h2 className="mb-3 text-2xl font-black uppercase tracking-tight">Need keys first?</h2>
            <p className="text-sm leading-relaxed text-gray-400">
              Start at the sandbox signup page, verify the email, then come back here. If you are already through that
              funnel, the mock endpoint below is the fastest smoke test.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-2xl border border-[#17c3b2]/20 bg-[#17c3b2]/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2]">Smoke test</p>
                <code className="mt-2 block overflow-x-auto text-xs text-white">
                  curl -H "X-TiltCheck-App-Id: app_id" -H "X-TiltCheck-Secret-Key: secret" {apiBase}/partner/sandbox/mock
                </code>
              </div>
              <Link
                href="/operators"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-[#17c3b2]/30 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/10"
              >
                Open sandbox signup
              </Link>
              <Link
                href="/operators/pricing"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-[#283347] px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30"
              >
                View pricing and limits
              </Link>
            </div>
          </div>
        </section>

        {requestMessage && (
          <div className="mt-6 rounded-2xl border border-[#17c3b2]/30 bg-[#17c3b2]/10 px-5 py-4 text-sm text-[#d7fff8]">
            {requestMessage}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mt-10 rounded-3xl border border-[#283347] bg-black/20 p-8">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Issued credentials</p>
              <h2 className="text-2xl font-black uppercase tracking-tight">Sandbox partner keys</h2>
            </div>
            {fetching && <p className="text-xs font-mono text-[#17c3b2]">Refreshing portal data...</p>}
          </div>

          {!portalData?.partners.length ? (
            <div className="rounded-2xl border border-dashed border-[#283347] px-6 py-10 text-center">
              <p className="text-lg font-black uppercase tracking-tight text-white">No verified sandbox keys yet.</p>
              <p className="mt-3 text-sm text-gray-400">
                That usually means you have not finished the email verification step or you signed in with the wrong inbox.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {portalData.partners.map((partner) => (
                <article key={partner.id} className="rounded-3xl border border-[#17c3b2]/20 bg-black/30 p-6">
                  <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-black uppercase tracking-tight">{partner.name}</h3>
                        <span className="rounded-full border border-[#17c3b2]/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2]">
                          {partner.mode}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-400">{partner.intendedUseCase || 'No use case captured yet.'}</p>

                      <dl className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-[#283347] bg-black/40 p-4">
                          <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">App ID</dt>
                          <dd className="mt-2 break-all font-mono text-sm text-white">{partner.appId}</dd>
                        </div>
                        <div className="rounded-2xl border border-[#283347] bg-black/40 p-4">
                          <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Secret key</dt>
                          <dd className="mt-2 break-all font-mono text-sm text-white">{partner.secretKey}</dd>
                        </div>
                        <div className="rounded-2xl border border-[#283347] bg-black/40 p-4">
                          <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Operator email</dt>
                          <dd className="mt-2 break-all text-sm text-white">{partner.contactEmail || 'unknown'}</dd>
                        </div>
                        <div className="rounded-2xl border border-[#283347] bg-black/40 p-4">
                          <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Casino domain</dt>
                          <dd className="mt-2 text-sm text-white">{partner.casinoDomain || partner.websiteUrl || 'not provided'}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded-3xl border border-[#283347] bg-black/40 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Quota and promotion</p>
                      <div className="mt-4 rounded-2xl border border-[#17c3b2]/20 bg-[#17c3b2]/5 p-4">
                        <p className="text-sm text-gray-300">
                          Used today: <span className="font-mono text-white">{partner.dailyQuotaUsed ?? 0}</span> /{' '}
                          <span className="font-mono text-white">{partner.dailyQuotaLimit ?? 'unlimited'}</span>
                        </p>
                        <p className="mt-2 text-sm text-gray-300">
                          Remaining: <span className="font-mono text-white">{partner.dailyQuotaRemaining ?? 'n/a'}</span>
                        </p>
                        <p className="mt-2 text-xs font-mono text-gray-500">
                          Window start: {partner.quotaWindowStartedAt ? new Date(partner.quotaWindowStartedAt).toLocaleString() : 'starts on first sandbox call'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleProductionRequest(partner.id)}
                        disabled={requestingId === partner.id}
                        className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-[#17c3b2]/35 bg-[#17c3b2]/10 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {requestingId === partner.id ? 'Requesting production access...' : 'Request production access'}
                      </button>
                      <p className="mt-3 text-xs text-gray-500">
                        Manual review only. Production keys stay human-gated so nobody speedruns a sus rollout.
                      </p>
                      {partner.lastProductionAccessRequestedAt && (
                        <p className="mt-2 text-xs font-mono text-[#17c3b2]">
                          Last requested: {new Date(partner.lastProductionAccessRequestedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
