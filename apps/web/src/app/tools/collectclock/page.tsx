// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-13
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import BonusFormulaLab from '@/components/BonusFormulaLab';

interface BonusTimer {
  id: string;
  casino: string;
  category: string;
  cooldownHours: number;
  lastClaimed: string;
}

const CASINO_COOLDOWNS: { casino: string; bonuses: { name: string; cooldownHours: number }[] }[] = [
  {
    casino: 'Stake',
    bonuses: [
      { name: 'Daily Rakeback', cooldownHours: 24 },
      { name: 'Weekly Boost', cooldownHours: 168 },
      { name: 'Monthly Reload', cooldownHours: 720 },
    ],
  },
  {
    casino: 'Roobet',
    bonuses: [
      { name: 'Daily Bonus', cooldownHours: 24 },
      { name: 'Weekly Cashback', cooldownHours: 168 },
    ],
  },
  {
    casino: 'Rollbit',
    bonuses: [
      { name: 'Daily Spin', cooldownHours: 24 },
      { name: 'Cashback', cooldownHours: 168 },
    ],
  },
  {
    casino: 'BC.Game',
    bonuses: [
      { name: 'Lucky Spin', cooldownHours: 24 },
      { name: 'Deposit Bonus', cooldownHours: 72 },
    ],
  },
  {
    casino: 'Shuffle',
    bonuses: [
      { name: 'Daily Reload', cooldownHours: 24 },
      { name: 'VIP Cashback', cooldownHours: 168 },
    ],
  },
];

function msToCountdown(ms: number): string {
  if (ms <= 0) return 'READY';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `${d}d ${rh}h`;
  }
  return `${h}h ${m}m`;
}

function getStatus(lastClaimed: string, cooldownHours: number): { ms: number; label: string; color: string } {
  if (!lastClaimed) return { ms: 0, label: 'READY', color: '#17c3b2' };
  const claimedAt = new Date(lastClaimed).getTime();
  const cooldownMs = cooldownHours * 3600000;
  const nextAt = claimedAt + cooldownMs;
  const remaining = nextAt - Date.now();
  if (remaining <= 0) return { ms: 0, label: 'READY', color: '#17c3b2' };
  const pct = remaining / cooldownMs;
  const color = pct > 0.5 ? '#ef4444' : pct > 0.2 ? '#ffd700' : '#17c3b2';
  return { ms: remaining, label: msToCountdown(remaining), color };
}

let _idCounter = 0;
function uid() { return `timer-${++_idCounter}`; }

