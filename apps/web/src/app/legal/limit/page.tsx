/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11 */
"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface RiskLimits {
  dailyDepositLimit: number | null;
  sessionTimeMinutes: number | null;
  lossThreshold: number | null;
  cooldownEnabled: boolean;
  setAt: string;
}

export default function LimitPage() {
  const [saved, setSaved] = useState<RiskLimits | null>(null);
  const [flash, setFlash] = useState(false);
  const [form, setForm] = useState({
    dailyDepositLimit: '',
    sessionTimeMinutes: '',
    lossThreshold: '',
    cooldownEnabled: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem('tiltcheck_risk_limits');
    if (stored) {
      const parsed: RiskLimits = JSON.parse(stored);
      setSaved(parsed);
      setForm({
        dailyDepositLimit: parsed.dailyDepositLimit?.toString() ?? '',
        sessionTimeMinutes: parsed.sessionTimeMinutes?.toString() ?? '',
        lossThreshold: parsed.lossThreshold?.toString() ?? '',
        cooldownEnabled: parsed.cooldownEnabled ?? false,
      });
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const limits: RiskLimits = {
      dailyDepositLimit: form.dailyDepositLimit ? Number(form.dailyDepositLimit) : null,
      sessionTimeMinutes: form.sessionTimeMinutes ? Number(form.sessionTimeMinutes) : null,
      lossThreshold: form.lossThreshold ? Number(form.lossThreshold) : null,
      cooldownEnabled: form.cooldownEnabled,
      setAt: new Date().toISOString(),
    };
    localStorage.setItem('tiltcheck_risk_limits', JSON.stringify(limits));
    setSaved(limits);
    setFlash(true);
    setTimeout(() => setFlash(false), 3000);
  };

  const handleClear = () => {
    localStorage.removeItem('tiltcheck_risk_limits');
    setSaved(null);
    setForm({ dailyDepositLimit: '', sessionTimeMinutes: '', lossThreshold: '', cooldownEnabled: false });
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 bg-black text-white">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        <header className="border-b border-[#283347] pb-6">
          <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-2">[RESPONSIBLE GAMING]</p>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-[#17c3b2]">
            Asset Risk Limits
          </h1>
          <p className="mt-2 font-mono text-sm text-gray-400 leading-relaxed">
            Hard limits on session length, deposit amounts, and loss thresholds.
            The vault locks your wins. This locks your future inputs. Both matter.
          </p>
        </header>

        {saved && (
          <div className="p-4 border border-[#17c3b2]/40 bg-[#17c3b2]/10 font-mono text-xs space-y-1">
            <p className="text-[#17c3b2] font-black uppercase tracking-widest mb-2">Active Limits</p>
            {saved.dailyDepositLimit && <p className="text-gray-300">Daily deposit cap: <span className="text-white font-bold">${saved.dailyDepositLimit}</span></p>}
            {saved.sessionTimeMinutes && <p className="text-gray-300">Session time limit: <span className="text-white font-bold">{saved.sessionTimeMinutes} min</span></p>}
            {saved.lossThreshold && <p className="text-gray-300">Loss alert threshold: <span className="text-white font-bold">-${saved.lossThreshold}</span></p>}
            {saved.cooldownEnabled && <p className="text-[#ef4444] font-bold">24-hour cooldown: ON</p>}
            <p className="text-gray-600 mt-2">Set: {new Date(saved.setAt).toLocaleString()}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 font-mono">
              Daily Deposit Cap ($)
            </label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 100"
              value={form.dailyDepositLimit}
              onChange={e => setForm(f => ({ ...f, dailyDepositLimit: e.target.value }))}
              className="bg-black border border-[#283347] px-4 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#17c3b2] transition-colors"
            />
            <p className="text-[10px] text-gray-600 font-mono">
              Hard stop when you hit this across all tracked sessions today.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 font-mono">
              Session Time Limit (minutes)
            </label>
            <input
              type="number"
              min="5"
              placeholder="e.g. 120"
              value={form.sessionTimeMinutes}
              onChange={e => setForm(f => ({ ...f, sessionTimeMinutes: e.target.value }))}
              className="bg-black border border-[#283347] px-4 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#17c3b2] transition-colors"
            />
            <p className="text-[10px] text-gray-600 font-mono">
              TiltCheck will prompt you to step away when you hit this.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 font-mono">
              Loss Alert Threshold ($)
            </label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 50"
              value={form.lossThreshold}
              onChange={e => setForm(f => ({ ...f, lossThreshold: e.target.value }))}
              className="bg-black border border-[#283347] px-4 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#17c3b2] transition-colors"
            />
            <p className="text-[10px] text-gray-600 font-mono">
              Alert fires when your session is down this amount. Not a block — a signal.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={form.cooldownEnabled}
              onChange={e => setForm(f => ({ ...f, cooldownEnabled: e.target.checked }))}
              className="mt-1 accent-[#17c3b2]"
            />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-300 group-hover:text-white transition-colors">
                Enable 24-Hour Cooldown on Tilt Trigger
              </p>
              <p className="text-[10px] text-gray-600 font-mono mt-1">
                When the bot or extension detects a tilt spiral, a 24-hour lockout activates automatically.
                You set it. It runs whether you want it to or not.
              </p>
            </div>
          </label>

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#17c3b2] text-black font-black text-xs uppercase tracking-widest hover:bg-[#48d5c6] transition-colors"
            >
              {flash ? 'SAVED.' : 'Save Limits'}
            </button>
            {saved && (
              <button
                type="button"
                onClick={handleClear}
                className="px-6 py-3 border border-[#ef4444]/40 text-[#ef4444] font-black text-xs uppercase tracking-widest hover:bg-[#ef4444]/10 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </form>

        <div className="p-4 border border-[#283347] bg-black/60 space-y-3 font-mono text-xs text-gray-500">
          <p className="text-gray-400 font-bold uppercase tracking-widest">How this works right now</p>
          <p>Limits are stored locally in your browser. The Chrome extension reads them during sessions and fires alerts when thresholds are crossed.</p>
          <p>These are not enforced by the casino. The casino does not care. This is a self-imposed constraint — the only kind that actually works.</p>
          <p>For immediate support: <a href="tel:1-800-426-2537" className="text-[#17c3b2] hover:underline">1-800-GAMBLER</a> or the <a href="/touch-grass" className="text-[#17c3b2] hover:underline">Touch Grass Protocol</a>.</p>
        </div>

        <Link href="/" className="text-xs font-mono text-gray-500 hover:text-[#17c3b2] uppercase tracking-[0.3em] transition-colors text-center">
          &lt; RETURN_TO_TERMINAL
        </Link>
      </div>

      <footer className="mt-16 py-8 text-center text-xs text-gray-600 uppercase tracking-[0.3em]">
        Made for Degens. By Degens.
      </footer>
    </div>
  );
}
