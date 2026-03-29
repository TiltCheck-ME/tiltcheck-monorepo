/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import TrustRollup from '@/components/TrustRollup';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

/**
 * DashboardPage
 * The unified TiltCheck Hub replacing all legacy subdomains.
 */
export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white">
      <Nav />
      
      <main className="max-w-7xl mx-auto px-4 py-12 pt-32">
        {/* Header Section */}
        <header className="mb-12 border-b border-[#283347] pb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-6xl font-black uppercase tracking-tighter mb-2">DEGEN_HUB</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#d946ef] animate-pulse"></span>
                        Status: Active // Account: {isConnected ? address?.slice(0, 8) + '...' + address?.slice(-4) : 'Disconnected'}
                    </p>
                </div>
                {/* Secondary Stats */}
                <div className="flex gap-12 text-sm font-black uppercase tracking-tighter">
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-[10px] mb-1">JUICE_POOL</span>
                        <span className="text-[#d946ef]">4.20 SOL</span>
                    </div>
                    <div className="flex flex-col border-l border-[#283347] pl-12 font-black">
                        <span className="text-gray-500 text-[10px] mb-1 uppercase tracking-tighter">REDEEM_WINS</span>
                        <span className="text-green-500">12</span>
                    </div>
                </div>
            </div>
        </header>

        {/* Dashboard Pillars */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Pillar 1: Trust Engine */}
            <div className="lg:col-span-2 flex flex-col gap-8">
                <TrustRollup score={isConnected ? 88 : 75} />
                
                {/* Activity Log Component could go here */}
                <div className="bg-black/40 border border-[#283347] rounded-xl p-8">
                    <h3 className="text-sm font-black uppercase tracking-tighter text-white mb-6 flex items-center gap-2">
                        <span className="w-2 h-4 bg-gray-600"></span>
                        SYSTEM_ACTIVITY_FEED
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-tight text-white mb-1">Redeem Notification Received</span>
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">2m ago // Stake.us</span>
                            </div>
                            <span className="text-[10px] font-black uppercase text-green-500 bg-green-500/10 px-2 py-0.5 rounded">Action: Secured</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded opacity-50">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-tight text-white mb-1">Tilt Signal Detected</span>
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">1h ago // BC.Game</span>
                            </div>
                            <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">Action: Nudged</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pillar 2: Action Center */}
            <div className="flex flex-col gap-8">
                {/* Protocol Shortcuts */}
                <div className="bg-black/40 border border-[#283347] rounded-xl p-8 h-full">
                    <h3 className="text-sm font-black uppercase tracking-tighter text-[#d946ef] mb-6 flex items-center gap-2">
                        <span className="w-2 h-4 bg-[#d946ef]"></span>
                        SYSTEM_PROTOCOLS
                    </h3>
                    <div className="flex flex-col gap-2">
                        <a href="/docs/ARCHITECTURE-BLUEPRINT" className="group flex items-center justify-between p-4 border border-[#283347] hover:border-[#d946ef] hover:translate-x-1 transition-all">
                            <span className="text-sm font-black uppercase text-white group-hover:text-[#d946ef] transition-colors">Audit Blueprints</span>
                            <span className="text-xs opacity-30 text-white">→</span>
                        </a>
                        <a href="/arena" className="group flex items-center justify-between p-4 border border-[#283347] hover:border-[#d946ef] hover:translate-x-1 transition-all">
                            <span className="text-sm font-black uppercase text-white group-hover:text-[#d946ef] transition-colors">Enter Arena</span>
                            <span className="text-[10px] text-gray-500 group-hover:text-[#d946ef] font-bold uppercase tracking-widest">Live // 142 Miners</span>
                        </a>
                        <a href="https://discord.gg/tiltcheck" target="_blank" className="group flex items-center justify-between p-4 border border-[#283347] hover:border-[#5865F2] hover:translate-x-1 transition-all">
                            <span className="text-sm font-black uppercase text-white group-hover:text-[#5865F2] transition-colors">Join Discord</span>
                            <span className="text-xs opacity-30 text-white">↗</span>
                        </a>
                    </div>

                    <div className="mt-12 pt-12 border-t border-[#283347]">
                        <div className="p-4 bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 rounded-lg">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 italic">Degen Advisor v2 is online.</p>
                            <p className="text-xs font-black uppercase tracking-tight text-white leading-tight">"You're up 4.2 SOL. Don't be a hero. Cash out or the math will find you."</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
