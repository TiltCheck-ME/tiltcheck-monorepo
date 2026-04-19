// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchAuthSession } from '@/lib/auth-session';
import { getDiscordLoginApiBase, getDiscordLoginUrl } from '@/lib/discord-login';

const API = getDiscordLoginApiBase();
const DISCORD_LOGIN_URL = getDiscordLoginUrl('/tools/buddy-system');

interface Buddy {
  id: string;
  user_id: string;
  buddy_id: string;
  status: 'pending' | 'accepted';
  alert_thresholds: {
    tilt_score_exceeds: number;
    losses_in_24h_sol: number;
    zero_balance_reached: boolean;
  };
  created_at: string;
}

interface BuddyRequest {
  id: string;
  user_id: string;
  buddy_id: string;
  status: 'pending';
  created_at: string;
}

type AuthUser = { discordId: string; username: string } | null;

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`/api${path}`, { credentials: 'include', ...opts });
  const json = await r.json();
  if (!r.ok) throw new Error(json.message || 'Request failed');
  return json;
}

export default function BuddySystemPage() {
  const [auth, setAuth] = useState<AuthUser>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [pending, setPending] = useState<BuddyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addBuddyId, setAddBuddyId] = useState('');
  const [tiltThreshold, setTiltThreshold] = useState(80);
  const [lossThreshold, setLossThreshold] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  useEffect(() => {
    fetchAuthSession({ apiBase: API })
      .then((d) => {
        if (d?.discordId) setAuth({ discordId: d.discordId, username: d.username });
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  const loadBuddies = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/user/${auth.discordId}/buddies`);
      setBuddies(data.buddies || []);
      setPending(data.pending || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load buddies');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (auth) loadBuddies();
  }, [auth, loadBuddies]);

  async function sendRequest() {
    if (!auth || !addBuddyId.trim()) return;
    setSubmitting(true);
    setSubmitMsg('');
    try {
      await apiFetch(`/user/${auth.discordId}/buddies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buddyId: addBuddyId.trim(),
          thresholds: {
            tilt_score_exceeds: tiltThreshold,
            losses_in_24h_sol: lossThreshold,
            zero_balance_reached: true,
          },
        }),
      });
      setSubmitMsg('Request sent. They need to accept before alerts go live.');
      setAddBuddyId('');
      await loadBuddies();
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  }

  async function acceptRequest(requestId: string) {
    if (!auth) return;
    try {
      await apiFetch(`/user/${auth.discordId}/buddies/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      await loadBuddies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept');
    }
  }

  async function removeBuddy(buddyId: string) {
    if (!auth) return;
    try {
      await apiFetch(`/user/${auth.discordId}/buddies/${buddyId}`, { method: 'DELETE' });
      await loadBuddies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    }
  }

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center">
        <p className="font-mono text-gray-500 text-sm">Checking session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      {/* Hero */}
      <section className="border-b border-[#283347] py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">
            ACCOUNTABILITY SYSTEM
          </p>
          <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tight mb-6">
            BUDDY SYSTEM
          </h1>
          <p className="text-gray-400 font-mono text-base max-w-2xl leading-relaxed">
            Phone a Friend — before the session spirals. Add a trusted degen as your accountability partner. They get alerted when your tilt score spikes, your losses stack, or your balance hits zero. You set the thresholds. No override, no exceptions.
          </p>
        </div>
      </section>

      {!auth ? (
        /* Sign-in required */
        <section className="py-24 px-4">
          <div className="max-w-xl mx-auto text-center">
            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">
              DISCORD AUTH REQUIRED
            </p>
            <h2 className="text-2xl font-black uppercase mb-4">Sign in to manage your buddies</h2>
            <p className="text-gray-400 font-mono text-sm mb-8">
              Buddy System uses your Discord account to link partners and route alerts. No wallet connection required.
            </p>
            <a
              href={DISCORD_LOGIN_URL}
              className="inline-block border border-[#17c3b2] text-[#17c3b2] font-black uppercase tracking-widest text-sm px-8 py-3 hover:bg-[#17c3b2] hover:text-black transition-colors"
            >
              Connect Discord
            </a>
          </div>
        </section>
      ) : (
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            {error && (
              <div className="border border-red-500/30 bg-red-950/20 px-4 py-3 text-red-400 font-mono text-sm">
                {error}
              </div>
            )}

            {/* Pending requests */}
            {pending.length > 0 && (
              <div>
                <h2 className="text-xs font-mono text-[#ffd700] uppercase tracking-widest mb-6">
                  PENDING REQUESTS — {pending.length}
                </h2>
                <div className="space-y-3">
                  {pending.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-4 border border-[#ffd700]/20 bg-[#ffd700]/5 px-6 py-4"
                    >
                      <div>
                        <p className="text-white font-mono text-sm font-bold">{req.user_id}</p>
                        <p className="text-gray-500 text-xs font-mono">
                          wants to watch your session
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => acceptRequest(req.id)}
                          className="text-xs font-black uppercase tracking-widest px-4 py-2 border border-[#17c3b2] text-[#17c3b2] hover:bg-[#17c3b2] hover:text-black transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => removeBuddy(req.user_id)}
                          className="text-xs font-black uppercase tracking-widest px-4 py-2 border border-gray-700 text-gray-500 hover:border-red-500 hover:text-red-400 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current buddies */}
            <div>
              <h2 className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-6">
                YOUR BUDDIES — {loading ? '...' : buddies.length}
              </h2>
              {loading ? (
                <p className="text-gray-500 font-mono text-sm">Loading...</p>
              ) : buddies.length === 0 ? (
                <div className="border border-[#283347] px-6 py-8 text-center">
                  <p className="text-gray-500 font-mono text-sm">
                    No accountability partners yet. Add one below.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {buddies.map((b) => (
                    <div
                      key={b.id}
                      className="border border-[#283347] bg-[#111827]/40 px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
                    >
                      <div>
                        <p className="text-white font-mono text-sm font-bold">{b.buddy_id}</p>
                        <p className="text-gray-500 text-xs font-mono mt-1">
                          Alerts if: tilt &gt; {b.alert_thresholds.tilt_score_exceeds} | losses &gt;{' '}
                          {b.alert_thresholds.losses_in_24h_sol} SOL in 24h | zero balance
                        </p>
                      </div>
                      <button
                        onClick={() => removeBuddy(b.buddy_id)}
                        className="self-start sm:self-auto text-xs font-black uppercase tracking-widest px-4 py-2 border border-gray-700 text-gray-500 hover:border-red-500 hover:text-red-400 transition-colors whitespace-nowrap"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add buddy */}
            <div className="border border-[#283347] bg-[#111827]/40 p-8">
              <h2 className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-6">
                ADD A BUDDY
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-widest mb-2">
                    Their Discord ID
                  </label>
                  <input
                    type="text"
                    value={addBuddyId}
                    onChange={(e) => setAddBuddyId(e.target.value)}
                    placeholder="e.g. 123456789012345678"
                    className="w-full bg-[#0a0c10] border border-[#283347] px-4 py-3 text-white font-mono text-sm focus:border-[#17c3b2] outline-none placeholder-gray-600"
                  />
                  <p className="text-xs font-mono text-gray-600 mt-1">
                    Right-click their profile in Discord → Copy User ID (Dev Mode required)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 uppercase tracking-widest mb-2">
                      Tilt Score Alert Threshold
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={50}
                        max={100}
                        step={5}
                        value={tiltThreshold}
                        onChange={(e) => setTiltThreshold(Number(e.target.value))}
                        className="flex-1 accent-[#17c3b2]"
                      />
                      <span className="text-[#17c3b2] font-mono font-bold text-sm w-8 text-right">
                        {tiltThreshold}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 uppercase tracking-widest mb-2">
                      Loss Alert Threshold (SOL / 24h)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0.5}
                        max={20}
                        step={0.5}
                        value={lossThreshold}
                        onChange={(e) => setLossThreshold(Number(e.target.value))}
                        className="flex-1 accent-[#17c3b2]"
                      />
                      <span className="text-[#17c3b2] font-mono font-bold text-sm w-12 text-right">
                        {lossThreshold}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={sendRequest}
                  disabled={submitting || !addBuddyId.trim()}
                  className="border border-[#17c3b2] text-[#17c3b2] font-black uppercase tracking-widest text-sm px-8 py-3 hover:bg-[#17c3b2] hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Sending...' : 'Send Buddy Request'}
                </button>

                {submitMsg && (
                  <p
                    className={`text-sm font-mono ${submitMsg.startsWith('Request sent') ? 'text-[#17c3b2]' : 'text-red-400'}`}
                  >
                    {submitMsg}
                  </p>
                )}
              </div>
            </div>

            {/* How it works */}
            <div className="border border-[#283347] p-8 space-y-4">
              <h2 className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-4">
                HOW ALERTS WORK
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    step: '01',
                    title: 'You Set Triggers',
                    body: 'Tilt score, 24h loss cap, zero-balance. All thresholds are yours to configure.',
                  },
                  {
                    step: '02',
                    title: 'Engine Watches',
                    body: 'The TiltCheck backend monitors your session data in real-time via the extension.',
                  },
                  {
                    step: '03',
                    title: 'Buddy Gets Pinged',
                    body: 'Your buddy receives a Discord DM when a threshold fires. They do the rest.',
                  },
                ].map((s) => (
                  <div key={s.step}>
                    <p className="text-[#17c3b2] font-mono text-xs uppercase tracking-widest mb-2">
                      STEP {s.step}
                    </p>
                    <p className="text-white font-black uppercase text-sm mb-1">{s.title}</p>
                    <p className="text-gray-500 font-mono text-xs leading-relaxed">{s.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Back nav */}
      <section className="border-t border-[#283347] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/tools" className="text-xs font-mono text-gray-500 hover:text-[#17c3b2] transition-colors uppercase tracking-widest">
            &larr; All Tools
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#283347] py-6 px-4 text-center">
        <p className="text-xs text-gray-600 font-mono">Made for Degens. By Degens.</p>
      </footer>
    </main>
  );
}
