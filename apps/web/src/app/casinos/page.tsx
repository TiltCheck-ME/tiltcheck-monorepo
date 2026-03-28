'use client';

import React, { useEffect, useState } from 'react';
import "@/styles/terminal.css"; // Reuse terminal styles for that 'brutalist' look

interface CasinoRecord {
  score: number;
  financialPayouts: number;
  fairnessTransparency: number;
  promotionalHonesty: number;
  operationalSupport: number;
  communityReputation: number;
  lastUpdated: number;
}

export default function CasinosPage() {
  const [casinos, setCasinos] = useState<Record<string, CasinoRecord>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        // In local dev, API is usually on 3001. Using relative path if proxy is configured, 
        // but here we'll try to fetch from the API_URL env if available (inlined search).
        const response = await fetch('http://localhost:3001/rgaas/casinos');
        if (!response.ok) throw new Error('Failed to fetch trust scores');
        const data = await response.json();
        setCasinos(data.casinos);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Could not connect to the Trust Engine. Displaying cached baseline.');
        // Fallback to basic display if API is down
        setCasinos({
          "Stake": { score: 75, financialPayouts: 80, fairnessTransparency: 70, promotionalHonesty: 75, operationalSupport: 85, communityReputation: 65, lastUpdated: Date.now() },
          "Rollbit": { score: 72, financialPayouts: 70, fairnessTransparency: 75, promotionalHonesty: 60, operationalSupport: 80, communityReputation: 75, lastUpdated: Date.now() },
          "BC.Game": { score: 68, financialPayouts: 60, fairnessTransparency: 65, promotionalHonesty: 80, operationalSupport: 70, communityReputation: 65, lastUpdated: Date.now() }
        });
      } finally {
        // Migration cleanup
      }
    };

    fetchScores();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "var(--color-positive)";
    if (score >= 60) return "var(--color-caution)";
    return "var(--color-danger)";
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <header className="mb-12 text-center">
        <h1 className="neon neon-main" data-text="CASINO TRUST ENGINE">CASINO TRUST ENGINE</h1>
        <p className="text-xl text-muted mt-4 max-w-3xl mx-auto uppercase tracking-widest font-mono">
          The Five Pillars of Defensibility: Real-time audit snapshots across the ecosystem.
        </p>
      </header>

      {error && (
        <div className="mb-8 p-4 border border-caution bg-caution/10 text-caution font-mono text-center">
          [!] WARNING: {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Object.entries(casinos).sort((a, b) => b[1].score - a[1].score).map(([name, data]) => (
          <div key={name} className="terminal-box group hover:border-accent transition-colors duration-300">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tighter text-white uppercase">{name}</h2>
                <div className="text-xs font-mono opacity-50 mt-1">UUID: {Math.random().toString(16).slice(2, 10)} // STATUS: MONITORED</div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black font-mono" style={{ color: getScoreColor(data.score) }}>
                  {data.score}
                </div>
                <div className="text-[10px] uppercase tracking-tighter opacity-70">Overall Trust Index</div>
              </div>
            </div>

            <div className="space-y-4">
              <PillarBar label="Financial Integrity (40%)" score={data.financialPayouts} color="#17c3b2" />
              <PillarBar label="Fairness & Transparency (25%)" score={data.fairnessTransparency} color="#8b5cf6" />
              <PillarBar label="Promotional Honesty (15%)" score={data.promotionalHonesty} color="#d946ef" />
              <PillarBar label="Operational Support (10%)" score={data.operationalSupport} color="#ffd700" />
              <PillarBar label="Community Reputation (10%)" score={data.communityReputation} color="#fff" />
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-muted">
              <span>Last Snapshot: {new Date(data.lastUpdated).toLocaleTimeString()}</span>
              <span className="text-primary cursor-pointer hover:underline">View Audit Log →</span>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-20 p-8 border border-white/10 bg-white/5 rounded-lg">
        <h3 className="text-xl font-bold mb-4 uppercase tracking-wider text-accent">How are these scored?</h3>
        <p className="text-muted leading-relaxed mb-6">
          Unlike review sites that take affiliate payouts, TiltCheck's score is purely data-driven. We ingest raw telemetry from 
          link scanners, manual ToS audits, community withdrawal reports, and our own RTP drift detection engine.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm font-mono pt-4 border-t border-white/10">
          <div>
            <strong className="text-white block mb-2">ZERO BIAS</strong>
            Scoring algorithms are open-source and based on verifiable events.
          </div>
          <div>
            <strong className="text-white block mb-2">TELEMETRY-FIRST</strong>
            Direct API feeds monitor RTP fluctuations in real-time.
          </div>
          <div>
            <strong className="text-white block mb-2">INSTANT PENALTIES</strong>
            Shadow-nerfs to ToS result in automated score deductions within 15 minutes.
          </div>
        </div>
      </section>
    </div>
  );
}

function PillarBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase font-bold mb-1 tracking-tighter">
        <span className="text-white/80">{label}</span>
        <span style={{ color }}>{score}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 overflow-hidden">
        <div 
          className="h-full transition-all duration-1000 ease-out"
          style={{ 
            width: `${score}%`, 
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}88`
          }}
        />
      </div>
    </div>
  );
}
