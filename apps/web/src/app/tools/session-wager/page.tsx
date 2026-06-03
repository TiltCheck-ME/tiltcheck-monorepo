/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-03 */
'use client';

import React from 'react';
import Link from 'next/link';
import ToolBetaGate from '@/components/ToolBetaGate';

export default function SessionWagerPage() {
  return (
    <ToolBetaGate title="Session wager">
      <main className="min-h-screen bg-[#0a0c10] text-white">
        <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
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
            Built into AutoVault Share Edition on Stake.us and nuts.gg.
          </p>

          <div className="rounded-2xl border border-[#17c3b2]/35 bg-black/40 p-6 mb-6">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-[#17c3b2] mb-3">
              Get it (install pages)
            </p>
            <p className="text-sm text-gray-300 mb-4 leading-relaxed">
              Session stats show in the same panel as AutoVault after install. Send these links in DMs — not casino chat.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/nuts"
                className="inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#17c3b2] hover:bg-[#17c3b2]/20"
              >
                nuts.gg setup
              </Link>
              <Link
                href="/stake"
                className="inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#17c3b2] hover:bg-[#17c3b2]/20"
              >
                Stake.us setup
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[#283347] bg-black/30 p-6 mb-6">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-gray-500 mb-3">
              What you see in-panel
            </p>
            <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
              <li>
                <span className="font-mono text-white">Wagered</span> — total put at risk this session
              </li>
              <li>
                <span className="font-mono text-white">P/L</span> — net from balance deltas
              </li>
              <li>
                <span className="font-mono text-white">Rounds</span> — each balance change
              </li>
              <li>
                <span className="font-mono text-white">RTP</span> — won ÷ wagered for the session
              </li>
            </ul>
            <p className="mt-4 text-xs font-mono text-gray-500 leading-relaxed">
              Tracks after onboarding even if vault skim is OFF. Reset in the gear drawer.
            </p>
          </div>

          <div className="rounded-2xl border border-[#283347] bg-black/30 p-6">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-gray-500 mb-2">
              Limits
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Balance-based inference, not bet-slip parsing. Tips, vault moves, and bonuses can look like wager
              rounds. Good enough to know if the session is cooked — not a tax ledger.
            </p>
          </div>

          <p className="mt-10 text-center text-[10px] font-mono uppercase tracking-widest text-gray-600">
            Made for Degens. By Degens.
          </p>
        </div>
      </main>
    </ToolBetaGate>
  );
}
