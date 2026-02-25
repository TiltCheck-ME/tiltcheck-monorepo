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

export default function QualifyFirstPage() {
  return (
    <main className="min-h-screen bg-[#0E0E0F] pt-12 pb-20">
      <div className="container mx-auto px-6">
        <header className="mb-12">
          <Link href="/" className="text-[#00FFC6] text-xs font-bold tracking-widest hover:underline mb-4 inline-block">← RETURN TO HUB</Link>
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-4xl md:text-5xl font-black font-space text-white tracking-tight">
              QUALIFYFIRST
            </h1>
          </div>
          <p className="text-lg text-[#6B7280] max-w-2xl">
            Earn crypto by completing high-quality surveys and tasks. Verified by TrustEngine.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-[#1A1F24] p-8 rounded-xl border border-[#00FFC6]/10">
            <h2 className="text-xl font-black font-space text-white mb-6 tracking-tight flex items-center gap-3">
              <span className="w-2 h-6 bg-[#00FFC6]" />
              AVAILABLE TASKS
            </h2>
            <div className="space-y-4">
              <TaskItem 
                title="GAMING HABITS SURVEY" 
                reward="0.05 SOL" 
                time="5 MINS"
                status="AVAILABLE"
              />
              <TaskItem 
                title="WEBSITE FEEDBACK" 
                reward="0.02 SOL" 
                time="2 MINS"
                status="AVAILABLE"
              />
              <TaskItem 
                title="TRUST ENGINE BETA TEST" 
                reward="0.10 SOL" 
                time="15 MINS"
                status="LOCKED"
              />
            </div>
          </div>

          <div className="bg-[#1A1F24] p-8 rounded-xl border border-[#00FFC6]/10 text-center flex flex-col justify-center">
            <h2 className="text-xl font-black font-space text-white mb-2 tracking-tight">YOUR EARNINGS</h2>
            <div className="py-8">
              <div className="text-6xl font-black font-space text-[#00FFC6] mb-2 tracking-tighter">0.00 SOL</div>
              <p className="text-[10px] tracking-[0.2em] text-[#6B7280] font-bold uppercase">Pending rewards will appear here</p>
            </div>
            <button className="mt-4 px-6 py-4 bg-[#0E0E0F] border border-[#00FFC6]/20 text-[#00FFC6] rounded font-bold text-xs tracking-[0.2em] hover:bg-[#00FFC6]/5 transition-all">
              CONNECT WALLET TO WITHDRAW
            </button>
          </div>
        </div>

        <section className="bg-[#00C2FF]/5 border border-[#00C2FF]/20 p-8 rounded-xl">
          <h3 className="text-sm font-black font-space text-[#00C2FF] mb-4 tracking-[0.2em] uppercase">HOW IT WORKS</h3>
          <p className="text-[#B8C4CE] text-sm leading-relaxed font-medium">
            QualifyFirst uses the **TrustEngine** to match you with relevant tasks. 
            The higher your "Degen Score", the better the rewards you can unlock. 
            All payouts are processed instantly via **JustTheTip** directly to your linked wallet.
          </p>
        </section>
      </div>
    </main>
  );
}

function TaskItem({ title, reward, time, status }: { title: string; reward: string; time: string; status: 'AVAILABLE' | 'LOCKED' }) {
  const isAvailable = status === 'AVAILABLE';
  return (
    <div className={`flex items-center justify-between p-5 rounded border transition-all ${isAvailable ? 'bg-[#0E0E0F]/50 border-[#00FFC6]/10 hover:border-[#00FFC6]/30' : 'bg-[#0E0E0F]/20 border-white/5 opacity-50'}`}>
      <div>
        <h4 className="font-bold text-white text-sm tracking-tight mb-1">{title}</h4>
        <p className="text-[10px] tracking-widest text-[#6B7280] font-bold uppercase">{time} • {reward}</p>
      </div>
      <button 
        disabled={!isAvailable}
        className={`px-4 py-2 rounded font-black text-[10px] tracking-[0.2em] transition-all ${
          isAvailable 
            ? 'bg-[#00FFC6] text-[#0E0E0F] hover:opacity-90' 
            : 'bg-[#1A1F24] text-[#6B7280] cursor-not-allowed border border-white/5'
        }`}
      >
        {isAvailable ? 'START' : 'LOCKED'}
      </button>
    </div>
  );
}

