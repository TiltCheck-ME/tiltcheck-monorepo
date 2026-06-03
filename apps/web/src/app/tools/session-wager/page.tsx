/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-02 */
'use client';

import React from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const SHARE_SCRIPT = 'https://tiltcheck.me/userscripts/tiltcheck-autovault-share.user.js';

export default function SessionWagerPage() {
  const [copied, setCopied] = React.useState(false);

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_SCRIPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-[#0a0c10] text-white">
        <div className="max-w-2xl mx-auto px-4 py-12 pt-32">
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">
            <Link href="/tools" className="hover:text-[#17c3b2] transition-colors">
              Tools
            </Link>
            {' / '}
            <span className="text-gray-400">Session wager</span>
          </p>

          <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">
            Session wager tracker
          </h1>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Live wagered volume, P/L, round count, and session RTP — read from balance changes while you play.
            Built into AutoVault Share Edition on Stake.us and nuts.gg. No extension required.
          </p>

          <div className="rounded-2xl border border-[#17c3b2]/35 bg-black/40 p-6 mb-6">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-[#17c3b2] mb-3">
              What you see in-panel
            </p>
            <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
              <li>
                <span className="font-mono text-white">Wagered</span> — total put at risk this session (balance drops)
              </li>
              <li>
                <span className="font-mono text-white">P/L</span> — net won minus wagered from balance deltas
              </li>
              <li>
                <span className="font-mono text-white">Rounds</span> — each balance change counts as one round
              </li>
              <li>
                <span className="font-mono text-white">RTP</span> — won ÷ wagered for the session (after first bet)
              </li>
            </ul>
            <p className="mt-4 text-xs font-mono text-gray-500 leading-relaxed">
              Tracks whenever the Share Edition panel is active after onboarding — even if AutoVault vault skim is OFF.
              Reset stats from the gear drawer. Currency follows Stake coin toggle or SOL on nuts.gg.
            </p>
          </div>

          <div className="rounded-2xl border border-[#283347] bg-black/30 p-6 mb-6">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-gray-500 mb-3">
              Install Share Edition
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                readOnly
                value={SHARE_SCRIPT}
                className="flex-1 bg-[#080a0d] border border-[#283347] text-white text-xs font-mono px-3 py-3"
                aria-label="Share Edition script URL"
              />
              <button
                type="button"
                onClick={() => void copyScript()}
                className="shrink-0 border border-[#17c3b2]/40 bg-[#17c3b2]/10 text-[#17c3b2] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] hover:bg-[#17c3b2]/20"
              >
                Copy link
              </button>
            </div>
            {copied && (
              <p className="text-xs font-mono text-[#17c3b2] mb-3">Link copied.</p>
            )}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/tools/auto-vault/android"
                className="inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#17c3b2] hover:bg-[#17c3b2]/20"
              >
                Android QR install
              </Link>
              <Link
                href="/tools/auto-vault/share"
                className="inline-flex items-center justify-center rounded-xl border border-[#283347] bg-black/30 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white hover:border-[#17c3b2]/40 hover:text-[#17c3b2]"
              >
                Share page
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[#283347] bg-black/30 p-6">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-gray-500 mb-2">
              Limits
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Balance-based inference, not bet-slip parsing. Tips, vault moves, and bonuses can look like wager
              rounds. Good enough to know if the session is cooked — not a tax ledger. Full multi-site telemetry
              still lives in the TiltCheck extension for desktop power users.
            </p>
          </div>

          <p className="mt-10 text-center text-[10px] font-mono uppercase tracking-widest text-gray-600">
            Made for Degens. By Degens.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
