/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-18 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, Shield, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

interface VaultLockRecord {
  id: string;
  status: 'locked' | 'extended' | string;
  lockedAmountSOL?: number | null;
  unlockAt: number | string;
}

interface VaultErrorResponse {
  error?: string;
}

interface ActiveLock {
  id: string;
  amount: number;
  unlockTime: string;
  readyToRelease: boolean;
}

interface EarlyUnlockRequest {
  mode: 'admin_approval' | 'paid_early_unlock';
  status: 'pending' | 'approved' | 'completed';
  feePercentage?: number;
  feeAmountSOL?: number;
}

interface FeeAllocation {
  feeTotal: number;
  devSOL: number;
  triviaSOL: number;
  micrograntSOL: number;
}

interface VaultState {
  balance: number;
  activeLock: ActiveLock | null;
  walletLocked: boolean;
  walletLockUntil: string | null;
  walletUnlockRequest: EarlyUnlockRequest | null;
  walletEarlyUnlockAllowed: boolean;
  earlyUnlockFeePercent: number;
  feeAllocation: FeeAllocation | null;
  basisSOL: number;
  threshold: number;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function countdown(unlockTime: string): string {
  const diff = new Date(unlockTime).getTime() - Date.now();
  if (diff <= 0) return 'Ready to release';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return h > 0 ? `${h}h ${m}m remaining` : `${m}m ${s}s remaining`;
}

const LockVault = ({ discordId }: { discordId?: string }) => {
  const [vault, setVault] = useState<VaultState>({
    balance: 0,
    activeLock: null,
    walletLocked: false,
    walletLockUntil: null,
    walletUnlockRequest: null,
    walletEarlyUnlockAllowed: true,
    earlyUnlockFeePercent: 10,
    feeAllocation: null,
    basisSOL: 0,
    threshold: 250,
  });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockAmount, setLockAmount] = useState('');
  const [lockHours, setLockHours] = useState(24);
  const [ticker, setTicker] = useState('');
  const [walletLockHours, setWalletLockHours] = useState(24);
  const [walletLockTicker, setWalletLockTicker] = useState('');
  const [walletHardLock, setWalletHardLock] = useState(false);
  const [showWalletLockConfirm, setShowWalletLockConfirm] = useState(false);
  const [powerEvents, setPowerEvents] = useState<
    Array<{ id: string; type: string; actorId: string; at: string }>
  >([]);

