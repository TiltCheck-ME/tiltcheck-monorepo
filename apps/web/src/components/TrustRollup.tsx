/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
'use client';

import React from 'react';

interface TrustRollupProps {
  score?: number;
  isLoading?: boolean;
}

/**
 * TrustRollup
 * The "Pillar" of Degen Trust. Replaces the standalone trust subdomain.
 * Visualizes the ecosystem's confidence in a user's behavior.
 */
export default function TrustRollup({ score = 75, isLoading = false }: TrustRollupProps) {
  // Determine color based on score
  const getScoreColor = (s: number) => {
    if (s >= 80) return '#22c55e'; // Green
    if (s >= 60) return '#f97316'; // Orange (needs attention)
    if (s >= 40) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const scoreColor = getScoreColor(score);

  return (
    <div className="bg-black/60 border border-[#283347] rounded-xl p-8 relative overflow-hidden group hover:border-[#17c3b2]/50 transition-all duration-500">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-12">
        {/* The Meter */}
        <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Outer Ring */}
            <svg className="w-full h-full -rotate-90">
                <circle 
                    cx="96" cy="96" r="80" 
                    fill="none" stroke="#111827" 
                    strokeWidth="8" 
                />
                <circle 
                    cx="96" cy="96" r="80" 
                    fill="none" stroke={scoreColor} 
                    strokeWidth="8" 
                    strokeDasharray={502.4}
                    strokeDashoffset={502.4 * (1 - score / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            
            {/* Center Text */}
            <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-black tracking-tighter" style={{ color: scoreColor }}>{score}</span>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mt-1">Trust Score</span>
            </div>

            {/* Pulsing light behind if score is high */}
            {score >= 80 && (
                <div className="absolute inset-0 bg-green-500/10 blur-3xl -z-10 rounded-full animate-pulse"></div>
            )}
        </div>

        {/* Factors */}
        <div className="flex-1 w-full">
            <h3 className="text-sm font-black uppercase tracking-tighter text-white mb-6 flex items-center gap-2">
                <span className="w-2 h-4 bg-[#17c3b2]"></span>
                Your Trust Score
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        <span>Consistency</span>
                        <span className="text-white">85%</span>
                    </div>
                    <div className="h-1 bg-[#111827] rounded-full overflow-hidden">
                        <div className="h-full bg-[color:var(--color-primary)] w-[85%]"></div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        <span>Community</span>
                        <span className="text-white">72%</span>
                    </div>
                    <div className="h-1 bg-[#111827] rounded-full overflow-hidden">
                        <div className="h-full bg-[color:var(--color-primary)] w-[72%]"></div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        <span>Redemption</span>
                        <span className="text-white">94%</span>
                    </div>
                    <div className="h-1 bg-[#111827] rounded-full overflow-hidden">
                        <div className="h-full bg-[#22c55e] w-[94%]"></div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        <span>Volatility</span>
                        <span className="text-white">MODERATE</span>
                    </div>
                    <div className="h-1 bg-[#111827] rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 w-[45%]"></div>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <button disabled className="text-[10px] font-black uppercase text-gray-600 bg-gray-800/30 border border-gray-700/30 px-3 py-1 cursor-not-allowed" title="Coming soon">
                    Generate Proof of Degen — Soon
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
