/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
'use client';

import React from 'react';

interface Guardian {
    id: string;
    userId: string;
    buddyId: string;
    status: 'pending' | 'accepted';
    alert_thresholds: {
        tilt_score_exceeds: number;
        losses_in_24h_sol: number;
        zero_balance_reached: boolean;
    };
}

interface GuardianManagerProps {
    discordId?: string;
}

/**
 * GuardianManager
 * Pillar 4: The Guardians
 * Management UI for accountability partners and loss intervention triggers.
 */
const GuardianManager: React.FC<GuardianManagerProps> = ({ discordId }) => {
    const [guardians, setGuardians] = React.useState<Guardian[]>([]);
    const [pending, setPending] = React.useState<Guardian[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [newBuddyId, setNewBuddyId] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    const fetchGuardians = React.useCallback(async () => {
        if (!discordId) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/user/${discordId}/buddies`);
            if (res.ok) {
                const data = await res.json();
                setGuardians(data.buddies || []);
                setPending(data.pending || []);
            }
        } catch (err) {
            console.error('[Guardians] Load failed:', err);
        } finally {
            setLoading(false);
        }
    }, [discordId]);

    React.useEffect(() => {
        fetchGuardians();
    }, [fetchGuardians]);

    const handleAddGuardian = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBuddyId || !discordId) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/user/${discordId}/buddies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ buddyId: newBuddyId })
            });
            if (res.ok) {
                setNewBuddyId('');
                fetchGuardians();
            }
        } catch (err) {
            console.error('[Guardians] Link failed:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemove = async (buddyId: string) => {
        if (!discordId) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/user/${discordId}/buddies/${buddyId}`, {
                method: 'DELETE'
            });
            if (res.ok) fetchGuardians();
        } catch (err) {
            console.error('[Guardians] Remove failed:', err);
        }
    };

    if (!discordId) return null;

    return (
        <div className="bg-black/40 border border-[#283347] rounded-xl p-8">
            <h2 className="text-xl font-black uppercase tracking-tighter mb-2 flex items-center gap-3">
                <span className="w-2 h-6 bg-blue-500"></span>
                Your People
            </h2>
            <p className="text-xs text-gray-500 font-mono mb-6">The humans who get a heads-up when your session goes sideways.</p>

            {/* Addition Form */}
            <form onSubmit={handleAddGuardian} className="mb-8 flex gap-2">
                <input 
                    type="text" 
                    placeholder="Discord ID (e.g. 123456789...)"
                    value={newBuddyId}
                    onChange={(e) => setNewBuddyId(e.target.value)}
                    className="flex-1 bg-black/60 border border-[#283347] px-4 py-2 text-sm font-bold tracking-widest focus:border-blue-500 outline-none transition-all"
                />
                <button 
                    disabled={submitting}
                    className="btn btn-primary text-xs px-6 py-2 uppercase font-black"
                    style={{ background: '#3b82f6', borderColor: '#2563eb' }}
                >
                    {submitting ? 'Requesting...' : 'Add Guardian'}
                </button>
            </form>

            <div className="space-y-6">
                {/* Active Guardians */}
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 border-b border-[#283347] pb-1">
                        ACTIVE_WATCHERS ({guardians.length})
                    </h3>
                    {loading ? (
                        <div className="text-xs text-gray-600 animate-pulse">Loading your crew...</div>
                    ) : guardians.length === 0 ? (
                        <div className="p-4 border border-[#283347] border-dashed text-xs text-gray-500 italic text-center leading-relaxed">
                            Nobody linked yet. That&apos;s fine — most people fly solo. But it helps to have someone watching your back when the session gets messy.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {guardians.map((g) => (
                                <div key={g.id} className="flex items-center justify-between p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg group">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-white">{g.buddyId}</span>
                                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-tight">
                                            Status: Vigilant // Threshold: {g.alert_thresholds.losses_in_24h_sol} SOL
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => handleRemove(g.buddyId)}
                                        className="p-2 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 transition-all rounded"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pending Requests */}
                {pending.length > 0 && (
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-500/50 mb-4 border-b border-[#283347] pb-1">
                            Waiting on them to accept ({pending.length})
                        </h3>
                        <div className="space-y-2">
                             {pending.map((p) => (
                                <div key={p.id} className="p-3 bg-yellow-500/5 border border-yellow-500/20 border-dashed rounded flex justify-between items-center animate-pulse">
                                    <span className="text-xs font-black text-white/50">{p.buddyId}</span>
                                    <div className="flex gap-2 text-[8px] font-black uppercase">
                                        <span className="text-yellow-500 underline">Awaiting Confirmation</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 pt-8 border-t border-[#283347]">
                <div className="flex items-center gap-4 p-4 bg-gray-500/5 rounded">
                    <div className="text-xl">💙</div>
                    <div className="text-[10px] font-bold uppercase text-gray-500 leading-tight">
                        Guardians get a real, direct message when you cross your thresholds. Only add people you actually trust with that.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuardianManager;
