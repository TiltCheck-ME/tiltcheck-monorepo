/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
'use client';

import React from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardHandoffUrl, getWebLoginRedirect } from '@/lib/dashboard-handoff';

/**
 * AutoVaultPage
 * Web explainer for the AutoVault system. Hands off durable rules to the
 * canonical dashboard, and pitches the in-browser surfaces (extension +
 * userscript) for the moment-to-moment "skim wins as they happen" use case.
 */

// Platform support tiers — reflect actual reliability, not aspirations.
// Mirrors the chrome extension's casino-vault-adapters.ts coverage so both
// surfaces tell the same story.
type PlatformAccent = 'teal' | 'gold' | 'muted';
type PlatformCasino = { name: string; note?: string };
type PlatformTier = {
  tier: string;
  descriptor: string;
  casinos: PlatformCasino[];
  accent: PlatformAccent;
};

const PLATFORM_TIERS: PlatformTier[] = [
  {
    tier: 'API mode',
    descriptor: 'Atomic. Fastest. Most reliable.',
    casinos: [
      { name: 'Stake.us', note: 'Primary support. SC + GC vault.' },
      {
        name: 'Stake.com',
        note: 'Plus all mirrors (.bet, .games, staketrN, etc). Works when Cloudflare is friendly. US users on a VPN: expect challenges.',
      },
    ],
    accent: 'teal',
  },
  {
    tier: 'Nudge mode',
    descriptor:
      'Detects a heater and opens the casino\u2019s own vault dialog. You confirm the deposit. Safer than auto-clicking unknown UIs.',
    casinos: [
      { name: 'Shuffle.us', note: 'Primary nudge target. Tested.' },
      { name: 'Shuffle.com' },
      { name: 'Gamba', note: 'gamba.com / gambacasino.com' },
      { name: 'Goated' },
      { name: 'BC.Game' },
      { name: 'Roobet' },
      { name: 'Rollbit' },
      { name: 'Gamdom' },
    ],
    accent: 'gold',
  },
  {
    tier: 'Not yet',
    descriptor:
      'Have vault-like features but the team has not tested the script there. Send a ping if you want one bumped up the list.',
    casinos: [
      { name: 'DuelBits' },
      { name: 'TrustDice' },
      { name: 'Cloudbet' },
      { name: 'MetaWin' },
      { name: 'Wagmi' },
      { name: 'Chips.gg' },
      { name: 'Crashino' },
    ],
    accent: 'muted',
  },
];

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

    // Bumped from 1.4s to 5s so logged-in users actually have time to see
    // the in-browser install section before getting punted to the dashboard.
    const redirectTimer = window.setTimeout(() => {
      window.location.assign(vaultLaneUrl);
    }, 5000);

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
                Session found. Punting you to the dashboard AutoVault lane in 5 seconds. Or stay
                here and grab the in-browser surfaces below.
              </p>
            )}
          </div>

          {/* In-browser AutoVault surfaces — extension + userscript */}
          <div className="mb-10 rounded-3xl border border-[#17c3b2]/25 bg-black/40 p-8 md:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2] mb-2 font-mono">
              In-browser
            </p>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">
              Run AutoVault inside your casino tab
            </h2>
            <p className="text-gray-400 text-sm max-w-2xl mb-6">
              Dashboard owns the durable rules. The extension and userscript are what actually
              press the vault button while you play. Pick one — they do the same job, the
              extension just has nicer ergonomics.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Chrome extension — primary recommendation */}
              <div className="rounded-2xl border border-[#17c3b2]/40 bg-[#17c3b2]/5 p-6 flex flex-col">
                <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-[#17c3b2] mb-2">
                  Recommended
                </p>
                <h3 className="text-lg font-black uppercase tracking-tight text-white mb-2">
                  TiltCheck Chrome Extension
                </h3>
                <p className="text-sm text-gray-300 flex-1 mb-4">
                  Built-in. Survives Cloudflare a little better than the userscript thanks to a
                  more stable request fingerprint. Plays nice with the rest of the TiltCheck
                  toolkit (LockVault, tilt detection, session stats).
                </p>
                <Link
                  href="/extension"
                  className="inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/15 px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/25"
                >
                  Install the extension
                </Link>
              </div>

              {/* Userscript — power user fallback */}
              <div className="rounded-2xl border border-[#283347] bg-black/30 p-6 flex flex-col">
                <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-gray-500 mb-2">
                  Power user
                </p>
                <h3 className="text-lg font-black uppercase tracking-tight text-white mb-2">
                  TiltCheck Userscript
                </h3>
                <p className="text-sm text-gray-300 flex-1 mb-4">
                  No extension install. Drop into Tampermonkey, refresh the casino tab, done.
                  Same vault logic as the extension, slightly less polished UI. Good if you do
                  not want yet another browser extension installed.
                </p>
                <a
                  href="/userscripts/tiltcheck-autovault.user.js"
                  className="inline-flex items-center justify-center rounded-xl border border-[#283347] bg-black/40 px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/40 hover:text-[#17c3b2]"
                >
                  Install via Tampermonkey
                </a>
                <p className="mt-3 text-[10px] font-mono text-gray-500 leading-relaxed">
                  Requires Tampermonkey (Chrome / Firefox / Edge). Click the link with
                  Tampermonkey installed and it will offer the install dialog directly.
                </p>
              </div>
            </div>

            {/* Platform support tiers */}
            <div className="mt-8 border-t border-[#283347] pt-6">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500 mb-4 font-mono">
                Where it works
              </p>
              <div className="space-y-4">
                {PLATFORM_TIERS.map(({ tier, descriptor, casinos, accent }) => {
                  const accentBorder =
                    accent === 'teal'
                      ? 'border-[#17c3b2]/30'
                      : accent === 'gold'
                        ? 'border-[#ffd700]/25'
                        : 'border-[#283347]';
                  const accentText =
                    accent === 'teal'
                      ? 'text-[#17c3b2]'
                      : accent === 'gold'
                        ? 'text-[#ffd700]'
                        : 'text-gray-500';
                  return (
                    <div key={tier} className={`rounded-2xl border ${accentBorder} bg-black/30 p-5`}>
                      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                        <p className={`text-[10px] font-mono font-black uppercase tracking-[0.18em] ${accentText}`}>
                          {tier}
                        </p>
                        <p className="text-xs text-gray-400">{descriptor}</p>
                      </div>
                      <ul className="mt-3 space-y-1.5">
                        {casinos.map(({ name, note }) => (
                          <li key={name} className="text-sm text-gray-300">
                            <span className="font-mono font-bold text-white">{name}</span>
                            {note && <span className="text-gray-500"> — {note}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <p className="mt-5 text-xs font-mono text-gray-500 leading-relaxed">
                Non-custodial. The script and extension call the casino&apos;s own vault API or
                click the casino&apos;s own vault button using your already-logged-in session.
                TiltCheck never sees, holds, or moves your funds. Your keys, your crypto, your
                bag.
              </p>
            </div>
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
