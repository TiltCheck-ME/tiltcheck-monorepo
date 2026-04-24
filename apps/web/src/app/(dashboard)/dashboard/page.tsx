/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23 */
'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardHandoffUrl, getWebLoginRedirect } from '@/lib/dashboard-handoff';

/**
 * DashboardPage
 * Web dashboard shell that hands off to the canonical TiltCheck dashboard.
 */
export default function DashboardPage() {
  const { user, loading } = useAuth();
  const dashboardUrl = getDashboardHandoffUrl('/dashboard');
  const vaultUrl = getDashboardHandoffUrl('/tools/auto-vault');
  const safetyUrl = getDashboardHandoffUrl('/dashboard?tab=safety');
  const buddiesUrl = getDashboardHandoffUrl('/tools/buddy-system');
  const primaryActionHref = !loading && user ? dashboardUrl : getWebLoginRedirect('/dashboard');

  React.useEffect(() => {
    if (loading || !user) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      window.location.assign(dashboardUrl);
    }, 1200);

    return () => window.clearTimeout(redirectTimer);
  }, [dashboardUrl, loading, user]);

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white">
      <main className="mx-auto max-w-5xl px-4 py-24">
        <section className="rounded-3xl border border-[#17c3b2]/25 bg-black/40 p-8 md:p-12">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">
            Dashboard handoff
          </p>
          <h1 className="text-4xl font-black uppercase tracking-tighter md:text-5xl">
            Open your TiltCheck dashboard.
          </h1>
          <p className="mt-5 max-w-3xl text-sm text-gray-400 md:text-base">
            Log in once, then move into the control surface that owns your profile, vault rules,
            safety filters, and buddy settings. This page exists to get you there without making
            the route hunt feel like part of the product.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
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
                  ? 'Open dashboard controls'
                  : 'Log in to open dashboard'}
            </a>
            <a
              href={dashboardUrl}
              className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30"
            >
              Open dashboard directly
            </a>
          </div>

          {user && (
            <p className="mt-4 text-xs font-mono text-gray-500">
              Session found. Redirecting you to dashboard controls now.
            </p>
          )}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              href: vaultUrl,
              title: 'Vault controls',
              copy: 'LockVault timers, Wallet Lock cooldowns, and AutoVault rules live in the dashboard vault lane.',
            },
            {
              href: safetyUrl,
              title: 'Safety controls',
              copy: 'Durable exclusions and temptation filters moved under dashboard ownership.',
            },
            {
              href: buddiesUrl,
              title: 'Buddy system',
              copy: 'Accountability partners and alert thresholds now belong to the dashboard flow.',
            },
          ].map(({ href, title, copy }) => (
            <a
              key={title}
              href={href}
              className="rounded-2xl border border-[#283347] bg-black/30 p-6 transition-colors hover:border-[#17c3b2]/30"
            >
              <p className="text-sm font-black uppercase tracking-tight text-white">{title}</p>
              <p className="mt-3 text-sm text-gray-400">{copy}</p>
            </a>
          ))}
        </section>

        <p className="mt-10 text-center text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
          Made for Degens. By Degens.
        </p>
      </main>
    </div>
  );
}
