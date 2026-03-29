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
            <div className="text-8xl font-black text-[color:var(--color-primary)] tracking-tighter mb-4">75</div>
            <div className="uppercase font-bold tracking-[0.2em] text-gray-500">Trust Index // Optimized</div>
          </div>
        </div>

        {/* Sidebar / Buddies */}
        <div className="col-span-1 flex flex-col gap-8">
           <div className="terminal-box border-[#d946ef] p-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#d946ef] mb-4">Accountability Net</h2>
              <div className="flex flex-col gap-3">
                 <div className="p-3 border border-[#283347] bg-black/40 text-xs text-gray-400 font-mono">
                    NO ACTIVE BUDDIES FOUND.
                 </div>
                 <button className="w-full py-3 text-[10px] font-black uppercase tracking-widest bg-[#d946ef]/10 text-[#d946ef] border border-[#d946ef]/30 hover:bg-[#d946ef]/20 transition-all">
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
               [11:42:01] Session established on Roobet.com<br/>
               [11:39:12] RTP verified: 96.01%<br/>
               [11:35:44] Intervention ENGINE enabled (Degen Mode)
            </div>
         </div>
         <div className="p-8 border border-[#283347] bg-black/20 flex flex-col justify-between">
            <div>
                <h2 className="text-lg font-bold uppercase mb-2 tracking-tight">Active Vaults</h2>
                <p className="text-sm text-gray-400">0.00 SOL protected across 3 vaults.</p>
            </div>
            <button className="mt-8 text-left text-xs font-black uppercase tracking-widest text-[color:var(--color-primary)] hover:translate-x-2 transition-transform">
               Configure Vaults &rarr;
            </button>
         </div>
      </section>
    </div>
  );
}
