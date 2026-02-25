/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function BetCheckPage() {
  return (
    <main className="min-h-screen bg-[#0E0E0F] pt-12 pb-20">
      <div className="container mx-auto px-6">
        <header className="mb-12">
          <Link href="/" className="text-[#00FFC6] text-xs font-bold tracking-widest hover:underline mb-4 inline-block">← RETURN TO HUB</Link>
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-4xl md:text-5xl font-black font-space text-white tracking-tight">
              BET CHECK
            </h1>
          </div>
          <p className="text-lg text-[#6B7280] max-w-2xl">
            Verify fairness and analyze your betting performance across platforms. Proving it's not rigged, one bet at a time.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-[#1A1F24] p-8 rounded-xl border border-[#00FFC6]/10">
            <h2 className="text-xl font-black font-space text-white mb-6 tracking-tight flex items-center gap-3">
              <span className="w-2 h-6 bg-[#00FFC6]" />
              RECENT ANALYSIS
            </h2>
            <div className="space-y-4">
              <BetRow 
                game="PLINKO" 
                outcome="WIN" 
                amount="1.50 SOL" 
                fairness="VERIFIED"
              />
              <BetRow 
                game="DICE" 
                outcome="LOSS" 
                amount="0.20 SOL" 
                fairness="VERIFIED"
              />
              <BetRow 
                game="LIMBO" 
                outcome="WIN" 
                amount="5.00 SOL" 
                fairness="VERIFIED"
              />
            </div>
          </div>

          <div className="bg-[#1A1F24] p-8 rounded-xl border border-[#00FFC6]/10 flex flex-col">
            <h2 className="text-xl font-black font-space text-white mb-6 tracking-tight">PROFIT ANALYTICS</h2>
            <div className="flex-grow min-h-[150px] bg-[#0E0E0F]/50 rounded border border-[#00FFC6]/5 flex items-center justify-center text-[#6B7280] text-[10px] tracking-[0.2em] font-bold uppercase italic">
              Chart visualization active...
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#00FFC6]/5 border border-[#00FFC6]/20 rounded text-center">
                <div className="text-[9px] text-[#6B7280] uppercase font-bold tracking-widest mb-1">TOTAL PROFIT</div>
                <div className="text-xl font-black font-space text-[#00FFC6]">+6.30 SOL</div>
              </div>
              <div className="p-4 bg-[#00C2FF]/5 border border-[#00C2FF]/20 rounded text-center">
                <div className="text-[9px] text-[#6B7280] uppercase font-bold tracking-widest mb-1">WIN RATE</div>
                <div className="text-xl font-black font-space text-[#00C2FF]">42.5%</div>
              </div>
            </div>
          </div>
        </div>

        <section className="bg-[#f59e0b]/5 border border-[#f59e0b]/20 p-8 rounded-xl">
          <h2 className="text-sm font-black font-space text-[#f59e0b] mb-4 tracking-[0.2em] uppercase">CONNECT CASINO ACCOUNTS</h2>
          <p className="text-[#B8C4CE] text-sm leading-relaxed mb-8 font-medium">
            Bet Check automatically pulls data from your linked casino accounts to verify Provably Fair seeds 
            and track your lifetime performance.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-3 bg-[#f59e0b] text-[#0E0E0F] font-black text-[10px] tracking-[0.2em] rounded hover:opacity-90 transition-all uppercase">
              LINK STAKE ACCOUNT
            </button>
            <button className="px-6 py-3 bg-[#1A1F24] border border-[#f59e0b]/30 text-[#f59e0b] font-black text-[10px] tracking-[0.2em] rounded hover:bg-[#f59e0b]/5 transition-all uppercase">
              LINK ROOBET ACCOUNT
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function BetRow({ game, outcome, amount, fairness }: { game: string; outcome: 'WIN' | 'LOSS'; amount: string; fairness: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#0E0E0F]/50 rounded border border-[#00FFC6]/10">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-[#1A1F24] border border-[#00FFC6]/20 rounded flex items-center justify-center font-black text-white text-xs">
          {game[0]}
        </div>
        <div>
          <h4 className="font-bold text-white text-sm tracking-tight">{game}</h4>
          <p className={`text-[10px] font-black tracking-widest uppercase ${outcome === 'WIN' ? 'text-[#00FFC6]' : 'text-[#ef4444]'}`}>
            {outcome} • {amount}
          </p>
        </div>
      </div>
      <div className="text-[9px] font-black text-[#6B7280] bg-[#1A1F24] px-2 py-1 rounded border border-white/5 tracking-tighter">
        {fairness}
      </div>
    </div>
  );
}