export default function CollectClockPage() {
  const [timers, setTimers] = useState<BonusTimer[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('cc_timers') || '[]'); } catch { return []; }
  });
  const [form, setForm] = useState({ casino: '', category: '', cooldownHours: '', lastClaimed: '' });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('cc_timers', JSON.stringify(timers)); } catch { /* ignore */ }
  }, [timers]);

  const addTimer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.casino || !form.category || !form.cooldownHours) return;
    setTimers((prev) => [
      ...prev,
      {
        id: uid(),
        casino: form.casino,
        category: form.category,
        cooldownHours: parseFloat(form.cooldownHours),
        lastClaimed: form.lastClaimed || new Date().toISOString(),
      },
    ]);
    setForm({ casino: '', category: '', cooldownHours: '', lastClaimed: '' });
  };

  const markClaimed = (id: string) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, lastClaimed: new Date().toISOString() } : t))
    );
  };

  const removeTimer = (id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const fillPreset = (casino: string, bonus: { name: string; cooldownHours: number }) => {
    setForm((f) => ({ ...f, casino, category: bonus.name, cooldownHours: String(bonus.cooldownHours) }));
  };

  void now;

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">

      {/* Hero */}
      <section className="border-b border-[#283347] py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">BONUS TIMING</p>
          <h1 className="neon neon-main text-5xl md:text-7xl mb-6" data-text="COLLECTCLOCK">
            COLLECTCLOCK
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono leading-relaxed">
            Track bonus cooldowns by casino and category, then reverse-engineer the reload formula with your own wager and payout history. Know when the bonus resets and whether the amount got shaved.
          </p>
        </div>
      </section>

      <BonusFormulaLab />

      {/* Your Timers */}
      <section className="py-16 px-4 border-b border-[#283347]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-8">Your Timers</h2>

          {timers.length === 0 && (
            <p className="text-gray-600 font-mono text-sm">
              No timers set. Add one below or use a preset.
            </p>
          )}

          <div className="space-y-3">
            {timers.map((t) => {
              const status = getStatus(t.lastClaimed, t.cooldownHours);
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-4 p-5 border border-[#283347] bg-[#111827]/40"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-black uppercase text-sm tracking-tight">{t.casino}</p>
                    <p className="text-xs font-mono text-gray-500 uppercase">{t.category}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className="font-black font-mono text-lg"
                      style={{ color: status.color }}
                    >
                      {status.label}
                    </p>
                    <p className="text-[10px] font-mono text-gray-600 uppercase">
                      {t.cooldownHours}h cooldown
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {status.ms === 0 && (
                      <button
                        onClick={() => markClaimed(t.id)}
                        className="text-[11px] font-black font-mono uppercase px-3 py-1.5 border border-[#17c3b2]/50 text-[#17c3b2] hover:bg-[#17c3b2] hover:text-black transition-colors"
                      >
                        Claimed
                      </button>
                    )}
                    <button
                      onClick={() => removeTimer(t.id)}
                      className="text-[11px] font-black font-mono uppercase px-3 py-1.5 border border-gray-700 text-gray-600 hover:border-[#ef4444]/50 hover:text-[#ef4444] transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Add Timer */}
      <section className="py-16 px-4 border-b border-[#283347]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-8">Add Timer</h2>
          <form onSubmit={addTimer} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Casino name"
              value={form.casino}
              onChange={(e) => setForm((f) => ({ ...f, casino: e.target.value }))}
              className="bg-[#111827] border border-[#283347] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#17c3b2]"
              required
            />
            <input
              type="text"
              placeholder="Bonus name (e.g. Daily Reload)"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="bg-[#111827] border border-[#283347] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#17c3b2]"
              required
            />
            <input
              type="number"
              placeholder="Cooldown in hours (e.g. 24)"
              value={form.cooldownHours}
              onChange={(e) => setForm((f) => ({ ...f, cooldownHours: e.target.value }))}
              className="bg-[#111827] border border-[#283347] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#17c3b2]"
              min="0.5"
              step="0.5"
              required
            />
            <input
              type="datetime-local"
              value={form.lastClaimed ? form.lastClaimed.slice(0, 16) : ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, lastClaimed: e.target.value ? new Date(e.target.value).toISOString() : '' }))
              }
              className="bg-[#111827] border border-[#283347] text-white font-mono text-sm px-4 py-3 focus:outline-none focus:border-[#17c3b2]"
            />
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full border border-[#17c3b2] text-[#17c3b2] font-black uppercase tracking-widest text-sm px-6 py-3 hover:bg-[#17c3b2] hover:text-black transition-colors"
              >
                Add Timer
              </button>
            </div>
          </form>
          <p className="text-[11px] font-mono text-gray-600">Leave last-claimed blank to start the clock from now.</p>
        </div>
      </section>

      {/* Presets */}
      <section className="py-16 px-4 border-b border-[#283347]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-8">Known Cooldowns</h2>
          <div className="space-y-6">
            {CASINO_COOLDOWNS.map((c) => (
              <div key={c.casino}>
                <p className="text-sm font-black uppercase tracking-tight mb-3">{c.casino}</p>
                <div className="flex flex-wrap gap-2">
                  {c.bonuses.map((b) => (
                    <button
                      key={b.name}
                      onClick={() => fillPreset(c.casino, b)}
                      className="text-[11px] font-mono uppercase px-3 py-1.5 border border-[#283347] text-gray-400 hover:border-[#17c3b2]/50 hover:text-[#17c3b2] transition-colors"
                    >
                      {b.name} — {b.cooldownHours}h
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] font-mono text-gray-600 mt-6">
            Cooldowns are typical values — verify in-app as casinos adjust without notice.
            Track changes via the{' '}
            <Link href="/tools/scan-scams" className="text-[#17c3b2] underline hover:no-underline">
              Shadow-Ban Tracker
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Cross-link to bonuses scanner */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/bonuses"
            className="block p-8 border border-[#283347] hover:border-[#17c3b2]/40 hover:bg-[#17c3b2]/5 transition-colors"
          >
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">RELATED TOOL</p>
            <p className="font-black uppercase text-lg mb-2">Bonus Scanner</p>
            <p className="text-sm font-mono text-gray-400">
              Cross-platform RTP comparison and bonus value scanner. Check if the reload you just collected is worth wagering through.
            </p>
          </Link>
          <Link
            href="/tools/house-edge-scanner"
            className="block p-8 border border-[#283347] hover:border-[#17c3b2]/40 hover:bg-[#17c3b2]/5 transition-colors"
          >
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">RELATED TOOL</p>
            <p className="font-black uppercase text-lg mb-2">Delta Engine</p>
            <p className="text-sm font-mono text-gray-400">
              Run the math on whether that bonus playthrough is profitable at the table's configured RTP. Certified vs observed.
            </p>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#283347] py-6 px-4 text-center">
        <p className="text-xs text-gray-600 font-mono">Made for Degens. By Degens.</p>
      </footer>
    </main>
  );
}

