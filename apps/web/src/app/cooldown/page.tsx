/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30 */
'use client';

/**
 * Cooldown Lock Page
 * Connect wallet, pick scope, pick duration, sign a set_lock transaction.
 * Reads active locks from the API. No custody, no funds held.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import BrandTagline from '@/components/BrandTagline';

// ── Types ─────────────────────────────────────────────────────────────────────

type ScopeId = 'all' | 'category' | 'game';
type CategorySlug = 'crash' | 'plinko' | 'slots-high-vol' | 'live-dealer';
type GameEntry = { label: string; key: string };

interface LockStatus {
  locked: boolean;
  scope: string | null;
  endTime: number | null;
}

/** Pairs an API response with the original target key used to check it,
 *  so the Extend handler can derive the correct on-chain PDA. */
interface ActiveLock {
  status: LockStatus;
  /** Raw target key passed to hashTarget() when the lock was set.
   *  Empty string for all-scope (uses zeroTarget() instead). */
  targetKey: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES: { label: string; slug: CategorySlug }[] = [
  { label: 'Crash', slug: 'crash' },
  { label: 'Plinko', slug: 'plinko' },
  { label: 'High-vol Slots', slug: 'slots-high-vol' },
  { label: 'Live Dealer', slug: 'live-dealer' },
];

const GAMES: GameEntry[] = [
  { label: 'Plinko (Pragmatic)', key: 'pragmatic:plinko' },
  { label: 'Dice (Relax)', key: 'relax:dice' },
  { label: 'Crash (Spribe)', key: 'spribe:crash' },
  { label: 'Le Vampire (Push)', key: 'push:le-vampire' },
];

const DURATIONS: { label: string; seconds: number }[] = [
  { label: '24 hours', seconds: 86_400 },
  { label: '7 days', seconds: 7 * 86_400 },
  { label: '30 days', seconds: 30 * 86_400 },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const LOCK_PAGE_URL = typeof window !== 'undefined' ? window.location.origin + '/cooldown' : 'https://tiltcheck.me/cooldown';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString();
}

const EMPTY_WALLET_TX_ERROR =
  'Switch your wallet to Solana devnet and try again. Cooldown only signs a lock on devnet — no SOL moves.';

function walletTxErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.trim() === '' ? EMPTY_WALLET_TX_ERROR : raw;
}