  const fetchVault = useCallback(async () => {
    if (!discordId) return;
    try {
      const [vaultRes, userRes, eventsRes] = await Promise.all([
        fetch(`${API}/vault/${discordId}`, { credentials: 'include' }),
        fetch(`${API}/user/${discordId}`, { credentials: 'include' }),
        fetch(`${API}/vault/${discordId}/power-events?limit=10`, { credentials: 'include' }),
      ]);

      if (vaultRes.ok) {
        const data = await vaultRes.json();
        const activeLock = data.vault?.locks?.find(
          (lock: VaultLockRecord) => lock.status === 'locked' || lock.status === 'extended'
        );
        setVault(prev => ({
          ...prev,
          balance: data.vault?.balance ?? 0,
          activeLock: activeLock
            ? {
                id: activeLock.id,
                amount: activeLock.lockedAmountSOL ?? 0,
                unlockTime: new Date(activeLock.unlockAt).toISOString(),
                readyToRelease: Date.now() >= new Date(activeLock.unlockAt).getTime(),
              }
            : null,
          walletLocked: data.walletLock?.locked ?? false,
          walletLockUntil: data.walletLock?.lockUntil
            ? new Date(data.walletLock.lockUntil).toISOString()
            : null,
          walletUnlockRequest: data.walletLock?.earlyUnlockRequest ?? null,
          walletEarlyUnlockAllowed: data.walletLock?.earlyUnlockAllowed !== false,
          earlyUnlockFeePercent: Number(data.walletLock?.earlyUnlockFeePercent ?? 10),
          feeAllocation: data.walletLock?.feeAllocation ?? null,
          basisSOL: Number(data.walletLock?.basisSOL ?? data.vault?.balance ?? 0),
        }));
      }

      if (userRes.ok) {
        const u = await userRes.json();
        setVault(prev => ({
          ...prev,
          threshold: u.redeemThreshold ?? u.user?.redeem_threshold ?? 250,
        }));
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setPowerEvents(Array.isArray(eventsData.events) ? eventsData.events : []);
      }
    } catch (err) {
      console.error('[LockVault] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [discordId]);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  // Countdown ticker
  useEffect(() => {
    if (!vault.activeLock) return;
    const id = setInterval(() => {
      setTicker(countdown(vault.activeLock!.unlockTime));
      if (Date.now() >= new Date(vault.activeLock!.unlockTime).getTime()) {
        setVault(prev => ({
          ...prev,
          activeLock: prev.activeLock ? { ...prev.activeLock, readyToRelease: true } : null,
        }));
        clearInterval(id);
      }
    }, 1000);
    setTicker(countdown(vault.activeLock.unlockTime));
    return () => clearInterval(id);
  }, [vault.activeLock?.unlockTime]);

  useEffect(() => {
    if (!vault.walletLockUntil) {
      setWalletLockTicker('');
      return;
    }

    const updateTicker = () => {
      const next = countdown(vault.walletLockUntil!);
      setWalletLockTicker(next);
      if (next === 'Ready to release') {
        setVault(prev => ({
          ...prev,
          walletLocked: false,
          walletLockUntil: null,
          walletUnlockRequest: null,
          walletEarlyUnlockAllowed: true,
        }));
      }
    };

    updateTicker();
    const id = setInterval(updateTicker, 1000);
    return () => clearInterval(id);
  }, [vault.walletLockUntil]);

  const handleLock = async () => {
    if (!discordId) return;
    const amount = parseFloat(lockAmount);
    if (!amount || amount <= 0) { setError('Enter a valid SOL amount.'); return; }
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`${API}/vault/${discordId}/lock`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, durationMinutes: lockHours * 60, reason: 'Manual lock via TiltCheck Hub' }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as VaultErrorResponse;
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setLockAmount('');
      await fetchVault();
    } catch (err) {
      setError(getErrorMessage(err, 'Lock failed.'));
    } finally {
      setWorking(false);
    }
  };

  const handleRelease = async () => {
    if (!discordId || !vault.activeLock) return;
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`${API}/vault/${discordId}/release`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultId: vault.activeLock.id }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as VaultErrorResponse;
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      await fetchVault();
    } catch (err) {
      setError(getErrorMessage(err, 'Release failed.'));
    } finally {
      setWorking(false);
    }
  };

