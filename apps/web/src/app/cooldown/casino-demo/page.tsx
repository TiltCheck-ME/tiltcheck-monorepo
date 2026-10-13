/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12 */
'use client';

/**
 * Demo Casino
 * Mock game grid. Calls GET /cooldown/check before each bet.
 * Locked games show "Benched until <date>" — no bet button.
 * Unlocked games show a mock bet UI.
 * This is a hackathon demo — no real money, no real RNG.
 */

import React, { useCallback, useEffect, useState } from 'react';
import BrandTagline from '@/components/BrandTagline';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GameEntry {
  label: string;
  key: string; // "provider:slug" format
  category: string;
  emoji: string; // screen-reader hidden, decorative only
}

interface CheckResult {
  locked: boolean;
  scope: string | null;
  endTime: number | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GAMES: GameEntry[] = [
  { label: 'Plinko', key: 'pragmatic:plinko', category: 'plinko', emoji: '●' },
  { label: 'Dice', key: 'relax:dice', category: 'live-dealer', emoji: '■' },
  { label: 'Blackjack', key: 'evo:blackjack', category: 'live-dealer', emoji: '♦' },
  { label: 'Crash', key: 'spribe:crash', category: 'crash', emoji: '▲' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

async function checkLocked(wallet: string, game: string, category: string): Promise<CheckResult> {
  const params = new URLSearchParams({ wallet, game, category });
  const res = await fetch(`${API_BASE}/cooldown/check?${params}`);
  if (!res.ok) return { locked: false, scope: null, endTime: null };
  return res.json() as Promise<CheckResult>;
}

// ── Game Card ─────────────────────────────────────────────────────────────────

function GameCard({ game, wallet }: { game: GameEntry; wallet: string }) {
  const [status, setStatus] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [betResult, setBetResult] = useState<string | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const r = await checkLocked(wallet, game.key, game.category);
      setStatus(r);
    } finally {
      setChecking(false);
    }
  }, [wallet, game]);

  useEffect(() => { void check(); }, [check]);

  const handleBet = async () => {
    setBetResult(null);
    await check();
    setStatus((s) => {
      if (s?.locked) return s; // abort
      const outcomes = ['Win +2.4x', 'Bust', 'Win +1.1x', 'Bust', 'Push'];
      setBetResult(outcomes[Math.floor(Math.random() * outcomes.length)] ?? 'Bust');
      return s;
    });
  };

  const benched = status?.locked;

  return (
    <div style={{
      background: '#0f172a',
      border: `1px solid ${benched ? '#7f1d1d' : '#1e293b'}`,
      borderRadius: 12,
      padding: '1.25rem',
      position: 'relative',
      opacity: benched ? 0.7 : 1,
    }}>
      {/* Game header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <span aria-hidden="true" style={{ fontSize: '1.5rem', marginRight: '0.5rem', color: '#475569' }}>{game.emoji}</span>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#e2e8f0' }}>{game.label}</span>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{game.category}</span>
      </div>

      {/* Benched overlay */}
      {benched ? (
        <div style={{ background: '#7f1d1d', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
          <p style={{ fontWeight: 700, color: '#fca5a5', margin: 0 }}>Benched</p>
          {status.endTime && (
            <p style={{ color: '#f87171', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
              until {fmtDate(status.endTime)}
            </p>
          )}
          {status.scope && (
            <p style={{ color: '#7f1d1d', fontSize: '0.7rem', margin: '0.2rem 0 0' }}>
              Lock scope: {status.scope}
            </p>
          )}
          <a
            href="/cooldown"
            style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.75rem', color: '#fca5a5', textDecoration: 'underline' }}
          >
            Manage lock
          </a>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.75rem' }}>
            House edge: ~1.5%  |  RTP: 98.5%
          </div>
          <button
            onClick={handleBet}
            disabled={checking}
            style={{
              width: '100%',
              padding: '0.6rem',
              background: '#166534',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            {checking ? 'Checking...' : 'Bet 0.01 USDC'}
          </button>
          {betResult && (
            <p style={{
              marginTop: '0.5rem',
              textAlign: 'center',
              fontWeight: 700,
              color: betResult.startsWith('Win') ? '#4ade80' : '#f87171',
              fontSize: '0.9rem',
            }}>
              {betResult}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CasinoDemoPage() {
  const [wallet, setWallet] = useState('');
  const [submitted, setSubmitted] = useState('');

  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'var(--font-inter, sans-serif)', color: '#e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>Demo Casino</h1>
        <span style={{ fontSize: '0.7rem', background: '#1e293b', color: '#64748b', padding: '0.2rem 0.6rem', borderRadius: 4, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Devnet Only</span>
      </div>

      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Enter a wallet pubkey to check its Cooldown locks. Locked games are benched.
        This calls <code style={{ color: '#475569' }}>/cooldown/check</code> before every bet.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        <input
          type="text"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="Solana pubkey (base58)"
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            background: '#0f172a',
            color: '#e2e8f0',
            border: '1px solid #334155',
            borderRadius: 6,
            fontSize: '0.875rem',
          }}
        />
        <button
          onClick={() => setSubmitted(wallet)}
          style={{
            padding: '0.5rem 1rem',
            background: '#1d4ed8',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          Check
        </button>
      </div>

      {submitted && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {GAMES.map((g) => (
            <GameCard key={g.key} game={g} wallet={submitted} />
          ))}
        </div>
      )}

      {!submitted && (
        <p style={{ color: '#334155', fontSize: '0.8rem', textAlign: 'center', marginTop: '3rem' }}>
          Enter a wallet pubkey above to see the game grid.
        </p>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#0f172a', borderRadius: 8, fontSize: '0.75rem', color: '#475569' }}>
        <strong style={{ color: '#64748b' }}>How it works:</strong> Before each bet, this page calls{' '}
        <code>GET /cooldown/check?wallet=&game=&category=</code>. The API reads the on-chain lock PDA.
        If locked, the game is blocked. No custody, no tokens, no funds held. Locks are on Solana devnet.
      </div>

      <footer style={{ marginTop: '2rem', borderTop: '1px solid #1e293b', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
          <a href="/cooldown" style={{ color: '#3b82f6', textDecoration: 'none' }}>Set a lock</a>
          <BrandTagline compact />
        </div>
      </footer>
    </main>
  );
}
