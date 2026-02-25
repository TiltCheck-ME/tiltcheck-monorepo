/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Casino {
  name: string;
  trustScore?: number;
  grade?: string;
  status?: string;
}

const GRADES = ['A', 'B', 'C', 'D', 'F'] as const;
type Grade = typeof GRADES[number];

const gradeColor: Record<string, string> = {
  A: '#4CAF50', B: '#00FFC6', C: '#FFC107', D: '#FF9800', F: '#ef4444',
};

function scoreToGrade(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

const PLACEHOLDER: Casino[] = [
  { name: 'Stake.com', trustScore: 92 },
  { name: 'Rollbit', trustScore: 81 },
  { name: 'Shuffle', trustScore: 78 },
  { name: 'Roobet', trustScore: 65 },
  { name: 'Duelbits', trustScore: 55 },
  { name: 'WinzO', trustScore: 38 },
  { name: 'Unknown Casino', trustScore: 22 },
];

export default function CasinoGradingPage() {
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Grade | 'ALL'>('ALL');

  useEffect(() => {
    fetch('/api/bonus')
      .then(r => r.json())
      .then((data: Casino[]) => {
        const graded = (Array.isArray(data) ? data : []).map(c => ({
          ...c,
          grade: c.trustScore !== undefined ? scoreToGrade(c.trustScore) : 'C',
        }));
        setCasinos(graded.length ? graded : PLACEHOLDER.map(c => ({ ...c, grade: scoreToGrade(c.trustScore!) })));
      })
      .catch(() => setCasinos(PLACEHOLDER.map(c => ({ ...c, grade: scoreToGrade(c.trustScore!) }))))
      .finally(() => setLoading(false));
  }, []);

  const filtered = casinos.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || c.grade === filter;
    return matchSearch && matchFilter;
  });

  const gradeCounts = GRADES.reduce((acc, g) => {
    acc[g] = casinos.filter(c => c.grade === g).length;
    return acc;
  }, {} as Record<Grade, number>);

  return (
    <main className="min-h-screen bg-[#0E0E0F] pt-12 pb-20">
      <div className="container mx-auto px-6 max-w-5xl">
        <header className="mb-12">
          <Link href="/" className="text-[#00FFC6] text-xs font-bold tracking-widest hover:underline mb-4 inline-block">← RETURN TO HUB</Link>
          <h1 className="text-4xl md:text-5xl font-black font-space text-white tracking-tight mb-2">CASINO GRADING</h1>
          <p className="text-[#6B7280]">Trust scores and grades for tracked casinos</p>
        </header>

        {/* Grade filter pills */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {GRADES.map(g => (
            <button key={g} onClick={() => setFilter(filter === g ? 'ALL' : g)}
              className="bg-[#1A1F24] rounded-xl border p-4 text-center transition-all hover:opacity-90"
              style={{ borderColor: filter === g ? gradeColor[g] : 'rgba(0,255,198,0.05)' }}>
              <div className="text-2xl font-black font-space mb-1" style={{ color: gradeColor[g] }}>{g}</div>
              <div className="text-xs text-[#6B7280] font-bold">{gradeCounts[g] ?? 0}</div>
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="bg-[#1A1F24] rounded-xl border border-[#00FFC6]/10 p-4 mb-6 flex gap-4">
          <input type="text" placeholder="SEARCH CASINOS..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-grow bg-[#0E0E0F] border border-[#00FFC6]/20 rounded px-4 py-3 text-white focus:outline-none focus:border-[#00FFC6] font-space text-sm tracking-tight" />
          <button onClick={() => { setSearch(''); setFilter('ALL'); }}
            className="px-4 py-2 text-xs font-bold text-[#6B7280] hover:text-[#00FFC6] transition-colors">
            CLEAR
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center text-[#6B7280] py-20 font-bold tracking-widest">LOADING...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[#6B7280] py-20 font-bold">NO CASINOS MATCH</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((casino, i) => (
              <div key={i} className="bg-[#1A1F24] rounded-xl border border-[#00FFC6]/5 p-5 flex items-center justify-between hover:border-[#00FFC6]/20 transition-all">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center font-black font-space text-xl"
                    style={{ backgroundColor: `${gradeColor[casino.grade!]}15`, color: gradeColor[casino.grade!] }}>
                    {casino.grade}
                  </div>
                  <div>
                    <div className="text-white font-black font-space tracking-tight">{casino.name}</div>
                    {casino.status && <div className="text-xs text-[#6B7280] mt-0.5">{casino.status}</div>}
                  </div>
                </div>
                <div className="text-right">
                  {casino.trustScore !== undefined && (
                    <div className="text-[#00FFC6] font-black font-space text-xl">{casino.trustScore}</div>
                  )}
                  <div className="text-xs text-[#6B7280] font-bold tracking-widest">TRUST SCORE</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