  const handleUpdateThreshold = async (newThreshold: number) => {
    if (!discordId) return;
    setWorking(true);
    try {
      const res = await fetch(`${API}/me/onboarding-status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'preferences',
          preferences: {
            redeemThreshold: newThreshold,
          },
        }),
      });
      if (res.ok) setVault(prev => ({ ...prev, threshold: newThreshold }));
    } catch (err) {
      console.error('[LockVault] Threshold update error:', err);
    } finally {
      setWorking(false);
    }
  };

  const feeDisclosureLines = (): string[] => {
    const pct = vault.earlyUnlockFeePercent;
    const alloc = vault.feeAllocation;
    const basis = vault.basisSOL;
    if (!alloc) {
      return [
        `Paid early exit (if allowed): ${pct}% of vault ledger basis (currently ~${basis.toFixed(4)} SOL).`,
        'Trivia jackpot: $0 in RG v1. Remainder routes to recovery microgrants + disclosed dev skim.',
      ];
    }
    return [
      `Paid early exit (if allowed): ${pct}% of ~${basis.toFixed(4)} SOL basis = ~${alloc.feeTotal.toFixed(4)} SOL total fee.`,
      `Split: dev ~${alloc.devSOL.toFixed(4)} SOL, trivia ${alloc.triviaSOL.toFixed(4)} SOL, microgrant ~${alloc.micrograntSOL.toFixed(4)} SOL.`,
    ];
  };

  const submitWalletLock = async () => {
    if (!discordId) return;
    setShowWalletLockConfirm(false);
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`${API}/vault/${discordId}/wallet-lock`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationMinutes: walletLockHours * 60,
          reason: 'Manual wallet lock via TiltCheck Hub',
          ...(walletHardLock ? { hardLock: true } : {}),
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as VaultErrorResponse;
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setWalletHardLock(false);
      await fetchVault();
    } catch (err) {
      setError(getErrorMessage(err, 'Wallet lock failed.'));
    } finally {
      setWorking(false);
    }
  };

  const handleWalletLock = () => {
    if (!discordId) return;
    if (walletHardLock) {
      void submitWalletLock();
      return;
    }
    setShowWalletLockConfirm(true);
  };

  const handlePaidWalletUnlockRequest = async () => {
    if (!discordId) return;
    const lines = feeDisclosureLines().join('\n');
    if (!window.confirm(`Confirm paid early unlock?\n\n${lines}\n\nThis is irreversible once settled.`)) {
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`${API}/vault/${discordId}/wallet-unlock-request`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'paid_early_unlock' }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as VaultErrorResponse;
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      await fetchVault();
    } catch (err) {
      setError(getErrorMessage(err, 'Paid early unlock request failed.'));
    } finally {
      setWorking(false);
    }
  };

  const handleWalletUnlock = async () => {
    if (!discordId) return;
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`${API}/vault/${discordId}/wallet-unlock`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as VaultErrorResponse;
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      await fetchVault();
    } catch (err) {
      setError(getErrorMessage(err, 'Wallet unlock failed.'));
    } finally {
      setWorking(false);
    }
  };

  const handleWalletUnlockRequest = async (mode: 'admin_approval') => {
    if (!discordId) return;
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`${API}/vault/${discordId}/wallet-unlock-request`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as VaultErrorResponse;
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      await fetchVault();
    } catch (err) {
      setError(getErrorMessage(err, 'Wallet unlock request failed.'));
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <div className="animate-pulse bg-white/5 h-64 rounded-xl" />;

  const progress = Math.min(100, (vault.balance / (vault.threshold || 250)) * 100);
  const isLocked = !!vault.activeLock;

  return (
    <div className="bg-gradient-to-br from-[#1a2333] to-[#0f172a] border border-[#283347] rounded-xl p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#17c3b2]/10 blur-3xl -mr-16 -mt-16 rounded-full" />

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#17c3b2]/20 rounded-lg">
            <Shield className="w-6 h-6 text-[#17c3b2]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">LockVault</h2>
            <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Pillar 3: Auto-Redeem</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
          isLocked
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-green-500/20 text-green-400 border border-green-500/30'
        }`}>
          {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          {isLocked ? 'VAULT LOCKED' : 'VAULT OPEN'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: stats */}
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm text-gray-400 font-medium">Session Earnings</span>
              <span className="text-2xl font-bold text-white font-mono">{vault.balance.toFixed(4)} SOL</span>
            </div>
            <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-[#17c3b2] to-[#4f46e5] transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-gray-500 font-mono">0.0000 SOL</span>
              <span className="text-[10px] text-[#17c3b2] font-mono font-bold">TARGET: {vault.threshold} SOL</span>
            </div>
          </div>

          {isLocked && vault.activeLock && (
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {vault.activeLock.amount.toFixed(4)} SOL locked
                  </p>
                  <p className="text-xs text-red-400 mt-1 font-mono">{ticker}</p>
                </div>
              </div>
            </div>
          )}

          {!isLocked && (
            <div className="p-4 bg-black/20 rounded-lg border border-white/5">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Profit Locking Strategy</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Lock wins when you cross{' '}
                    <span className="text-[#17c3b2] font-bold">{vault.threshold} SOL</span>.
                    TiltCheck blocks redemption signals until your timer expires.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className={`p-4 rounded-lg border ${vault.walletLocked ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-black/20 border-white/5'}`}>
            <div className="flex items-start gap-3">
              <Lock className={`w-5 h-5 shrink-0 mt-0.5 ${vault.walletLocked ? 'text-yellow-400' : 'text-gray-500'}`} />
              <div>
                <h3 className="text-sm font-semibold text-white">Wallet Lock</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Freeze wallet vault actions for a cooldown window so you cannot top up or release on impulse.
                  Optional timer-only mode matches a hard commitment vibe (no admin bypass) — still server policy, not on-chain.
                </p>
                {vault.walletLocked && vault.walletLockUntil && (
                  <p className="text-xs text-yellow-400 mt-2 font-mono">
                    Wallet lock active — {walletLockTicker}
                    {!vault.walletEarlyUnlockAllowed ? ' — timer-only (no early unlock)' : ''}
                  </p>
                )}
                {vault.walletUnlockRequest && (
                  <p className="text-xs text-yellow-300 mt-2 font-mono">
                    {vault.walletUnlockRequest.mode === 'admin_approval'
                      ? 'Admin override requested'
                      : `Paid early unlock pending — fee ~${vault.walletUnlockRequest.feeAmountSOL?.toFixed(4) ?? '?'} SOL`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex flex-col justify-center space-y-4">
          {isLocked && vault.activeLock ? (
            <button
              onClick={handleRelease}
              disabled={working || !vault.activeLock.readyToRelease}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border ${
                vault.activeLock.readyToRelease
                  ? 'bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30'
                  : 'bg-gray-800/40 border-gray-700/30 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Unlock className="w-5 h-5" />
              {vault.activeLock.readyToRelease ? 'RELEASE LOCK' : 'LOCKED — TIMER ACTIVE'}
            </button>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Amount to Lock (SOL)</label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={lockAmount}
                  onChange={e => setLockAmount(e.target.value)}
                  placeholder="e.g. 0.5"
                  className="w-full bg-black/40 border border-[#283347] rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-[#17c3b2] focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 6, 24, 72].map(h => (
                    <button
                      key={h}
                      onClick={() => setLockHours(h)}
                      className={`py-2 rounded-lg text-xs font-mono transition-all border ${
                        lockHours === h
                          ? 'bg-[#17c3b2] border-[#17c3b2] text-black font-bold'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleLock}
                disabled={working || !lockAmount || vault.walletLocked}
                className="w-full py-4 bg-[#17c3b2] hover:bg-[#14b0a0] disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Shield className="w-5 h-5" />
                {working ? 'LOCKING...' : vault.walletLocked ? 'WALLET LOCK ACTIVE' : 'SECURE MY WINS'}
              </button>
              <p className="text-[10px] text-gray-500 font-mono">
                Manual locks require a linked wallet or Degen Identity. TiltCheck will not create a server-managed fallback wallet.
              </p>
             </>
           )}

          <div className="space-y-2 rounded-xl border border-[#283347] bg-black/20 p-4">
            <label className="text-sm font-medium text-gray-300">Wallet Lock Timer</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[1, 6, 24, 72, 168].map(h => (
                <button
                  key={`wallet-${h}`}
                  onClick={() => setWalletLockHours(h)}
                  disabled={working || vault.walletLocked}
                  className={`py-2 rounded-lg text-xs font-mono transition-all border ${
                    walletLockHours === h
                      ? 'bg-[#facc15] border-[#facc15] text-black font-bold'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {h}h{h === 168 ? ' (7d)' : ''}
                </button>
              ))}
            </div>
            {!vault.walletLocked && (
              <label className="flex items-start gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={walletHardLock}
                  onChange={e => setWalletHardLock(e.target.checked)}
                  className="mt-1 rounded border-yellow-500/40 bg-black/40 text-yellow-400 focus:ring-yellow-500/30"
                />
                <span className="text-xs text-yellow-200/90 leading-snug">
                  Timer-only lock: no admin early-unlock until the timer ends (server-enforced; not a smart-contract lock).
                </span>
              </label>
            )}
            {vault.walletLocked ? (
              <div className="space-y-2">
                <button
                  onClick={handleWalletUnlock}
                  disabled={working || walletLockTicker !== 'Ready to release'}
                  className="w-full py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Unlock className="w-5 h-5" />
                  {working ? 'CLEARING LOCK...' : walletLockTicker === 'Ready to release' ? 'CLEAR WALLET LOCK' : 'WALLET LOCK TIMER ACTIVE'}
                </button>
                {vault.walletEarlyUnlockAllowed && (
                  <button
                    onClick={() => handleWalletUnlockRequest('admin_approval')}
                    disabled={working || vault.walletUnlockRequest?.mode === 'admin_approval'}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {vault.walletUnlockRequest?.mode === 'admin_approval'
                      ? 'ADMIN OVERRIDE REQUESTED'
                      : 'REQUEST ADMIN OVERRIDE'}
                  </button>
                )}
                {vault.walletEarlyUnlockAllowed && (
                  <button
                    type="button"
                    onClick={handlePaidWalletUnlockRequest}
                    disabled={
                      working ||
                      vault.walletUnlockRequest?.mode === 'paid_early_unlock'
                    }
                    className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {vault.walletUnlockRequest?.mode === 'paid_early_unlock'
                      ? 'PAID UNLOCK QUOTED — SETTLE IN DASHBOARD'
                      : `PAID EARLY UNLOCK (${vault.earlyUnlockFeePercent}% FEE)`}
                  </button>
                )}
              </div>
            ) : (
              <>
                {showWalletLockConfirm && !walletHardLock && (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2" role="dialog" aria-label="Wallet lock fee disclosure">
                    <p className="text-xs text-yellow-200 font-semibold uppercase tracking-wide">
                      Fee disclosure (if you exit early later)
                    </p>
                    {feeDisclosureLines().map(line => (
                      <p key={line} className="text-[11px] text-gray-300 leading-snug">
                        {line}
                      </p>
                    ))}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowWalletLockConfirm(false)}
                        className="flex-1 py-2 text-xs border border-white/10 rounded-lg text-gray-400"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitWalletLock()}
                        disabled={working}
                        className="flex-1 py-2 text-xs bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-yellow-100 font-bold"
                      >
                        I understand — lock wallet
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleWalletLock}
                  disabled={working}
                  className="w-full py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lock className="w-5 h-5" />
                  {working ? 'LOCKING WALLET...' : `LOCK WALLET FOR ${walletLockHours}H`}
                </button>
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest">Redemption Threshold</label>
            <div className="grid grid-cols-3 gap-2">
              {[100, 250, 500].map(val => (
                <button
                  key={val}
                  onClick={() => handleUpdateThreshold(val)}
                  disabled={working}
                  className={`py-2 rounded-lg text-sm font-mono transition-all border ${
                    vault.threshold === val
                      ? 'bg-[#17c3b2] border-[#17c3b2] text-black font-bold'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {powerEvents.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-gray-500">Power activity</p>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {powerEvents.map(event => (
                  <li key={event.id} className="text-[10px] font-mono text-gray-400">
                    {event.type} — {new Date(event.at).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 font-mono text-center">{error}</p>
          )}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
        <p className="text-[10px] text-yellow-500 font-medium">
          Policy locks are advisory (see custody matrix). Direct tips stay non-custodial; credits use pooled relay.
        </p>
      </div>
      <p className="mt-4 text-center text-[10px] uppercase tracking-[0.3em] text-gray-500">
        Made for Degens. By Degens.
      </p>
    </div>
  );
};

export default LockVault;
