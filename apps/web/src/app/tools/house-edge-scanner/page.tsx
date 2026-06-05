/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
"use client";
import React, { useState } from 'react';
import ToolPageHeader from '@/components/ToolPageHeader';
import Link from 'next/link';

function calcGreedPremium(certifiedRtp: number, observedRtp: number, totalWagered: number) {
  const delta = certifiedRtp - observedRtp;
  const greedPremiumPer100 = delta;
  const totalOvercharge = (delta / 100) * totalWagered;
  return { delta, greedPremiumPer100, totalOvercharge };
}

function confidenceLabel(spins: number) {
  if (spins < 100) return { label: 'LOW — too few spins for statistical significance', color: '#ef4444' };
  if (spins < 500) return { label: 'MODERATE — directional signal only', color: '#ffd700' };
  if (spins < 2000) return { label: 'SOLID — meaningful sample', color: '#17c3b2' };
  return { label: 'HIGH — statistically robust', color: '#22c55e' };
}

export default function HouseEdgeScannerPage() {
  const [form, setForm] = useState({
    gameName: '',
    certifiedRtp: '',
    observedRtp: '',
    totalWagered: '',
    spinCount: '',
  });
  const [result, setResult] = useState<ReturnType<typeof calcGreedPremium> | null>(null);
  const [confidence, setConfidence] = useState<ReturnType<typeof confidenceLabel> | null>(null);

  const handleCalc = (e: React.FormEvent) => {
    e.preventDefault();
    const certified = parseFloat(form.certifiedRtp);
    const observed = parseFloat(form.observedRtp);
    const wagered = parseFloat(form.totalWagered);
    const spins = parseInt(form.spinCount) || 0;
    if (isNaN(certified) || isNaN(observed) || isNaN(wagered)) return;
    setResult(calcGreedPremium(certified, observed, wagered));
    setConfidence(confidenceLabel(spins));
  };

  const reset = () => {
    setResult(null);
    setConfidence(null);
    setForm({ gameName: '', certifiedRtp: '', observedRtp: '', totalWagered: '', spinCount: '' });
  };

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <ToolPageHeader
        centered
        eyebrow="RTP forensics"
        title="The Delta Engine"
        description={
          <>
            Certified RTP vs what your session returned — gap in dollars.{' '}
            <Link href="/tools/session-stats" className="text-[#17c3b2] hover:underline">
              Slot tier spreads
            </Link>
            .
          </>
        }
      />

      <section className="py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Greed Premium Calculator</h2>
          <p className="text-gray-500 font-mono text-xs mb-8 uppercase tracking-widest">
            Manual input. Enter what the casino claims vs what you actually observed.
          </p>

          {!result ? (
            <form onSubmit={handleCalc} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 font-mono">Game (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Gates of Olympus"
                  value={form.gameName}
                  onChange={e => setForm(f => ({ ...f, gameName: e.target.value }))}
                  className="bg-black border border-[#283347] px-4 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#17c3b2] transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 font-mono">Certified RTP (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="50"
                    max="100"
                    required
                    placeholder="e.g. 96.5"
                    value={form.certifiedRtp}
                    onChange={e => setForm(f => ({ ...f, certifiedRtp: e.target.value }))}
                    className="bg-black border border-[#283347] px-4 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#17c3b2] transition-colors"
                  />
                  <p className="text-[10px] text-gray-600 font-mono">From GLI/eCOGRA cert or casino game info page.</p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 font-mono">Your Observed RTP (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="200"
                    required
                    placeholder="e.g. 91.8"
                    value={form.observedRtp}
                    onChange={e => setForm(f => ({ ...f, observedRtp: e.target.value }))}
                    className="bg-black border border-[#283347] px-4 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#17c3b2] transition-colors"
                  />
                  <p className="text-[10px] text-gray-600 font-mono">(Total returned / Total wagered) × 100</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 font-mono">Total Wagered ($)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 500"
                    value={form.totalWagered}
                    onChange={e => setForm(f => ({ ...f, totalWagered: e.target.value }))}
                    className="bg-black border border-[#283347] px-4 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#17c3b2] transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 font-mono">Number of Spins</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 350"
                    value={form.spinCount}
                    onChange={e => setForm(f => ({ ...f, spinCount: e.target.value }))}
                    className="bg-black border border-[#283347] px-4 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#17c3b2] transition-colors"
                  />
                  <p className="text-[10px] text-gray-600 font-mono">Used for confidence scoring. Optional.</p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[#17c3b2] text-black font-black text-sm uppercase tracking-widest hover:bg-[#48d5c6] transition-colors"
              >
                Calculate Greed Premium
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-6">
              {form.gameName && (
                <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                  Game: <span className="text-white font-bold">{form.gameName}</span>
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 border border-[#283347] bg-black/60 flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Certified RTP</span>
                  <span className="text-2xl font-black text-white">{form.certifiedRtp}%</span>
                </div>
                <div className="p-5 border border-[#283347] bg-black/60 flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Observed RTP</span>
                  <span className="text-2xl font-black text-white">{form.observedRtp}%</span>
                </div>
                <div className="p-5 border border-[#ef4444]/50 bg-[#ef4444]/10 flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-[#ef4444] uppercase tracking-widest">Delta</span>
                  <span className="text-2xl font-black text-[#ef4444]">
                    {result.delta >= 0 ? '-' : '+'}{Math.abs(result.delta).toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="p-6 border border-[#ef4444]/40 bg-[#ef4444]/5 flex flex-col gap-3">
                <span className="text-[10px] font-mono text-[#ef4444] uppercase tracking-widest">Greed Premium</span>
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div>
                    <span className="text-4xl font-black text-[#ef4444]">
                      ${Math.abs(result.greedPremiumPer100).toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-400 font-mono ml-2">per $100 wagered</span>
                  </div>
                  <div className="text-gray-400 font-mono text-sm">
                    Total overcharge on ${form.totalWagered}: <span className="text-[#ef4444] font-bold">${Math.abs(result.totalOvercharge).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {confidence && (
                <div className="p-4 border border-[#283347] bg-black/40 font-mono text-xs flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: confidence.color }}></span>
                  <div>
                    <span className="uppercase tracking-widest font-black" style={{ color: confidence.color }}>Confidence: </span>
                    <span className="text-gray-400">{confidence.label}</span>
                  </div>
                </div>
              )}

              <button
                onClick={reset}
                className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors font-mono border border-[#283347] py-3"
              >
                Run Another Calculation
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

