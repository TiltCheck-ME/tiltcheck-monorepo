/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-13 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, Shield, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

interface ActiveLock {
  id: string;
  amount: number;
  unlockTime: string;
  readyToRelease: boolean;
}

interface VaultState {
  balance: number;
  activeLock: ActiveLock | null;
  walletLocked: boolean;
  walletLockUntil: string | null;
  threshold: number;
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
    threshold: 250,
  });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockAmount, setLockAmount] = useState('');
  const [lockHours, setLockHours] = useState(24);
  const [ticker, setTicker] = useState('');

  const fetchVault = useCallback(async () => {
    if (!discordId) return;
    try {
      const [vaultRes, userRes] = await Promise.all([
        fetch(`${API}/vault/${discordId}`, { credentials: 'include' }),
        fetch(`${API}/user/${discordId}`, { credentials: 'include' }),
      ]);

      if (vaultRes.ok) {
        const data = await vaultRes.json();
        const activeLock = data.vault?.locks?.find(
          (l: any) => l.status === 'locked' || l.status === 'extended'
        );
        setVault(prev => ({
          ...prev,
          balance: data.vault?.balance ?? 0,
          activeLock: activeLock
            ? {
                id: activeLock.id,
                amount: activeLock.lockedAmountSOL ?? 0,
                unlockTime: new Date(activeLock.unlockAt).toISOString(),
                readyToRelease: Date.now() >= activeLock.unlockAt,
              }
            : null,
          walletLocked: data.walletLock?.locked ?? false,
          walletLockUntil: data.walletLock?.lockUntil
            ? new Date(data.walletLock.lockUntil).toISOString()
            : null,
        }));
      }

      if (userRes.ok) {
        const u = await userRes.json();
        setVault(prev => ({
          ...prev,
          threshold: u.redeemThreshold ?? u.user?.redeem_threshold ?? 250,
        }));
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
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setLockAmount('');
      await fetchVault();
    } catch (err: any) {
      setError(err.message || 'Lock failed.');
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
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      await fetchVault();
    } catch (err: any) {
      setError(err.message || 'Release failed.');
    } finally {
      setWorking(false);
    }
  };

  const handleUpdateThreshold = async (newThreshold: number) => {
    if (!discordId) return;
    setWorking(true);
    try {
      const res = await fetch(`${API}/user/${discordId}/onboarding`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isOnboarded: true,
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
                disabled={working || !lockAmount}
                className="w-full py-4 bg-[#17c3b2] hover:bg-[#14b0a0] disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Shield className="w-5 h-5" />
                {working ? 'LOCKING...' : 'SECURE MY WINS'}
              </button>
            </>
          )}

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

          {error && (
            <p className="text-xs text-red-400 font-mono text-center">{error}</p>
          )}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
        <p className="text-[10px] text-yellow-500 font-medium">
          NON-CUSTODIAL: TiltCheck cannot access your funds. Vault locks and redemption signals are advisory only.
        </p>
      </div>
    </div>
  );
};

export default LockVault;
