/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
"use client";

import React from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardHandoffUrl, getWebLoginRedirect } from '@/lib/dashboard-handoff';

/**
 * AutoVaultPage
 * Web explainer that hands off vault management to the canonical dashboard.
 */
export default function AutoVaultPage() {
  const { user, loading } = useAuth();
  const vaultLaneUrl = getDashboardHandoffUrl('/tools/auto-vault');
  const safetyLaneUrl = getDashboardHandoffUrl('/dashboard?tab=safety');
  const primaryActionHref = !loading && user ? vaultLaneUrl : getWebLoginRedirect('/tools/auto-vault');

  React.useEffect(() => {
    if (loading || !user) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      window.location.assign(vaultLaneUrl);
    }, 1400);

    return () => window.clearTimeout(redirectTimer);
  }, [loading, user, vaultLaneUrl]);

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-[#0a0c10] text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 pt-32">
          <div className="mb-10 rounded-3xl border border-[#17c3b2]/25 bg-black/40 p-8 md:p-10">
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">
              <Link href="/tools" className="hover:text-[#17c3b2] transition-colors">Tools</Link>
              {' / '}
              <span className="text-gray-400">LockVault</span>
            </p>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">
              LockVault moved into the dashboard lane
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl">
              Web still explains the system. The actual lock state, profit guard threshold, wallet safety lock, and
              release flow now live in the canonical user-dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={primaryActionHref}
                className={`inline-flex items-center justify-center rounded-xl border px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                  loading
                    ? 'pointer-events-none border-[#283347] text-gray-500'
                    : 'border-[#17c3b2]/40 bg-[#17c3b2]/10 text-[#17c3b2] hover:bg-[#17c3b2]/20'
                }`}
              >
                {loading ? 'Checking session...' : user ? 'Open vault controls' : 'Log in for vault controls'}
              </a>
              <a
                href={vaultLaneUrl}
                className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30"
              >
                Open dashboard vault lane
              </a>
              <a
                href={safetyLaneUrl}
                className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30"
              >
                Open safety lane
              </a>
            </div>
            {user && (
              <p className="mt-4 text-xs font-mono text-gray-500">
                Session found. Redirecting you to the canonical vault controls now.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { step: '01', label: 'Set the rule', desc: 'Define the profit guard threshold or trigger you want protecting your session.' },
              { step: '02', label: 'Lock the upside', desc: 'Dashboard writes the durable vault state. No second shadow manager lives on web now.' },
              { step: '03', label: 'Release on timer', desc: 'Unlocks, extensions, and wallet safety requests all happen in the canonical dashboard flow.' },
            ].map(({ step, label, desc }) => (
              <div key={step} className="rounded-2xl border border-[#283347] bg-black/30 p-5">
                <p className="text-[#17c3b2] text-xs font-mono font-bold mb-2">{step}</p>
                <p className="text-white text-sm font-black uppercase tracking-tight mb-2">{label}</p>
                <p className="text-gray-400 text-xs">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-[#283347] bg-black/30 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">Ownership split</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#283347] bg-black/30 p-5">
                <p className="text-sm font-black uppercase tracking-tight text-white">Web keeps the pitch</p>
                <p className="mt-3 text-sm text-gray-400">
                  Public explainers, discovery, and trust-building stay here so you can understand the guardrail before you use it.
                </p>
              </div>
              <div className="rounded-2xl border border-[#17c3b2]/25 bg-[#17c3b2]/5 p-5">
                <p className="text-sm font-black uppercase tracking-tight text-white">Dashboard owns the controls</p>
                <p className="mt-3 text-sm text-gray-300">
                  Live vault state, wallet locks, unlock requests, and auto-vault rules are managed in the canonical dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
