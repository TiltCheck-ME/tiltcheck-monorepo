/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23 */
'use client';

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
  const dashboardUrl = getDashboardHandoffUrl('/dashboard');
  const primaryActionHref =
    !loading && user ? vaultLaneUrl : getWebLoginRedirect('/tools/auto-vault');

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
              <Link href="/tools" className="hover:text-[#17c3b2] transition-colors">
                Tools
              </Link>
              {' / '}
              <span className="text-gray-400">AutoVault</span>
            </p>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">
              AutoVault moved into the dashboard lane
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl">
              Web still explains the system. The actual AutoVault rules now live in the TiltCheck
              dashboard beside LockVault timers, Wallet Lock cooldowns, and release controls.
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
                {loading
                  ? 'Checking session...'
                  : user
                    ? 'Open AutoVault rules'
                    : 'Log in for AutoVault rules'}
              </a>
              <a
                href={vaultLaneUrl}
                className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30"
              >
                Open LockVault + Wallet Lock lane
              </a>
              <a
                href={dashboardUrl}
                className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30"
              >
                Open full dashboard
              </a>
            </div>
            {user && (
              <p className="mt-4 text-xs font-mono text-gray-500">
                Session found. Redirecting you to the dashboard AutoVault lane now.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                step: '01',
                label: 'Set the rule',
                desc: 'Define the trigger that should auto-send wins or overages into LockVault.',
              },
              {
                step: '02',
                label: 'Auto-vault on trigger',
                desc: 'Dashboard writes the durable AutoVault rule. Web is not running a shadow rules engine.',
              },
              {
                step: '03',
                label: 'Review the lock',
                desc: 'LockVault timers, staged unlocks, and Wallet Lock requests stay in the same canonical dashboard lane.',
              },
            ].map(({ step, label, desc }) => (
              <div key={step} className="rounded-2xl border border-[#283347] bg-black/30 p-5">
                <p className="text-[#17c3b2] text-xs font-mono font-bold mb-2">{step}</p>
                <p className="text-white text-sm font-black uppercase tracking-tight mb-2">
                  {label}
                </p>
                <p className="text-gray-400 text-xs">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-[#283347] bg-black/30 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">
              Ownership split
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#283347] bg-black/30 p-5">
                <p className="text-sm font-black uppercase tracking-tight text-white">
                  Web keeps the pitch
                </p>
                <p className="mt-3 text-sm text-gray-400">
                  Public explainers, discovery, and trust-building stay here so you can understand
                  the guardrail before you use it.
                </p>
              </div>
              <div className="rounded-2xl border border-[#17c3b2]/25 bg-[#17c3b2]/5 p-5">
                <p className="text-sm font-black uppercase tracking-tight text-white">
                  Dashboard owns the controls
                </p>
                <p className="mt-3 text-sm text-gray-300">
                  Live AutoVault rules, LockVault state, Wallet Lock cooldowns, and unlock requests
                  are managed in the dashboard.
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
