/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06 */
import React from 'react';
import rtpData from '../../../../../../data/provider-master-rtp.json';

export default function RtpPage() {
  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#283347] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">RTP INTEL</p>
          <h1 className="neon neon-main text-5xl mb-6" data-text="LIVE RTP LOGS">
            LIVE RTP LOGS
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono">
            Manufacturer-certified RTP tiers sourced from GLI, eCOGRA, and BMM lab certifications.
            These are the numbers slot providers certify before a game ships — the anchors the Delta Engine compares live sessions against.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto space-y-16">
          {rtpData.providers.map((provider) => (
            <div key={provider.providerName}>
              <h2 className="text-xl font-black uppercase tracking-tight mb-6 text-[#17c3b2] border-b border-[#283347] pb-4">
                {provider.providerName}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-[#283347]">
                      <th className="text-left py-2 px-4 text-xs uppercase tracking-widest text-gray-500">Game</th>
                      <th className="text-right py-2 px-4 text-xs uppercase tracking-widest text-gray-500">Max RTP</th>
                      <th className="text-right py-2 px-4 text-xs uppercase tracking-widest text-gray-500">Min RTP</th>
                      <th className="text-left py-2 px-4 text-xs uppercase tracking-widest text-gray-500">All Tiers</th>
                      <th className="text-center py-2 px-4 text-xs uppercase tracking-widest text-gray-500">Cert Body</th>
                      <th className="text-center py-2 px-4 text-xs uppercase tracking-widest text-gray-500">Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {provider.games.map((game) => (
                      <tr key={game.gameSlug} className="border-b border-[#283347]/50 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-white font-bold">{game.gameTitle}</td>
                        <td className="py-3 px-4 text-right text-[#17c3b2]">{game.maxRtp.toFixed(2)}%</td>
                        <td className="py-3 px-4 text-right text-gray-400">{game.minRtp.toFixed(2)}%</td>
                        <td className="py-3 px-4 text-gray-500 text-xs">{game.certifiedTiers.map(t => `${t}%`).join(' / ')}</td>
                        <td className="py-3 px-4 text-center text-gray-500">{game.certifiedBy}</td>
                        <td className="py-3 px-4 text-center text-gray-600">{game.certifiedYear}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 px-4 border-t border-[#283347] text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-500 text-sm font-mono mb-6">
            Real-time platform RTP monitoring is in development. The Delta Engine will cross-reference live sessions against these certified tiers automatically.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/tools/session-stats" className="btn btn-primary py-3 px-6 font-black">
              View Nerf Radar (RTP Spread Table)
            </a>
            <a href="/tools/house-edge-scanner" className="btn btn-secondary py-3 px-6 font-black">
              Delta Engine (Coming Soon)
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

