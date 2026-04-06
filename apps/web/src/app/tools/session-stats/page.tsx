/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06 */
import React from 'react';
import rtpData from '../../../../../../data/provider-master-rtp.json';

interface GameEntry {
  gameTitle: string;
  providerName: string;
  maxRtp: number;
  minRtp: number;
  certifiedBy: string;
  greedPremium: number;
}

function buildGameList(): GameEntry[] {
  const entries: GameEntry[] = [];

  for (const provider of rtpData.providers) {
    for (const game of provider.games) {
      entries.push({
        gameTitle: game.gameTitle,
        providerName: provider.providerName,
        maxRtp: game.maxRtp,
        minRtp: game.minRtp,
        certifiedBy: game.certifiedBy,
        greedPremium: parseFloat((game.maxRtp - game.minRtp).toFixed(2)),
      });
    }
  }

  return entries.sort((a, b) => b.greedPremium - a.greedPremium);
}

function getRiskLabel(premium: number): { label: string; color: string } {
  if (premium >= 8) return { label: 'HIGH RISK', color: '#ef4444' };
  if (premium >= 4) return { label: 'ELEVATED', color: '#ffd700' };
  return { label: 'STANDARD', color: '#17c3b2' };
}

export default function SessionStatsPage() {
  const games = buildGameList();

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#283347] py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">TILT TELEMETRY</p>
          <h1 className="neon neon-main text-5xl md:text-7xl mb-6" data-text="THE NERF RADAR">
            THE NERF RADAR
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono">
            Slot providers certify games at multiple RTP tiers. Casinos pick which tier to deploy. This table shows the maximum legal gap between the best and worst certified tier — the range a casino can legally exploit without disclosing it.
          </p>
        </div>
      </section>

      <section className="py-8 px-4 bg-[#ffd700]/5 border-b border-[#ffd700]/20">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm font-mono text-[#ffd700]">
            <strong>Greed Premium</strong> = Max Certified RTP minus Min Certified RTP. If a casino deploys the minimum tier, this is the extra edge they silently take from you per session.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black uppercase tracking-tight">
              {games.length} Games Indexed — Sorted by Greed Premium
            </h2>
            <span className="text-xs font-mono text-gray-500 uppercase">Source: GLI / eCOGRA / BMM Lab Certifications</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#283347]">
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-gray-500">Game</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-widest text-gray-500">Provider</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-widest text-gray-500">Max RTP</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-widest text-gray-500">Min RTP</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-widest text-gray-500">Greed Premium</th>
                  <th className="text-center py-3 px-4 text-xs uppercase tracking-widest text-gray-500">Risk</th>
                  <th className="text-center py-3 px-4 text-xs uppercase tracking-widest text-gray-500">Cert</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game, i) => {
                  const risk = getRiskLabel(game.greedPremium);
                  return (
                    <tr
                      key={i}
                      className="border-b border-[#283347]/50 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 text-white font-bold">{game.gameTitle}</td>
                      <td className="py-3 px-4 text-gray-400">{game.providerName}</td>
                      <td className="py-3 px-4 text-right text-[#17c3b2]">{game.maxRtp.toFixed(2)}%</td>
                      <td className="py-3 px-4 text-right text-gray-400">{game.minRtp.toFixed(2)}%</td>
                      <td className="py-3 px-4 text-right font-black" style={{ color: risk.color }}>
                        {game.greedPremium > 0 ? `+${game.greedPremium.toFixed(2)}%` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className="text-[10px] font-black uppercase tracking-widest px-2 py-1 border"
                          style={{ color: risk.color, borderColor: risk.color + '40' }}
                        >
                          {risk.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-500 text-xs">{game.certifiedBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 border-t border-[#283347] bg-black/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black uppercase mb-8 text-[#17c3b2]">What this means for you</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-400">
            <div className="p-6 border border-[#ef4444]/20 bg-[#ef4444]/5">
              <h3 className="font-black uppercase text-[#ef4444] mb-3">High Risk (8%+)</h3>
              <p>The casino can legally run this game at a tier that costs you an extra $8 or more per $100 wagered above what the max-tier version would. You will not be told which tier is active.</p>
            </div>
            <div className="p-6 border border-[#ffd700]/20 bg-[#ffd700]/5">
              <h3 className="font-black uppercase text-[#ffd700] mb-3">Elevated (4–8%)</h3>
              <p>Meaningful variance in deployed tiers. Whether you're playing the best or worst version of this game is unknown to you without external telemetry.</p>
            </div>
            <div className="p-6 border border-[#17c3b2]/20 bg-[#17c3b2]/5">
              <h3 className="font-black uppercase text-[#17c3b2] mb-3">Standard (0–4%)</h3>
              <p>Limited tier flexibility. The game still has a house edge, but the operator has less room to extract a silent premium above the certified base.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 border-t border-[#283347] text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black uppercase mb-4">Know Before You Spin</h2>
          <p className="text-gray-400 mb-8">
            The Delta Engine will cross-reference your live session against these certified tiers in real-time. Until then, use this table to understand which games carry the most deployment risk.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/tools/house-edge-scanner" className="btn btn-primary py-3 px-6 font-black">
              Delta Engine (Coming Soon)
            </a>
            <a href="/extension" className="btn btn-secondary py-3 px-6 font-black">
              Deploy the Audit Layer
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
