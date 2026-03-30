/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
'use client';

import React, { useState, useEffect } from 'react';

interface ActivityItem {
    id: string;
    type: 'redeem' | 'tilt' | 'audit' | 'win';
    message: string;
    meta: string;
    timestamp: string;
}

const ActivityFeed = ({ discordId }: { discordId?: string }) => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchActivities() {
            if (!discordId) return;
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/user/${discordId}/activities`);
                if (response.ok) {
                    const data = await response.json();
                    setActivities(data.activities);
                }
            } catch (err) {
                console.error('[ActivityFeed] Fetch error:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchActivities();
        const interval = setInterval(fetchActivities, 10000); // Polling every 10s for real degen speed
        return () => clearInterval(interval);
    }, [discordId]);

    return (
        <div className="bg-black/40 border border-[#283347] rounded-xl p-8 overflow-hidden">
            <h3 className="text-sm font-black uppercase tracking-tighter text-white mb-6 flex items-center gap-2">
                <span className="w-2 h-4 bg-gray-600"></span>
                What's been happening
            </h3>
            <div className="space-y-4">
                {!discordId ? (
                    <div className="py-8 text-center text-xs text-gray-500 italic leading-relaxed">
                        Link your wallet to Discord to see your activity here.
                    </div>
                ) : activities.length === 0 && !loading ? (
                    <div className="py-8 text-center text-xs text-gray-500 italic leading-relaxed">
                        Nothing yet. Activity will appear here once you start using the tools.
                    </div>
                ) : (
                    activities.map((activity, idx) => (
                        <div 
                            key={activity.id} 
                            className={`flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded transition-all duration-500 ${idx === 0 ? 'animate-in fade-in slide-in-from-top-4' : ''}`}
                            style={{ opacity: 1 - idx * 0.2 }}
                        >
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-tight text-white mb-1">{activity.message}</span>
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{activity.timestamp} // {activity.meta}</span>
                            </div>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                activity.type === 'redeem' ? 'text-green-500 bg-green-500/10' :
                                activity.type === 'win' ? 'text-[#ffd700] bg-[#ffd700]/10' :
                                activity.type === 'audit' ? 'text-blue-500 bg-blue-500/10' :
                                'text-amber-500 bg-amber-500/10'
                            }`}>
                                {activity.type === 'redeem' ? 'Secured' : 
                                 activity.type === 'win' ? 'Jackpot' :
                                 activity.type === 'audit' ? 'Audited' : 
                                 'Nudged'}
                            </span>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-6 pt-4 border-t border-[#283347] flex justify-between items-center opacity-30">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500">Live</span>
                <span className="flex gap-1">
                    <span className="w-1 h-1 bg-green-500 rounded-full animate-ping"></span>
                    <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                </span>
            </div>
        </div>
    );
};

export default ActivityFeed;
