/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-13 */
'use client';

import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import TrustRollup from '@/components/TrustRollup';
import ActivityFeed from '@/components/ActivityFeed';
import LockVault from '@/components/LockVault';
import GuardianManager from '@/components/GuardianManager';
import TouchGrassButton from '@/components/TouchGrassButton';
import { useAuth } from '@/hooks/useAuth';
import { signInWithMagicEmail } from '@/lib/magicAuth';

/**
 * DashboardPage
 * The unified TiltCheck Hub replacing all legacy subdomains.
 */
export default function DashboardPage() {
  const { publicKey, connected: isConnected } = useWallet();
  const { user } = useAuth();
  const address = publicKey?.toBase58();
  const [userData, setUserData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [betaInbox, setBetaInbox] = React.useState<any>(null);
  const [betaInboxLoading, setBetaInboxLoading] = React.useState(true);
  const [magicEmail, setMagicEmail] = React.useState('');
  const [magicLoading, setMagicLoading] = React.useState(false);
  const [magicError, setMagicError] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    async function fetchBetaInbox() {
      if (!user?.userId) {
        setBetaInbox(null);
        setBetaInboxLoading(false);
        return;
      }

      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('tc_token') : null;
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/beta/inbox`, {
          credentials: 'include',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          setBetaInbox(null);
          return;
        }

        const payload = await response.json();
        setBetaInbox(payload);
      } catch (err) {
        console.error('[Dashboard] Beta inbox fetch failed:', err);
        setBetaInbox(null);
      } finally {
        setBetaInboxLoading(false);
      }
    }

    fetchBetaInbox();
  }, [user?.userId]);

  async function handleMagicSignIn() {
    if (!magicEmail.trim()) {
      setMagicError('Enter your email first.');
      return;
    }

    setMagicLoading(true);
    setMagicError(null);

    try {
      await signInWithMagicEmail(process.env.NEXT_PUBLIC_API_URL || '/api', magicEmail.trim());
      window.location.reload();
    } catch (error) {
      setMagicError(error instanceof Error ? error.message : 'Magic sign-in failed.');
    } finally {
      setMagicLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white">
      <main className="max-w-7xl mx-auto px-4 py-12">
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

        {!user?.userId && (
          <section className="mb-8">
            <div className="bg-black/40 border border-[#17c3b2]/30 rounded-xl p-6">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Site lane sign-in</p>
              <h2 className="text-lg font-black uppercase tracking-tight text-white mb-3">Use Magic if you are beta-approved without Discord.</h2>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                This signs you into the web dashboard and inbox with the same site account used for non-Discord beta approval.
              </p>
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="email"
                  value={magicEmail}
                  onChange={(event) => setMagicEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 bg-black/50 border border-[#283347] p-3 text-white font-mono text-sm focus:outline-none focus:border-[#17c3b2] transition-colors"
                />
                <button
                  type="button"
                  disabled={magicLoading}
                  onClick={handleMagicSignIn}
                  className="px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] bg-[#17c3b2]/10 text-[#17c3b2] border border-[#17c3b2]/30 hover:bg-[#17c3b2]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {magicLoading ? 'Sending link...' : 'Sign in with Magic'}
                </button>
              </div>
              {magicError && <p className="text-xs text-red-400 font-mono mt-3">{magicError}</p>}
            </div>
          </section>
        )}

        {user?.userId && (
          <section className="mb-8">
            <div className="bg-black/40 border border-[#283347] rounded-xl p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Dashboard Inbox</p>
                  <h2 className="text-lg font-black uppercase tracking-tight text-white">Beta access updates</h2>
                </div>
                {betaInbox?.application?.status && (
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest border ${
                    betaInbox.application.status === 'approved'
                      ? 'border-green-500/40 text-green-400 bg-green-500/10'
                      : betaInbox.application.status === 'waitlisted'
                        ? 'border-yellow-500/40 text-yellow-300 bg-yellow-500/10'
                        : betaInbox.application.status === 'rejected'
                          ? 'border-red-500/40 text-red-400 bg-red-500/10'
                          : 'border-[#17c3b2]/30 text-[#17c3b2] bg-[#17c3b2]/10'
                  }`}>
                    {betaInbox.application.status}
                  </span>
                )}
              </div>

              {betaInboxLoading ? (
                <p className="text-sm text-gray-500 font-mono">Loading beta inbox...</p>
              ) : betaInbox?.messages?.length ? (
                <div className="space-y-3">
                  {betaInbox.messages.map((message: any, index: number) => (
                    <div key={`${message.kind}-${index}`} className="border border-[#283347] bg-black/50 p-4 rounded-lg">
                      <p className="text-xs font-black uppercase tracking-widest text-[#17c3b2] mb-2">{message.title}</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{message.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 font-mono">No beta notices yet. When review moves, this inbox gets the update.</p>
              )}
            </div>
          </section>
        )}

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

                {/* Pillar 5: Region Restriction Bypass */}
                {isConnected && (
                <div className="bg-black/40 border border-[#283347] rounded-xl p-8 hover:border-amber-500/50 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black uppercase tracking-tighter text-amber-500 flex items-center gap-2">
                            <span className="w-2 h-4 bg-amber-500"></span>
                            GEO RESTRICTION WARNINGS
                        </h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={userData?.preferences?.complianceBypass || false}
                              onChange={async (e) => {
                                const checked = e.target.checked;
                                setUserData((prev: any) => ({
                                  ...prev,
                                  preferences: { ...prev?.preferences, complianceBypass: checked }
                                }));
                                try {
                                  await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/user/onboarding`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      ...(typeof window !== 'undefined' && localStorage.getItem('tc_token')
                                        ? { Authorization: `Bearer ${localStorage.getItem('tc_token')}` }
                                        : {}),
                                    },
                                    body: JSON.stringify({
                                      preferences: { complianceBypass: checked }
                                    })
                                  });
                                } catch (err) {
                                  console.error('[Settings] Region bypass update failed:', err);
                                }
                              }}
                            />
                            <div className="w-11 h-6 bg-[#111827] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                        </label>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-tight">
                        Using a VPN or accessing from a restricted region? Mute the geo warnings.
                        <br/>
                        <span className="text-amber-500 mt-2 block italic">Reminder: legal protections vary by jurisdiction — that is on you, not us.</span>
                    </p>
                </div>
                )}
            </div>
        </div>

        {/* Touch Grass — emergency 24hr lockout */}
        {isConnected && userData && (
          <div className="mt-8">
            <TouchGrassButton discordId={userData.discordId} />
          </div>
        )}

        {/* Pillar 3: LockVault — only shown after wallet linked via /linkwallet in Discord */}
        {userData && (
          <div className="mt-12">
            <LockVault discordId={userData?.discordId} />
          </div>
        )}
      </main>
    </div>
  );
}