async function fetchLockStatus(wallet: string, game?: string, category?: string): Promise<LockStatus> {
  const params = new URLSearchParams({ wallet });
  if (game) params.set('game', game);
  if (category) params.set('category', category);
  const res = await fetch(`${API_BASE}/cooldown/check?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<LockStatus>;
}

// Build and sign a set_lock transaction via the injected Solana wallet.
// The SDK instruction builder is imported lazily to avoid SSR issues.
type SendLockTx = (
  transaction: import('@solana/web3.js').Transaction,
  connection: import('@solana/web3.js').Connection,
) => Promise<string>;

async function signAndSendLock(
  wallet: string,
  scope: number,
  targetKey: string,
  endTime: number,
  sendTransaction: SendLockTx,
): Promise<string> {
  // Dynamic import to avoid SSR errors.
  const [{ setLock, hashTarget, zeroTarget, SCOPE_ALL }, { Connection, PublicKey, Transaction }] =
    await Promise.all([
      import('@tiltcheck/cooldown-sdk'),
      import('@solana/web3.js'),
    ]);

  const ownerKey = new PublicKey(wallet);
  const target = scope === SCOPE_ALL ? zeroTarget() : hashTarget(targetKey);
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  const ix = setLock(ownerKey, scope, target, endTime);
  const tx = new Transaction().add(ix);
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = ownerKey;

  const signature = await sendTransaction(tx, connection);
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CooldownPage() {
  const { publicKey, connecting, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const wallet = publicKey?.toBase58() ?? null;
  const [scope, setScope] = useState<ScopeId>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategorySlug>('crash');
  const [selectedGame, setSelectedGame] = useState<string>(GAMES[0]!.key);
  const [durationSecs, setDurationSecs] = useState(86_400);
  const [customDays, setCustomDays] = useState('');
  const [activeLocks, setActiveLocks] = useState<ActiveLock[]>([]);
  const [txStatus, setTxStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const connectWallet = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  // ── Load active locks ───────────────────────────────────────────────────────

  const loadLocks = useCallback(async (w: string) => {
    // Pair each check promise with the targetKey used to build the PDA.
    const checksWithKeys: { promise: Promise<LockStatus>; targetKey: string }[] = [
      { promise: fetchLockStatus(w), targetKey: '' },                          // all-scope
      ...CATEGORIES.map((c) => ({ promise: fetchLockStatus(w, undefined, c.slug), targetKey: `category:${c.slug}` })),
      ...GAMES.map((g) => ({ promise: fetchLockStatus(w, g.key), targetKey: g.key })),
    ];
    const results = await Promise.allSettled(checksWithKeys.map((c) => c.promise));
    const active: ActiveLock[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.locked) {
        active.push({ status: r.value, targetKey: checksWithKeys[i]!.targetKey });
      }
    });
    setActiveLocks(active);
  }, []);

  useEffect(() => {
    if (wallet) { void loadLocks(wallet); }
  }, [wallet, loadLocks]);

  // ── Submit lock ─────────────────────────────────────────────────────────────

  const handleLock = async () => {
    if (!wallet) return;
    setLoading(true);
    setTxStatus('');
    try {
      const effectiveDuration = customDays
        ? parseFloat(customDays) * 86_400
        : durationSecs;
      const endTime = Math.floor(Date.now() / 1000) + Math.floor(effectiveDuration);

      const scopeNum = scope === 'all' ? 0 : scope === 'category' ? 1 : 2;
      const targetKey =
        scope === 'all' ? '' :
        scope === 'category' ? `category:${selectedCategory}` :
        selectedGame;

      const sig = await signAndSendLock(wallet, scopeNum, targetKey, endTime, sendTransaction);
      setTxStatus(`Lock set. Tx: ${sig.slice(0, 20)}...`);
      await loadLocks(wallet);
    } catch (err: unknown) {
      setTxStatus(`Error: ${walletTxErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Extend ─────────────────────────────────────────────────────────────────

  const handleExtend = async ({ status: lock, targetKey }: ActiveLock) => {
    if (!wallet || !lock.endTime) return;
    setLoading(true);
    setTxStatus('');
    try {
      const [{ extendLock, hashTarget, zeroTarget, SCOPE_ALL: SA }, { Connection, PublicKey, Transaction }] =
        await Promise.all([
          import('@tiltcheck/cooldown-sdk'),
          import('@solana/web3.js'),
        ]);

      const scopeNum = lock.scope === 'all' ? 0 : lock.scope === 'category' ? 1 : 2;
      // Use the stored targetKey to derive the same PDA the lock was originally created with.
      const target = scopeNum === SA ? zeroTarget() : hashTarget(targetKey);
      const newEndTime = lock.endTime + 7 * 86_400;
      const ownerKey = new PublicKey(wallet);
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const ix = extendLock(ownerKey, scopeNum, target, newEndTime);
      const tx = new Transaction().add(ix);
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = ownerKey;
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      setTxStatus(`Extended +7d. Tx: ${signature.slice(0, 20)}...`);
      await loadLocks(wallet);
    } catch (err: unknown) {
      setTxStatus(`Extend failed: ${walletTxErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="cooldown-page">
      <div className="cooldown-panel">
      <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.25rem' }}>Cooldown</h1>
      <p style={{ color: '#e8eee8', marginBottom: '0.7rem', fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.4 }}>
        Sign a lock so 3am-you cannot put the stack back.
      </p>
      <p style={{ color: '#d7e0d8', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
        Not a deposit. No keys. Solana wallet. Devnet. Casinos do not have to honor it. You do. Stronger only.
      </p>

      {/* ── Connect wallet ── */}
      {!wallet ? (
        <button
          onClick={connectWallet}
          disabled={connecting}
          style={btnStyle('#17c3b2')}
        >
          {connecting ? 'Opening wallets...' : 'SIGN WITH WALLET'}
        </button>
      ) : (
        <p style={{ fontSize: '0.8rem', color: '#8fa197', marginBottom: '1.5rem' }}>
          Connected: <code style={{ color: '#d7e0d8' }}>{wallet.slice(0, 8)}...{wallet.slice(-6)}</code>
        </p>
      )}
      {txStatus && !wallet && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#f87171' }}>{txStatus}</p>
      )}

      {wallet && (
        <>
          {/* ── Active locks ── */}
          {activeLocks.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={sectionHead}>Active Locks</h2>
              {activeLocks.map((activeLock, i) => (
                <div key={i} style={lockCard}>
                  <div>
                    <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{activeLock.status.scope}</span>
                    {activeLock.status.endTime && (
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: '0.75rem' }}>
                        until {fmtDate(activeLock.status.endTime)}
                      </span>
                    )}
                  </div>
                  {/* Extend only — no shorten button. Lock can only get stronger. */}
                  <button onClick={() => handleExtend(activeLock)} disabled={loading} style={btnStyle('#1e293b', true)}>
                    Extend +7d
                  </button>
                </div>
              ))}
            </section>
          )}

          {/* ── Set a new lock ── */}
          <section>
            <h2 style={sectionHead}>Set a Lock</h2>

            {/* Scope picker */}
            <label style={labelStyle}>Scope</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {(['all', 'category', 'game'] as ScopeId[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  style={tabBtn(scope === s)}
                >
                  {s === 'all' ? 'Whole site' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {scope === 'category' && (
              <>
                <label style={labelStyle}>Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as CategorySlug)}
                  style={selectStyle}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </select>
              </>
            )}

            {scope === 'game' && (
              <>
                <label style={labelStyle}>Game</label>
                <select
                  value={selectedGame}
                  onChange={(e) => setSelectedGame(e.target.value)}
                  style={selectStyle}
                >
                  {GAMES.map((g) => (
                    <option key={g.key} value={g.key}>{g.label}</option>
                  ))}
                </select>
              </>
            )}

            {/* Duration picker */}
            <label style={labelStyle}>Duration</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              {DURATIONS.map((d) => (
                <button
                  key={d.seconds}
                  onClick={() => { setDurationSecs(d.seconds); setCustomDays(''); }}
                  style={tabBtn(durationSecs === d.seconds && !customDays)}
                >
                  {d.label}
                </button>
              ))}
              <button onClick={() => setCustomDays('1')} style={tabBtn(!!customDays)}>Custom</button>
            </div>

            {customDays !== '' && (
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="number"
                  min="1"
                  max="1825"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder="Days"
                  style={{ ...selectStyle, width: 120 }}
                />
                <span style={{ color: '#64748b', marginLeft: '0.5rem', fontSize: '0.85rem' }}>days</span>
              </div>
            )}

            <button
              onClick={handleLock}
              disabled={loading || !wallet}
              style={btnStyle('#dc2626')}
            >
              {loading ? 'Signing...' : 'Sign and Lock'}
            </button>

            {txStatus && (
              <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: txStatus.startsWith('Error') ? '#f87171' : '#4ade80' }}>
                {txStatus}
              </p>
            )}
          </section>

          <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#334155' }}>
            Devnet only. Locks are on-chain at program{' '}
            <code style={{ color: '#475569' }}>7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2</code>.
          </p>
        </>
      )}

      <footer style={{ marginTop: '3rem', borderTop: '1px solid #1e293b', paddingTop: '1rem' }}>
        <BrandTagline compact />
      </footer>
      </div>
    </main>
  );
}

// ── Inline style helpers ───────────────────────────────────────────────────────

const sectionHead: React.CSSProperties = { fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#cbd5e1' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' };
const selectStyle: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, fontSize: '0.875rem', marginBottom: '1rem' };

function btnStyle(bg: string, small = false): React.CSSProperties {
  return {
    padding: small ? '0.3rem 0.75rem' : '0.6rem 1.25rem',
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontWeight: 700,
    fontSize: small ? '0.75rem' : '0.875rem',
    cursor: 'pointer',
    marginBottom: small ? 0 : '1.5rem',
  };
}

function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: '0.4rem 0.9rem',
    background: active ? '#1d4ed8' : '#1e293b',
    color: active ? '#fff' : '#94a3b8',
    border: `1px solid ${active ? '#3b82f6' : '#334155'}`,
    borderRadius: 6,
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: 'pointer',
  };
}

const lockCard: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem 1rem',
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 8,
  marginBottom: '0.5rem',
};

// Prefill URL helper (exported for JustTheTip tilt hint)
export { LOCK_PAGE_URL };
