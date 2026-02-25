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

interface ServiceStatus {
  name: string;
  status: 'online' | 'degraded' | 'offline' | 'checking';
  latency?: number;
  detail?: string;
}

const statusDot: Record<string, string> = {
  online: '#4CAF50', degraded: '#FFC107', offline: '#ef4444', checking: '#6B7280',
};
const statusLabel: Record<string, string> = {
  online: 'ONLINE', degraded: 'DEGRADED', offline: 'OFFLINE', checking: 'CHECKING...',
};

export default function SystemHealthPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Dashboard API', status: 'checking' },
    { name: 'Casino Data API', status: 'checking' },
    { name: 'QualifyFirst Service', status: 'checking' },
    { name: 'Control Room', status: 'checking' },
  ]);
  const [lastChecked, setLastChecked] = useState('');
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    const checks: ServiceStatus[] = [];

    try {
      const t = Date.now();
      const res = await fetch('/api/health');
      const data = await res.json();
      checks.push({ name: 'Dashboard API', status: res.ok ? 'online' : 'degraded', latency: Date.now() - t, detail: data.version ? `v${data.version}` : undefined });
    } catch { checks.push({ name: 'Dashboard API', status: 'offline', detail: 'Unreachable' }); }

    try {
      const t = Date.now();
      const res = await fetch('/api/bonus');
      checks.push({ name: 'Casino Data API', status: res.ok ? 'online' : 'degraded', latency: Date.now() - t, detail: res.ok ? 'Serving data' : `HTTP ${res.status}` });
    } catch { checks.push({ name: 'Casino Data API', status: 'offline', detail: 'Unreachable' }); }

    try {
      const t = Date.now();
      const res = await fetch('/api/qualify');
      checks.push({ name: 'QualifyFirst Service', status: res.ok ? 'online' : 'degraded', latency: Date.now() - t, detail: res.ok ? 'Survey matching active' : `HTTP ${res.status}` });
    } catch { checks.push({ name: 'QualifyFirst Service', status: 'offline', detail: 'Unreachable' }); }

    try {
      const t = Date.now();
      await fetch('http://localhost:3001/', { mode: 'no-cors' });
      checks.push({ name: 'Control Room', status: 'online', latency: Date.now() - t, detail: 'Port 3001 reachable' });
    } catch { checks.push({ name: 'Control Room', status: 'offline', detail: 'Port 3001 unreachable' }); }

    setServices(checks);
    setLastChecked(new Date().toLocaleTimeString());
    setChecking(false);
  };

  useEffect(() => { checkHealth(); }, []);

  const allOnline = services.every(s => s.status === 'online');
  const anyOffline = services.some(s => s.status === 'offline');
  const overallColor = anyOffline ? '#ef4444' : allOnline ? '#00FFC6' : '#FFC107';
  const overallLabel = anyOffline ? 'DEGRADED' : allOnline ? 'ALL SYSTEMS GO' : 'CHECKING';

  return (
    <main className="min-h-screen bg-[#0E0E0F] pt-12 pb-20">
      <div className="container mx-auto px-6 max-w-4xl">
        <header className="mb-12">
          <Link href="/" className="text-[#00FFC6] text-xs font-bold tracking-widest hover:underline mb-4 inline-block">← RETURN TO HUB</Link>
          <h1 className="text-4xl md:text-5xl font-black font-space text-white tracking-tight mb-2">SYSTEM HEALTH</h1>
          <p className="text-[#6B7280]">Live status of all TiltCheck services</p>
        </header>

        {/* Overall banner */}
        <div className="bg-[#1A1F24] rounded-xl border p-6 mb-8 flex items-center justify-between"
          style={{ borderColor: `${overallColor}40` }}>
          <div className="flex items-center gap-4">
            <span className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: overallColor }} />
            <span className="text-2xl font-black font-space" style={{ color: overallColor }}>{overallLabel}</span>
          </div>
          <div className="text-right text-xs text-[#6B7280]">
            {lastChecked && <div>Last checked: {lastChecked}</div>}
            <button onClick={checkHealth} disabled={checking}
              className="mt-1 text-[#00FFC6] font-bold hover:underline disabled:opacity-50">
              {checking ? 'CHECKING...' : 'REFRESH'}
            </button>
          </div>
        </div>

        {/* Service cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {services.map(svc => (
            <div key={svc.name} className="bg-[#1A1F24] rounded-xl border border-[#00FFC6]/10 p-6 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold tracking-widest text-[#6B7280] mb-1">SERVICE</div>
                <div className="text-white font-black font-space text-lg">{svc.name}</div>
                {svc.detail && <div className="text-xs text-[#6B7280] mt-1">{svc.detail}</div>}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusDot[svc.status] }} />
                  <span className="text-xs font-bold" style={{ color: statusDot[svc.status] }}>{statusLabel[svc.status]}</span>
                </div>
                {svc.latency !== undefined && <div className="text-xs text-[#6B7280]">{svc.latency}ms</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Port map */}
        <div className="bg-[#1A1F24] rounded-xl border border-[#00FFC6]/10 p-8">
          <h2 className="text-xs font-bold tracking-[0.2em] text-[#6B7280] mb-6 uppercase">Port Map</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[['Dashboard','3000'],['Control Room','3001'],['QualifyFirst','3003'],['Casino API','6002']].map(([label, port]) => (
              <div key={port} className="bg-[#0E0E0F] rounded-lg p-4 border border-[#00FFC6]/5">
                <div className="text-[#00FFC6] font-black font-space text-xl mb-1">:{port}</div>
                <div className="text-[#6B7280] text-xs font-bold tracking-widest">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
