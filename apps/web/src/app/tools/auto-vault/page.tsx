/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-14 */
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import LockVault from '@/components/LockVault';
import LegalModal from '@/components/LegalModal';
import { fetchAuthSession } from '@/lib/auth-session';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const DISCORD_LOGIN_URL = `${API}/auth/discord/login?source=web&redirect=${encodeURIComponent('/tools/auto-vault')}`;

/**
 * AutoVaultPage
 * Full LockVault tool page wired to vault API.
 * Requires Discord session auth for lock/release; shows sign-in state otherwise.
 */
export default function AutoVaultPage() {
  const [accepted, setAccepted] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [discordId, setDiscordId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const consent = localStorage.getItem('tiltcheck_legal_consent');
    if (!consent) setShowLegal(true);
    else setAccepted(true);
  }, []);

  useEffect(() => {
    async function checkSession() {
      try {
        const data = await fetchAuthSession({ apiBase: API });
        setDiscordId(data?.discordId || data?.userId || null);
      } catch {
        // no active session
      } finally {
        setAuthLoading(false);
      }
    }
    checkSession();
  }, []);

  const handleAccept = () => {
    localStorage.setItem('tiltcheck_legal_consent', 'true');
    setShowLegal(false);
    setAccepted(true);
  };

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-[#0a0c10] text-white">
        <LegalModal isOpen={showLegal} onAccept={handleAccept} title="VAULT DEPLOYMENT COMPLIANCE" />

        <div className="max-w-4xl mx-auto px-4 py-12 pt-32">
          {/* Header */}
          <div className="mb-10">
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">
              <Link href="/tools" className="hover:text-[#17c3b2] transition-colors">Tools</Link>
              {' / '}
              <span className="text-gray-400">LockVault</span>
            </p>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">
              LockVault
            </h1>
            <p className="text-gray-400 text-sm max-w-xl">
              Non-custodial profit protection. Lock your wins behind a timer and block
              impulse redemptions before you blow your stack.
            </p>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {[
              { step: '01', label: 'SET THRESHOLD', desc: 'Choose a profit target. When you hit it, vault activates.' },
              { step: '02', label: 'LOCK WINS', desc: 'Lock a SOL amount behind a time-based cooldown (1h–72h).' },
              { step: '03', label: 'SECURE THE REDEEM', desc: 'Timer expires. Release the lock. Stack stays intact.' },
            ].map(({ step, label, desc }) => (
              <div key={step} className="bg-[#111827] border border-[#1e2d42] rounded-xl p-5">
                <p className="text-[#17c3b2] text-xs font-mono font-bold mb-2">{step}</p>
                <p className="text-white text-sm font-black uppercase tracking-tight mb-2">{label}</p>
                <p className="text-gray-400 text-xs">{desc}</p>
              </div>
            ))}
          </div>

          {/* Vault interface */}
          {accepted && (
            <>
              {authLoading ? (
                <div className="animate-pulse bg-white/5 h-64 rounded-xl" />
              ) : discordId ? (
                <LockVault discordId={discordId} />
              ) : (
                <div className="bg-[#111827] border border-[#1e2d42] rounded-xl p-10 text-center">
                  <p className="text-gray-400 text-sm mb-6">
                    LockVault requires a Discord session. Connect via the TiltCheck bot first.
                  </p>
                  <a
                    href={DISCORD_LOGIN_URL}
                    className="inline-block bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
                  >
                    Sign in with Discord
                  </a>
                  <p className="text-[10px] text-gray-600 mt-4 font-mono">
                    Or use{' '}
                    <code className="bg-white/5 px-1 rounded">/lockvault</code> in the TiltCheck Discord bot.
                  </p>
                </div>
              )}
            </>
          )}

          {!accepted && (
            <div className="bg-[#111827] border border-[#1e2d42] rounded-xl p-8 text-center">
              <p className="text-gray-400 text-sm mb-4">Accept the compliance terms to access LockVault.</p>
              <button
                onClick={() => setShowLegal(true)}
                className="bg-[#17c3b2] hover:bg-[#14b0a0] text-black font-bold px-6 py-3 rounded-xl text-sm transition-colors"
              >
                View Terms
              </button>
            </div>
          )}

          {/* Cross-links */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/tools/collectclock', label: 'CollectClock' },
              { href: '/tools/house-edge-scanner', label: 'Delta Engine' },
              { href: '/tools/domain-verifier', label: 'SusLink Scanner' },
              { href: '/tools', label: 'All Tools' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-xs text-gray-400 hover:text-white font-mono text-center transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
