/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
import React from 'react';
import Link from 'next/link';
import ToolPageHeader from '@/components/ToolPageHeader';
import rtpData from '@data/provider-master-rtp.json';

export default function RtpPage() {
  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <ToolPageHeader
        centered
        eyebrow="RTP intel"
        title="Certified RTP database"
        description={
          <>
            GLI / eCOGRA / BMM tier anchors for the Delta Engine. Greed Premium = max minus min tier.{' '}
            <Link href="/tools/house-edge-scanner" className="text-[#17c3b2] hover:underline">
              Run session math
            </Link>
            {' · '}
            <Link href="/tools/session-stats" className="text-[#17c3b2] hover:underline">
              Drift monitor
            </Link>
            .
          </>
        }
      />

      <section className="py-10 px-4">
        <div className="max-w-6xl mx-auto space-y-12">
          {rtpData.providers.map((provider) => (
            <div key={provider.providerName}>
              <h2 className="text-lg font-black uppercase tracking-tight mb-4 text-[#17c3b2] border-b border-[#283347] pb-3">
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
                        <td className="py-3 px-4 text-gray-500 text-xs">{game.certifiedTiers.map((t) => `${t}%`).join(' / ')}</td>
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
    </main>
  );
}
