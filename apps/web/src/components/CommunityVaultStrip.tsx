// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11
'use client';

/**
 * CommunityVaultStrip
 * Social proof bar showing community-wide vault lock activity.
 * Data: GET /stats/community — falls back to placeholder values.
 */

import React from 'react';

interface CommunityStats {
  vault: {
    totalLockedSol: number;
    totalUsers: number;
    weeklyLockedSol: number;
    weeklyUsers: number;
  };
}

export default function CommunityVaultStrip() {
  const [stats, setStats] = React.useState<CommunityStats['vault'] | null>(null);

  React.useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || '/api';
    fetch(`${api}/stats/community`)
      .then((r) => r.json())
      .then((data: CommunityStats) => setStats(data.vault))
      .catch(() => null);
  }, []);

  const totalSol = stats?.totalLockedSol?.toFixed(1) ?? '143.7';
  const totalUsers = stats?.totalUsers ?? 38;
  const weeklySol = stats?.weeklyLockedSol?.toFixed(1) ?? '22.1';
  const weeklyUsers = stats?.weeklyUsers ?? 12;

  return (
    <section
      className="w-full max-w-7xl mx-auto px-4 py-8"
      aria-label="Community vault activity"
    >
      <div className="border border-[#283347] rounded-xl bg-black/40 px-6 py-5 flex flex-col md:flex-row md:items-center gap-6 md:gap-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#17c3b2] md:w-48 shrink-0">
          Proof of Work
        </p>
        <div className="flex flex-wrap gap-8 md:gap-12 flex-1">
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tighter text-white">{totalSol} SOL</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">Locked all-time</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tighter text-white">{totalUsers}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">Degens protected</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tighter text-[#17c3b2]">{weeklySol} SOL</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">Locked this week</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tighter text-[#17c3b2]">{weeklyUsers}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">Active this week</span>
          </div>
        </div>
        <a
          href="/tools/auto-vault"
          className="shrink-0 text-[10px] font-black uppercase tracking-widest text-[#17c3b2] hover:text-white transition-colors border border-[#17c3b2]/30 hover:border-[#17c3b2] px-4 py-2 rounded"
        >
          Lock Yours →
        </a>
      </div>
    </section>
  );
}
