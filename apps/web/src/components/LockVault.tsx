/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Shield, TrendingUp, AlertTriangle } from 'lucide-react';

interface VaultStatus {
    balance: number;
    locked: boolean;
    amount?: number;
    unlockTime?: string;
    threshold?: number;
}

const LockVault = ({ discordId }: { discordId?: string }) => {
    const [status, setStatus] = useState<VaultStatus>({
        balance: 0,
        locked: false,
        threshold: 250 // Default threshold
    });
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        async function fetchVault() {
            if (!discordId) return;
            try {
                // For now, we fetch from the user endpoint which includes some vault-like stats
                // In production, this hits /vault/:userId
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/user/${discordId}`);
                if (response.ok) {
                    const data = await response.json();
                    setStatus(prev => ({
                        ...prev,
                        balance: data.user?.total_redeemed || 0,
                        threshold: data.user?.redeem_threshold || 250
                    }));
                }
            } catch (err) {
                console.error('[LockVault] Fetch error:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchVault();
    }, [discordId]);

    const handleUpdateThreshold = async (newThreshold: number) => {
        if (!discordId) return;
        setIsUpdating(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/user/${discordId}/onboarding`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ redeem_threshold: newThreshold })
            });
            if (response.ok) {
                setStatus(prev => ({ ...prev, threshold: newThreshold }));
            }
        } catch (err) {
            console.error('[LockVault] Update error:', err);
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) return <div className="animate-pulse bg-white/5 h-64 rounded-xl" />;

    const progress = Math.min(100, (status.balance / (status.threshold || 250)) * 100);

    return (
        <div className="bg-gradient-to-br from-[#1a2333] to-[#0f172a] border border-[#283347] rounded-xl p-8 shadow-2xl relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--color-primary)]/10 blur-3xl -mr-16 -mt-16 rounded-full" />
            
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[color:var(--color-primary)]/20 rounded-lg">
                        <Shield className="w-6 h-6 text-[color:var(--color-primary)]" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">LockVault</h2>
                        <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Pillar 3: Auto-Redeem</p>
                    </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${status.locked ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                    {status.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {status.locked ? 'VAULT LOCKED' : 'VAULT OPEN'}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left side: Stats & Progress */}
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm text-gray-400 font-medium">Session Earnings</span>
                            <span className="text-2xl font-bold text-white font-mono">{status.balance.toFixed(2)} SOL</span>
                        </div>
                        <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div 
                                className="h-full bg-gradient-to-r from-[color:var(--color-primary)] to-[#4f46e5] shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all duration-1000 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-[10px] text-gray-500 font-mono">0.00 SOL</span>
                            <span className="text-[10px] text-[color:var(--color-primary)] font-mono font-bold">TARGET: {status.threshold} SOL</span>
                        </div>
                    </div>

                    <div className="p-4 bg-black/20 rounded-lg border border-white/5">
                        <div className="flex items-start gap-3">
                            <TrendingUp className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-semibold text-white">Profit Locking Strategy</h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    Once you cross <span className="text-[color:var(--color-primary)] font-bold">{status.threshold} SOL</span>, 
                                    TiltCheck will initiate an automated withdrawal block on your casino accounts.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side: Controls */}
                <div className="flex flex-col justify-center space-y-4">
                    <div className="space-y-4">
                        <label className="text-sm font-medium text-gray-300">Set Redemption Threshold</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[100, 250, 500].map((val) => (
                                <button
                                    key={val}
                                    onClick={() => handleUpdateThreshold(val)}
                                    disabled={isUpdating}
                                    className={`py-2 rounded-lg text-sm font-mono transition-all border ${
                                        status.threshold === val 
                                        ? 'bg-[color:var(--color-primary)] border-[color:var(--color-primary)] text-white shadow-lg shadow-[color:var(--color-primary)]/20' 
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {val} SOL
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        disabled
                        className="w-full mt-2 py-4 bg-gray-800/40 text-gray-500 rounded-xl font-bold cursor-not-allowed flex items-center justify-center gap-2 border border-gray-700/30"
                        title="Vault integration coming soon"
                    >
                        <Shield className="w-5 h-5" />
                        SECURE MY WINS — SOON
                    </button>
                    
                    <p className="text-[10px] text-center text-gray-500 italic">
                        "Winning is easy. Keeping it is legendary."
                    </p>
                </div>
            </div>

            {/* Warning Footer */}
            <div className="mt-8 flex items-center gap-3 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                <p className="text-[10px] text-yellow-500 font-medium">
                    NOTE: This is a Non-Custodial Protocol. TiltCheck cannot access your funds. This vault manages your session locks and automated redemption signals.
                </p>
            </div>
        </div>
    );
};

export default LockVault;
