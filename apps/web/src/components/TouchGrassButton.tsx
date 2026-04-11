// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11
'use client';

/**
 * TouchGrassButton
 * Emergency 24-hour session lockout. Break-glass. No override.
 */

import React from 'react';

interface Props {
  discordId: string;
}

interface LockoutState {
  locked: boolean;
  lockedUntil?: string;
  remainingMs?: number;
}

export default function TouchGrassButton({ discordId }: Props) {
  const [state, setState] = React.useState<LockoutState>({ locked: false });
  const [loading, setLoading] = React.useState(false);
  const [checking, setChecking] = React.useState(true);

  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  React.useEffect(() => {
    if (!discordId) return;
    fetch(`${api}/safety/touchgrass/${discordId}`)
      .then((r) => r.json())
      .then((data: LockoutState) => setState(data))
      .catch(() => null)
      .finally(() => setChecking(false));
  }, [discordId, api]);

  async function handleActivate() {
    if (!confirm('This will lock your TiltCheck session for 24 hours. No override. Are you sure?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${api}/safety/touchgrass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId }),
      });
      const data = await res.json() as LockoutState & { lockedUntil?: string };
      setState({ locked: true, lockedUntil: data.lockedUntil });
    } catch {
      alert('Could not connect to TiltCheck API. Try again or use /touchgrass in Discord.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) return null;

  if (state.locked && state.lockedUntil) {
    const until = new Date(state.lockedUntil);
    return (
      <div className="border border-red-900/50 bg-red-950/20 rounded-xl p-6 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-black uppercase tracking-tighter text-red-400">Touch Grass Mode Active</p>
          <p className="text-xs text-gray-400 mt-1">
            Session locked until <strong className="text-white">{until.toLocaleString()}</strong>.
            The math will still be here when you get back.
          </p>
        </div>
        <a
          href="/touch-grass"
          className="shrink-0 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded transition-colors"
        >
          Resources
        </a>
      </div>
    );
  }

  return (
    <div className="border border-[#283347] hover:border-red-900/50 rounded-xl p-6 flex flex-col md:flex-row md:items-center gap-4 transition-colors group">
      <div className="flex-1">
        <p className="text-sm font-black uppercase tracking-tighter text-gray-400 group-hover:text-red-400 transition-colors">
          Touch Grass — Emergency Lockout
        </p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          If your brain is running the 3am recovery script — hit this. 24-hour hard stop. No override.
          The casino will still be there. Your bankroll might not.
        </p>
      </div>
      <button
        onClick={handleActivate}
        disabled={loading}
        className="shrink-0 px-6 py-3 bg-red-900/30 hover:bg-red-800/50 text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-700 font-black text-[10px] uppercase tracking-widest rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Activate 24-hour session lockout"
      >
        {loading ? 'Activating...' : 'Touch Grass'}
      </button>
    </div>
  );
}
