/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
import React from 'react';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="border-b border-[#283347] pb-8">
        <h1 className="text-4xl font-black uppercase tracking-tighter text-[color:var(--color-primary)]">
          Degen Hub <span className="text-sm font-normal text-gray-500">v2.0 (Alpha)</span>
        </h1>
        <p className="text-gray-400 mt-2">The math is here. The house is watching. Are you ready to win?</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Trust Score Terminal */}
        <div className="col-span-1 md:col-span-2 terminal-box border-[#17c3b2]">
          <div className="terminal-prompt">
            <span className="prompt-prefix">$</span>
            <span className="prompt-text">query --trust-score --id=@me</span>
          </div>
          <div className="p-12 text-center">
            <div className="text-8xl font-black text-[color:var(--color-primary)] tracking-tighter mb-4">—</div>
            <div className="uppercase font-bold tracking-[0.2em] text-gray-500">Trust Index // Link Discord to see your score</div>
          </div>
        </div>

        {/* Sidebar / Buddies */}
        <div className="col-span-1 flex flex-col gap-8">
           <div className="terminal-box border-[#17c3b2] p-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#17c3b2] mb-4">Accountability Net</h2>
              <div className="flex flex-col gap-3">
                 <div className="p-3 border border-[#283347] bg-black/40 text-xs text-gray-400 font-mono">
                    NO ACTIVE BUDDIES FOUND.
                 </div>
                 <button className="w-full py-3 text-[10px] font-black uppercase tracking-widest bg-[#17c3b2]/10 text-[#17c3b2] border border-[#17c3b2]/30 hover:bg-[#17c3b2]/20 transition-all">
                    INVITE BUDDY
                 </button>
              </div>
           </div>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="p-8 border border-[#283347] bg-black/20">
            <h2 className="text-lg font-bold uppercase mb-4 tracking-tight">Recent Audit Events</h2>
            <div className="text-xs font-mono text-gray-600">
               No session data yet. Install the Chrome extension to start tracking your sessions.
            </div>
         </div>
         <div className="p-8 border border-[#283347] bg-black/20 flex flex-col justify-between">
            <div>
                <h2 className="text-lg font-bold uppercase mb-2 tracking-tight">Active Vaults</h2>
                <p className="text-sm text-gray-400">No active vaults. Connect your wallet to get started.</p>
            </div>
            <a href="/tools/auto-vault" className="mt-8 text-left text-xs font-black uppercase tracking-widest text-[color:var(--color-primary)] hover:translate-x-2 transition-transform">
               Configure Vaults &rarr;
            </a>
         </div>
         <div className="p-8 border border-green-500/20 bg-green-500/5 flex flex-col justify-between">
            <div>
                <h2 className="text-lg font-bold uppercase mb-2 tracking-tight text-green-400">Wins Secured</h2>
                <p className="text-sm text-gray-400">No redeems tracked yet. Your wins will show up here.</p>
            </div>
            <button disabled className="mt-8 text-left text-xs font-black uppercase tracking-widest text-gray-600 cursor-not-allowed opacity-50">
               View History &rarr;
            </button>
         </div>
      </section>
      {/* RTP Transparency Info */}
      <section className="p-8 border border-[#17c3b2]/20 bg-[#17c3b2]/5">
         <h2 className="text-lg font-bold uppercase mb-4 tracking-tight text-[#17c3b2] flex items-center gap-2">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           RTP Audit Transparency
         </h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-400">
           <div>
             <h3 className="font-bold text-gray-300 mb-2 tracking-wide uppercase">Short-Term Variance</h3>
             <p>A "small sample" of 100–500 rounds can easily yield an observed RTP of 80% or 120%. A minimum of <strong>10,000+ rounds</strong> is required to overcome variance and accurately audit strong 99% claims on games like <em>Chicken</em> or <em>Plinko</em>.</p>
           </div>
           <div>
             <h3 className="font-bold text-gray-300 mb-2 tracking-wide uppercase">House Edge Formula</h3>
             <p>Stake.us does not have a "site-wide" RTP. You must check each game. Formula: <code>100% - House Edge = RTP</code>. Note: <em>Gold Coins (GC)</em> and <em>Stake Cash (SC)</em> utilize the exact same RNG engine and RTP mechanics.</p>
           </div>
           <div className="md:col-span-2 p-4 mt-2 border border-[#283347] bg-black/40 text-xs">
             <strong className="text-white">Stake Originals Specs:</strong> <strong>Chicken:</strong> 99% RTP (1-24 bones) | <strong>Pump:</strong> 98% RTP (Turn-based, Max win 3.2M x) | <strong>Blackjack:</strong> Up to 99.43% (Requires perfect strategy). <em>Enhanced RTP slots sit around ~98%.</em>
           </div>
         </div>
      </section>
    </div>
  );
}
