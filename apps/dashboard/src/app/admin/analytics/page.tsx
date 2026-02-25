/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';

const METRICS = [
  { label: 'TOTAL USERS', value: '—', note: 'Connect Supabase' },
  { label: 'DAILY ACTIVE', value: '—', note: 'Connect Supabase' },
  { label: 'TRUST SCANS', value: '—', note: 'Connect API' },
  { label: 'LINKS BLOCKED', value: '1.2M+', note: 'All time' },
  { label: 'SERVERS SECURED', value: '150+', note: 'Discord' },
  { label: 'USERS PROTECTED', value: '450K+', note: 'All time' },
];

const TOOLS = [
  { name: 'WALLET CHECK', icon: '🔐', status: 'LIVE', note: 'Security scanning active' },
  { name: 'QUALIFYFIRST', icon: '📋', status: 'LIVE', note: 'Survey matching active' },
  { name: 'COLLECTCLOCK', icon: '⏰', status: 'BETA', note: 'Bonus tracking active' },
  { name: 'SUSLINK', icon: '🔗', status: 'LIVE', note: 'Link scanning active' },
  { name: 'JUSTTHETIP', icon: '💸', status: 'LIVE', note: 'SOL tipping active' },
  { name: 'TILTGUARD', icon: '🛡️', status: 'LIVE', note: 'Extension protection' },
];

const statusColor: Record<string, string> = {
  LIVE: '#4CAF50', BETA: '#FFC107', SOON: '#6B7280',
};

export default function AnalyticsPage() {
  const [tab, setTab] = useState<'overview' | 'tools'>('overview');

  return (
    <main className="min-h-screen bg-[#0E0E0F] pt-12 pb-20">
      <div className="container mx-auto px-6 max-w-5xl">
        <header className="mb-12">
          <Link href="/" className="text-[#00FFC6] text-xs font-bold tracking-widest hover:underline mb-4 inline-block">← RETURN TO HUB</Link>
          <h1 className="text-4xl md:text-5xl font-black font-space text-white tracking-tight mb-2">ANALYTICS</h1>
          <p className="text-[#6B7280]">Platform usage, engagement, and growth metrics</p>
        </header>

        <div className="flex gap-2 mb-8">
          {(['overview', 'tools'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-6 py-2 rounded font-bold text-xs tracking-widest transition-all"
              style={{ backgroundColor: tab === t ? '#00FFC6' : '#1A1F24', color: tab === t ? '#0E0E0F' : '#6B7280' }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {METRICS.map(m => (
                <div key={m.label} className="bg-[#1A1F24] rounded-xl border border-[#00FFC6]/10 p-6">
                  <div className="text-xs font-bold tracking-[0.15em] text-[#6B7280] mb-2">{m.label}</div>
                  <div className="text-3xl font-black font-space text-[#00FFC6] mb-1">{m.value}</div>
                  <div className="text-xs text-[#6B7280]">{m.note}</div>
                </div>
              ))}
            </div>
            <div className="bg-[#1A1F24] rounded-xl border border-[#FFC107]/20 p-6 flex gap-4 items-start">
              <span className="text-2xl">⚡</span>
              <div>
                <div className="text-white font-black font-space mb-1">CONNECT YOUR DATA SOURCES</div>
                <p className="text-[#6B7280] text-sm leading-relaxed">
                  Live metrics require Supabase and the backend API. Set{' '}
                  <code className="text-[#00FFC6] bg-[#0E0E0F] px-1 rounded">SUPABASE_URL</code> and{' '}
                  <code className="text-[#00FFC6] bg-[#0E0E0F] px-1 rounded">NEXT_PUBLIC_API_URL</code> in your environment.
                </p>
              </div>
            </div>
          </>
        )}

        {tab === 'tools' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TOOLS.map(tool => (
              <div key={tool.name} className="bg-[#1A1F24] rounded-xl border border-[#00FFC6]/10 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{tool.icon}</span>
                  <div>
                    <div className="text-white font-black font-space tracking-tight">{tool.name}</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">{tool.note}</div>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded border"
                  style={{ color: statusColor[tool.status], borderColor: `${statusColor[tool.status]}30`, backgroundColor: `${statusColor[tool.status]}10` }}>
                  {tool.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
