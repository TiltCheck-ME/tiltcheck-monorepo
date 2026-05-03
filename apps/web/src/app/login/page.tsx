/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-24 */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getDiscordLoginApiBase, getDiscordLoginUrl } from '@/lib/discord-login';
import { getDashboardHandoffUrl, getDashboardLaneLabel } from '@/lib/dashboard-handoff';
import { signInWithMagicEmail } from '@/lib/magicAuth';

function isSafeRedirect(value: string | null): string {
  if (!value || !value.startsWith('/')) {
    return '/dashboard';
  }

  return value;
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [magicEmail, setMagicEmail] = useState('');
  const [magicLoading, setMagicLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectTarget, setRedirectTarget] = useState('/dashboard');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setRedirectTarget(isSafeRedirect(params.get('redirect')));

    // Surface Discord OAuth callback errors to the user.
    const oauthError = params.get('error');
    if (oauthError) {
      setError('Discord login failed. Try again or use email login.');
    }
  }, []);

  const canonicalRedirectUrl = useMemo(() => getDashboardHandoffUrl(redirectTarget), [redirectTarget]);
  const redirectLabel = useMemo(() => getDashboardLaneLabel(redirectTarget), [redirectTarget]);
  const discordLoginUrl = useMemo(() => getDiscordLoginUrl(canonicalRedirectUrl), [canonicalRedirectUrl]);

  // Gate: if authenticated but not onboarded, redirect to onboarding wizard
  useEffect(() => {
    if (loading || !user?.userId) return;
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me').replace(/\/$/, '');
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('tc_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${apiBase}/me/onboarding-status`, { credentials: 'include', headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const completedSteps = Array.isArray(data?.completedSteps)
          ? data.completedSteps.filter((value: unknown): value is string => typeof value === 'string')
          : [];
        if (data && !completedSteps.includes('completed')) {
          window.location.assign('/onboarding');
        }
      })
      .catch(() => {});
  }, [loading, user]);

  async function handleMagicSignIn() {
    if (!magicEmail.trim()) {
      setError('Enter your email first.');
      return;
    }

    setMagicLoading(true);
    setError(null);

    try {
      await signInWithMagicEmail(getDiscordLoginApiBase(), magicEmail.trim());
      window.location.assign(canonicalRedirectUrl);
    } catch (magicError) {
      setError(magicError instanceof Error ? magicError.message : 'Magic sign-in failed.');
    } finally {
      setMagicLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2] mb-3">Access Portal</p>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Log in without the scavenger hunt</h1>
          <p className="mt-4 max-w-3xl text-sm md:text-base text-gray-400">
            Pick the lane that matches how you got approved. Web still owns login. The authenticated control surface lives
            in the canonical dashboard after auth lands.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#17c3b2]/30 bg-black/40 p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#17c3b2] mb-3">Discord lane</p>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-3">Use your linked Discord account</h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Best for founder-role access, Discord-linked identity, and the canonical dashboard lanes that depend on your
              real Discord account.
            </p>
            <a
              href={discordLoginUrl}
              className="inline-flex w-full items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20"
            >
              Login with Discord
            </a>
            {error && error.includes('Discord') && (
              <p className="mt-3 text-xs font-mono text-red-400">{error}</p>
            )}
            <p className="mt-3 text-[11px] font-mono text-gray-500">
              If you have not linked Discord yet, this is the button you wanted to find in the first place.
            </p>
          </section>

          <section className="rounded-2xl border border-[#283347] bg-black/40 p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 mb-3">Site lane</p>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-3">Use Magic email login</h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Best for beta-approved access when your approval is tied to an email instead of a Discord account. After the
              login lands, we hand you into the canonical dashboard lane.
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="email"
                value={magicEmail}
                onChange={(event) => setMagicEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#283347] bg-black/50 px-4 py-4 text-sm text-white focus:border-[#17c3b2] focus:outline-none"
              />
              <button
                type="button"
                disabled={magicLoading}
                onClick={handleMagicSignIn}
                className="inline-flex w-full items-center justify-center rounded-xl border border-[#17c3b2]/25 bg-white/5 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/40 hover:text-[#17c3b2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {magicLoading ? 'Sending login link...' : 'Sign in with Magic'}
              </button>
            </div>
            {error && <p className="mt-3 text-xs font-mono text-red-400">{error}</p>}
          </section>
        </div>

        <div className="mt-8 rounded-2xl border border-[#283347] bg-black/30 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-2">Need the beta lane first?</p>
            <p className="text-sm text-gray-400">
              Apply from the beta app, then come back here when you need account access that is actually obvious.
            </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/beta-tester"
              className="inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/30 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/10"
            >
              Open Beta App
            </Link>
            <a
              href={canonicalRedirectUrl}
              className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30"
            >
              Continue to {redirectLabel}
            </a>
          </div>
        </div>

        {!loading && user?.userId && (
          <div className="mt-8 rounded-2xl border border-[#17c3b2]/30 bg-[#17c3b2]/5 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#17c3b2] mb-2">Already authenticated</p>
            <p className="text-sm text-gray-300">
              You are already in as <span className="font-mono text-white">{user.username}</span>.
            </p>
            <a
              href={canonicalRedirectUrl}
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20"
            >
              Open {redirectLabel}
            </a>
          </div>
        )}

        <p className="mt-10 text-center text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
          Made for Degens. By Degens.
        </p>
      </div>
    </main>
  );
}
