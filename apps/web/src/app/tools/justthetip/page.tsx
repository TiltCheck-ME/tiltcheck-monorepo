/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-13 */
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import LegalModal from '@/components/LegalModal';
import { LEGAL_DISCLAIMERS } from '@tiltcheck/shared/legal';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';
const WEB_CHANNEL = 'web-tips';

interface HistoryEntry {
  id: string;
  fromUsername: string;
  toUsername: string;
  amountSol: number;
  message: string;
  timestamp: number;
  claimed: boolean;
}

interface TipResult {
  success: boolean;
  type?: string;
  rainId?: string;
  amountSol?: number;
  expiresAt?: number;
  tip?: { amountSol: number };
  error?: string;
}

export default function JustTheTipPage() {
  const [accepted, setAccepted] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [discordId, setDiscordId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);

  // Form state
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [feeAcknowledged, setFeeAcknowledged] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TipResult | null>(null);

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const consent = localStorage.getItem('tiltcheck_legal_consent');
    if (!consent) setShowLegal(true);
    else setAccepted(true);
  }, []);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setDiscordId(data.discordId || data.userId || null);
          setUsername(data.username || data.discordUsername || '');
        }
      } catch { /* no session */ } finally {
        setAuthLoading(false);
      }
    }
    checkSession();
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tip/history?channelId=${WEB_CHANNEL}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.tips || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSend = async () => {
    if (!to || !amount || !feeAcknowledged) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/tip/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: discordId,
          toUsername: to.trim(),
          amountSol: parseFloat(amount),
          message: message.trim(),
          channelId: WEB_CHANNEL,
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        setTo('');
        setAmount('');
        setMessage('');
        await fetchHistory();
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Request failed.' });
    } finally {
      setSending(false);
    }
  };

  const handleAccept = () => {
    localStorage.setItem('tiltcheck_legal_consent', 'true');
    setShowLegal(false);
    setAccepted(true);
  };

  const isRoomRain = to.trim().toUpperCase() === 'ROOM';
  const canSend = !!to && !!amount && parseFloat(amount) > 0 && feeAcknowledged && !sending;

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-[#0a0c10] text-white">
        <LegalModal isOpen={showLegal} onAccept={handleAccept} title="TIPPING PROTOCOL COMPLIANCE" />

        <div className="max-w-4xl mx-auto px-4 py-12 pt-32">
          {/* Header */}
          <div className="mb-10">
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">
              <Link href="/tools" className="hover:text-[#17c3b2] transition-colors">Tools</Link>
              {' / '}
              <span className="text-gray-400">JustTheTip</span>
            </p>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">
              JustTheTip
            </h1>
            <p className="text-gray-400 text-sm max-w-xl">
              Send SOL to your fellow degens. Direct tips or broadcast a room rain.
              Flat fee. Non-custodial. Don&apos;t blame us if you typo the wallet.
            </p>
          </div>

          {accepted ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Tip Form */}
              <div className="bg-[#111827] border border-[#1e2d42] rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-tight text-white">Send a Tip</h2>
                  {authLoading ? (
                    <span className="text-[10px] text-gray-600 font-mono animate-pulse">checking session...</span>
                  ) : discordId ? (
                    <span className="text-[10px] text-[#17c3b2] font-mono">as {username || discordId}</span>
                  ) : (
                    <a
                      href={`${API}/auth/discord`}
                      className="text-[10px] text-yellow-400 font-mono hover:text-yellow-300 underline"
                    >
                      sign in for verified tips
                    </a>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                    Recipient (Discord ID, username, or &quot;ROOM&quot;)
                  </label>
                  <input
                    type="text"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    placeholder='e.g. 1234567890 or "ROOM"'
                    className="w-full bg-black/50 border border-[#283347] rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-[#17c3b2] focus:outline-none"
                  />
                  {isRoomRain && (
                    <p className="text-[10px] text-yellow-400 font-mono">
                      Room rain — splits evenly among all claimants
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Amount (SOL)</label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.05"
                    className="w-full bg-black/50 border border-[#283347] rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-[#17c3b2] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Message (optional)</label>
                  <input
                    type="text"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="gg ez, no ref"
                    maxLength={120}
                    className="w-full bg-black/50 border border-[#283347] rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-[#17c3b2] focus:outline-none"
                  />
                </div>

                <div className="p-3 bg-[#ff3366]/10 border border-[#ff3366]/30 rounded-lg">
                  <p className="text-[10px] text-[#ff3366] font-mono">{LEGAL_DISCLAIMERS.FEE_DISCLOSURE}</p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feeAcknowledged}
                    onChange={e => setFeeAcknowledged(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-[#17c3b2] shrink-0"
                  />
                  <span className="text-xs text-gray-400">
                    I understand the flat fee and that misdirected tips cannot be reversed.
                  </span>
                </label>

                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${
                    canSend
                      ? 'bg-[#17c3b2] hover:bg-[#14b0a0] text-black'
                      : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/10'
                  }`}
                >
                  {sending ? 'SENDING...' : isRoomRain ? 'DROP THE RAIN' : 'SEND THE TIP'}
                </button>

                {result && (
                  <div className={`p-3 rounded-lg text-xs font-mono border ${
                    result.success
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}>
                    {result.success
                      ? result.type === 'room_rain'
                        ? `Room rain dropped — ${result.amountSol?.toFixed(4)} SOL. Rain ID: ${result.rainId?.slice(0, 8)}...`
                        : `Tip sent — ${result.amountSol?.toFixed(4) ?? result.tip?.amountSol?.toFixed(4)} SOL delivered.`
                      : `Failed: ${result.error}`
                    }
                  </div>
                )}

                <p className="text-[10px] text-gray-600 font-mono text-center">
                  Or use <code className="bg-white/5 px-1 rounded">/juicedrop</code> in Discord for instant drops.
                </p>
              </div>

              {/* History */}
              <div className="bg-[#111827] border border-[#1e2d42] rounded-xl p-6">
                <h2 className="text-sm font-black uppercase tracking-tight text-white mb-5">Recent Web Tips</h2>
                {history.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 text-xs font-mono">No tips yet. Be first.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.slice(0, 10).map(entry => (
                      <div key={entry.id} className="flex items-start justify-between py-2 border-b border-white/5 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-white font-mono truncate">
                            <span className="text-[#17c3b2]">{entry.fromUsername}</span>
                            {' → '}
                            <span className={entry.toUsername === 'ROOM' ? 'text-yellow-400' : 'text-white'}>
                              {entry.toUsername}
                            </span>
                          </p>
                          {entry.message && (
                            <p className="text-[10px] text-gray-500 truncate mt-0.5">&ldquo;{entry.message}&rdquo;</p>
                          )}
                        </div>
                        <div className="text-right ml-4 shrink-0">
                          <p className="text-xs font-mono font-bold text-white">{entry.amountSol.toFixed(4)}</p>
                          <p className="text-[10px] text-gray-600">SOL</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#111827] border border-[#1e2d42] rounded-xl p-8 text-center">
              <p className="text-gray-400 text-sm mb-4">Accept the compliance terms to access JustTheTip.</p>
              <button
                onClick={() => setShowLegal(true)}
                className="bg-[#17c3b2] hover:bg-[#14b0a0] text-black font-bold px-6 py-3 rounded-xl text-sm"
              >
                View Terms
              </button>
            </div>
          )}

          {/* Non-custodial note */}
          {accepted && (
            <p className="mt-8 text-[10px] text-gray-600 font-mono text-center uppercase tracking-widest">
              Non-Custodial Protocol &bull; Your keys. Your problem.
            </p>
          )}

          {/* Cross-links */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/tools/auto-vault', label: 'LockVault' },
              { href: '/tools/session-stats', label: 'Session Stats' },
              { href: '/tools/collectclock', label: 'CollectClock' },
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
