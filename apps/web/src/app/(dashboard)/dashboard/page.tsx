/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
'use client';

import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import TrustRollup from '@/components/TrustRollup';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import ActivityFeed from '@/components/ActivityFeed';
import LockVault from '@/components/LockVault';
import GuardianManager from '@/components/GuardianManager';

/**
 * DashboardPage
 * The unified TiltCheck Hub replacing all legacy subdomains.
 */
export default function DashboardPage() {
  const { publicKey, connected: isConnected } = useWallet();
  const address = publicKey?.toBase58();
  const [userData, setUserData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchUserData() {
      if (!address) return;
      try {
        // Find user by wallet first to get Discord association
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/user/lookup/${address}`);
        if (response.ok) {
          const user = await response.json();
          // Now fetch full stats
          const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/user/${user.discordId}`);
          if (statsResponse.ok) {
            setUserData(await statsResponse.json());
          }
        }
      } catch (err) {
        console.error('[Dashboard] Failed to hydrate:', err);
      } finally {
        setLoading(false);
      }
    }

    if (isConnected && address) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [address, isConnected]);

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white">
      <Nav />
      
      <main className="max-w-7xl mx-auto px-4 py-12 pt-32">
        {/* Header Section */}
        <header className="mb-12 border-b border-[#283347] pb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#17c3b2] animate-pulse' : 'bg-red-500'}`}></span>
                        {isConnected ? `Connected · ${address?.slice(0, 8)}...${address?.slice(-4)}` : 'Not connected'}
                    </p>
                </div>
                {/* Secondary Stats */}
                <div className="flex gap-12 text-sm font-black uppercase tracking-tighter">
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-[10px] mb-1">Juice Pool</span>
                        <span className="text-[#17c3b2]">
                          {loading ? '...' : (userData?.analytics?.totalJuice || '0.00')} SOL
                        </span>
                    </div>
                    <div className="flex flex-col border-l border-[#283347] pl-12 font-black">
                        <span className="text-gray-500 text-[10px] mb-1 uppercase tracking-tighter">Wins Secured</span>
                        <span className="text-green-500">
                          {loading ? '...' : (userData?.analytics?.redeemWins || '0')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Link Required Warning */}
            {isConnected && !loading && !userData && (
              <div className="mt-8 p-6 bg-[#17c3b2]/5 border border-[#17c3b2]/30 rounded-lg animate-in slide-in-from-top duration-500">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <h3 className="text-base font-black uppercase tracking-tighter text-white">Wallet not linked yet</h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      We don&apos;t recognize this wallet. Run <code className="text-[#17c3b2]">/linkwallet</code> in our Discord server and your stats will show up here automatically.
                    </p>
                  </div>
                  <a href="https://discord.gg/gdBsEJfCar" target="_blank" className="btn btn-primary text-[10px] py-2 whitespace-nowrap">Join Discord</a>
                </div>
              </div>
            )}
        </header>

        {/* Dashboard Pillars */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Pillar 1: Trust Engine */}
            <div className="lg:col-span-2 flex flex-col gap-8">
                <TrustRollup score={isConnected && userData ? (userData.trustScore ?? 0) : 0} />
                
                {/* Live Audit Feed (Phase 12) */}
                <ActivityFeed discordId={userData?.discordId} />
            </div>

            {/* Pillar 2: Action Center */}
            <div className="flex flex-col gap-8">
                {/* Protocol Shortcuts */}
                <div className="bg-black/40 border border-[#283347] rounded-xl p-8 h-full">
                    <h3 className="text-sm font-black uppercase tracking-tighter text-[#17c3b2] mb-6 flex items-center gap-2">
                        <span className="w-2 h-4 bg-[#17c3b2]"></span>
                        Quick Links
                    </h3>
                    <div className="flex flex-col gap-2">
                        <a href="/docs" className="group flex items-center justify-between p-4 border border-[#283347] hover:border-[#17c3b2] hover:translate-x-1 transition-all">
                            <span className="text-sm font-black uppercase text-white group-hover:text-[#17c3b2] transition-colors">Audit Blueprints</span>
                            <span className="text-xs opacity-30 text-white">→</span>
                        </a>
                        <a href="/tools/auto-vault" className="group flex items-center justify-between p-4 border border-[#283347] hover:border-[#17c3b2] hover:translate-x-1 transition-all">
                            <span className="text-sm font-black uppercase text-white group-hover:text-[#17c3b2] transition-colors">Enter Vault</span>
                            <span className="text-[10px] text-gray-500 group-hover:text-[#17c3b2] font-bold uppercase tracking-widest">Live // Secure</span>
                        </a>
                        <a href="https://discord.gg/gdBsEJfCar" target="_blank" className="group flex items-center justify-between p-4 border border-[#283347] hover:border-[#5865F2] hover:translate-x-1 transition-all">
                            <span className="text-sm font-black uppercase text-white group-hover:text-[#5865F2] transition-colors">Join Discord</span>
                            <span className="text-xs opacity-30 text-white">↗</span>
                        </a>
                    </div>

                    <div className="mt-12 pt-12 border-t border-[#283347]">
                        <div className="p-4 bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 rounded-lg">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 italic">Degen Advisor v2 is online.</p>
                            <p className="text-xs font-black uppercase tracking-tight text-white leading-tight">
                              {userData ? '"Your session data is loading. The math is watching."' : '"Identify yourself. The math can\'t help a ghost."'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pillar 4: The Guardians */}
                <GuardianManager discordId={userData?.discordId} />

                {/* Pillar 5: VPN Bypass Toggle */}
                <div className="bg-black/40 border border-[#283347] rounded-xl p-8 hover:border-amber-500/50 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black uppercase tracking-tighter text-amber-500 flex items-center gap-2">
                            <span className="w-2 h-4 bg-amber-500"></span>
                            SHADOW_MODE (VPN_BYPASS)
                        </h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={userData?.preferences?.complianceBypass || false}
                              onChange={async (e) => {
                                const checked = e.target.checked;
                                // Optimistic update
                                setUserData((prev: any) => ({
                                  ...prev,
                                  preferences: { ...prev?.preferences, complianceBypass: checked }
                                }));

                                // Persist
                                try {
                                  await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/user/onboarding`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      preferences: { complianceBypass: checked }
                                    })
                                  });
                                } catch (err) {
                                  console.error('[Settings] Bypass update failed:', err);
                                }
                              }}
                            />
                            <div className="w-11 h-6 bg-[#111827] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                        </label>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-tight">
                        Using a VPN to access restricted regions? Toggle this to stop the compliance warnings.
                        <br/>
                        <span className="text-amber-500 mt-2 block italic">Note: you are outside legal protection when you do this.</span>
                    </p>
                </div>
            </div>
        </div>

        {/* Pillar 3: LockVault — only shown after wallet linked via /linkwallet in Discord */}
        {userData && (
          <div className="mt-12">
            <LockVault discordId={userData?.discordId} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
