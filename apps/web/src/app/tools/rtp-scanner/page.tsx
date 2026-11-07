/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import ToolPageHeader from '@/components/ToolPageHeader';
import BrandTagline from '@/components/BrandTagline';
import {
  getAllIndexedGames,
  getIndexedProviders,
  getFeaturedOperators,
  findOperatorDeployment,
  buildBleedComparisons,
  simulateSessionLoss,
  type MasterGame,
} from '@/lib/slot-rtp-scanner';

const IN_GAME_CHECK_GUIDES: Record<string, { steps: string; tip: string }> = {
  'Pragmatic Play': {
    steps: 'Click the (i) icon in the bottom-left corner of the game window. Scroll through the rules pages to the very last page. Look for the concluding paragraph: "The theoretical return to player for this game is XX.XX%".',
    tip: 'Pragmatic games legally must state the exact active RTP configured by the operator on the last rules slide.',
  },
  'Hacksaw Gaming': {
    steps: 'Click the hamburger menu (three horizontal lines) in the bottom-left or bottom-right corner. Select "(?) Game Rules". A popup documentation window will appear. Scroll to the "Theoretical Payout" section.',
    tip: 'Hacksaw displays the specific RTP tier (96%, 94%, or 92%) configured for your casino session.',
  },
  'NoLimit City': {
    steps: 'Click the Settings Gear icon in the bottom navigation tray. Click "Game Info" or "(?)". Scroll down to the RTP declaration line item.',
    tip: 'NoLimit games feature extreme volatility; lowered tiers multiply bankroll drawdown dramatically.',
  },
  "Play'n GO": {
    steps: 'Click the small (?) icon at the very bottom edge of the game iframe. A technical specification document will open in a modal. Search or scan for "The theoretical return to player is".',
    tip: 'Play\'n GO offers the widest spread of operator tiers, down to 84% in grey-market installations.',
  },
};

export default function SlotRtpScannerPage() {
  const allGames = useMemo(() => getAllIndexedGames(), []);
  const allProviders = useMemo(() => ['ALL', ...getIndexedProviders()], []);
  const featuredOperators = useMemo(() => getFeaturedOperators(), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('ALL');
  const [selectedOperatorName, setSelectedOperatorName] = useState('Stake.us');
  const [selectedGameSlug, setSelectedGameSlug] = useState('gates-of-olympus');

  const [betSize, setBetSize] = useState<number>(1.0);
  const [spinCount, setSpinCount] = useState<number>(1000);
  const [selectedTierOverride, setSelectedTierOverride] = useState<number | null>(null);

  // Filtered games catalog
  const filteredGames = useMemo(() => {
    return allGames.filter((game) => {
      const matchesProvider =
        selectedProvider === 'ALL' || game.providerName === selectedProvider;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        game.gameTitle.toLowerCase().includes(q) ||
        game.providerName.toLowerCase().includes(q);
      return matchesProvider && matchesQuery;
    });
  }, [allGames, selectedProvider, searchQuery]);

  // Selected game
  const activeGame: MasterGame = useMemo(() => {
    const found = allGames.find((g) => g.gameSlug === selectedGameSlug);
    return found || allGames[0]!;
  }, [allGames, selectedGameSlug]);

  // Deployed operator info
  const operatorProfile = useMemo(() => {
    return findOperatorDeployment(selectedOperatorName);
  }, [selectedOperatorName]);

  // Tiers breakdown
  const tiersBreakdown = useMemo(() => {
    return buildBleedComparisons(activeGame.maxRtp, activeGame.certifiedTiers);
  }, [activeGame]);

  // Active simulated tier
  const activeSimTier = useMemo(() => {
    if (selectedTierOverride !== null && activeGame.certifiedTiers.includes(selectedTierOverride)) {
      return selectedTierOverride;
    }
    // Default to a lowered tier if available, otherwise minRtp
    if (activeGame.certifiedTiers.length > 1) {
      return activeGame.certifiedTiers[1]!;
    }
    return activeGame.minRtp;
  }, [activeGame, selectedTierOverride]);

  // Simulation results
  const simulation = useMemo(() => {
    return simulateSessionLoss(betSize, spinCount, activeGame.maxRtp, activeSimTier);
  }, [betSize, spinCount, activeGame.maxRtp, activeSimTier]);

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <ToolPageHeader
        centered
        eyebrow="RTP Forensics & Downgrade Scanner"
        title="Live Slot RTP Downgrade Scanner"
        description={
          <>
            Providers (Pragmatic, Hacksaw, NoLimit) ship slots with multiple RTP tiers (e.g. 96.5% vs 94.2% vs 88.5%). Shady operators quietly pick the lowest tier without telling the player. Search any title, inspect your casino&apos;s deployment profile, and calculate the hidden Greed Tax on your bankroll.{' '}
            <Link href="/tools/session-stats" className="text-[#17c3b2] hover:underline">
              Slot Math Index
            </Link>
            {' · '}
            <Link href="/casinos" className="text-[#17c3b2] hover:underline">
              Casino Trust Directory
            </Link>
            .
          </>
        }
      />

      <section className="py-8 px-4 border-b border-[#283347] bg-[#0d1017]">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Controls: Search, Provider Filter, Casino Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 font-mono">
                Search Slot Title
              </label>
              <input
                type="text"
                placeholder="Search slot name (e.g. Olympus, Sweet Bonanza, Wanted, Mental)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border border-[#283347] px-4 py-2.5 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#17c3b2] transition-colors rounded-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 font-mono">
                Select Your Casino
              </label>
              <select
                value={selectedOperatorName}
                onChange={(e) => setSelectedOperatorName(e.target.value)}
                className="w-full bg-black border border-[#283347] px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#17c3b2] transition-colors"
              >
                {featuredOperators.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} {c.audited ? '[Audited]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Provider Pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {allProviders.map((prov) => (
              <button
                key={prov}
                type="button"
                onClick={() => setSelectedProvider(prov)}
                className={`px-3 py-1 text-xs font-mono font-bold tracking-wider uppercase transition-colors border ${
                  selectedProvider === prov
                    ? 'bg-[#17c3b2] text-black border-[#17c3b2]'
                    : 'bg-black text-gray-400 border-[#283347] hover:border-gray-500 hover:text-white'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Analysis Section */}
      <section className="py-10 px-4">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Active Slot Card & Casino Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Slot Specs */}
            <div className="lg:col-span-2 bg-[#0f121a] border border-[#283347] p-6 space-y-6">
              <div className="flex flex-wrap justify-between items-start gap-4 border-b border-[#283347] pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#17c3b2] block mb-1">
                    {activeGame.providerName}
                  </span>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                    {activeGame.gameTitle}
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-gray-500 uppercase block">Certified Lab</span>
                  <span className="text-sm font-mono font-bold text-gray-300">
                    {activeGame.certifiedBy} ({activeGame.certifiedYear})
                  </span>
                </div>
              </div>

              {/* Tiers Grid */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-mono text-gray-400">
                  <span className="uppercase font-bold tracking-wider">Manufacturer Certified Tiers</span>
                  <span>Click tier to simulate loss</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {tiersBreakdown.map((item, idx) => {
                    const isMax = idx === 0;
                    const isSelected = activeSimTier === item.tier;

                    return (
                      <button
                        key={item.tier}
                        type="button"
                        onClick={() => setSelectedTierOverride(item.tier)}
                        className={`text-left p-3 border transition-all ${
                          isSelected
                            ? 'border-[#17c3b2] bg-[#17c3b2]/10 ring-1 ring-[#17c3b2]'
                            : isMax
                            ? 'border-gray-700 bg-black/40 hover:border-gray-500'
                            : 'border-red-900/40 bg-black/40 hover:border-red-600/60'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span
                            className={`text-base font-black font-mono ${
                              isMax ? 'text-[#17c3b2]' : 'text-orange-400'
                            }`}
                          >
                            {item.tier.toFixed(2)}%
                          </span>
                          {isMax ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#17c3b2]/20 text-[#17c3b2] uppercase font-bold">
                              MAX
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-red-900/30 text-red-400 uppercase font-bold">
                              +{item.bleedIncreasePercent}% Bleed
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-gray-400">
                          Edge: {item.houseEdge.toFixed(2)}%
                        </div>
                        <div className="text-[10px] font-mono text-gray-500 mt-1">
                          Loss/$1k: ${item.lossPer1000Wagered.toFixed(2)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* In-Game Check Helper */}
              {IN_GAME_CHECK_GUIDES[activeGame.providerName] && (
                <div className="bg-black/60 border border-gray-800 p-4 space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-[#17c3b2] font-black flex items-center gap-2">
                    How to verify live RTP inside {activeGame.providerName} slots
                  </div>
                  <p className="text-xs font-mono text-gray-300 leading-relaxed">
                    {IN_GAME_CHECK_GUIDES[activeGame.providerName]?.steps}
                  </p>
                  <p className="text-[11px] font-mono text-gray-500 italic">
                    Note: {IN_GAME_CHECK_GUIDES[activeGame.providerName]?.tip}
                  </p>
                </div>
              )}
            </div>

            {/* Operator Deployment Card */}
            <div className="bg-[#0f121a] border border-[#283347] p-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-[#283347] pb-3">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 block mb-1">
                    Operator Deployment Profile
                  </span>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">
                    {selectedOperatorName}
                  </h3>
                </div>

                {operatorProfile ? (
                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-gray-500 uppercase tracking-widest block text-[10px]">Category</span>
                      <span className="text-white font-bold">{operatorProfile.category}</span>
                    </div>

                    <div>
                      <span className="text-gray-500 uppercase tracking-widest block text-[10px]">Trust Grade</span>
                      <span
                        className={`font-black ${
                          operatorProfile.grade.startsWith('A')
                            ? 'text-[#17c3b2]'
                            : operatorProfile.grade.startsWith('B')
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }`}
                      >
                        Grade {operatorProfile.grade} ({operatorProfile.risk} Risk)
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 uppercase tracking-widest block text-[10px]">Verified Slot Setup</span>
                      <p className="text-gray-300 mt-1 leading-relaxed text-[11px]">
                        {operatorProfile.rtpSlots || 'Operator does not disclose manufacturer slot configurations.'}
                      </p>
                    </div>

                    {operatorProfile.rtpSummary && (
                      <div>
                        <span className="text-gray-500 uppercase tracking-widest block text-[10px]">Reported Summary</span>
                        <p className="text-gray-400 text-[11px] mt-0.5">{operatorProfile.rtpSummary}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-gray-500">
                    No verified deployment profile on record for this operator.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-[#283347]">
                <Link
                  href="/casinos"
                  className="block text-center w-full py-2 bg-white/5 hover:bg-white/10 text-xs font-mono font-bold tracking-wider uppercase text-[#17c3b2] border border-[#17c3b2]/30 transition-colors"
                >
                  View Full Casino Audit &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Interactive Greed Tax Simulator */}
          <div className="bg-[#0f121a] border border-[#283347] p-6 space-y-6">
            <div className="border-b border-[#283347] pb-4">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-400 block mb-1">
                Forensic Bankroll Simulator
              </span>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">
                The Hidden Casino &ldquo;Greed Tax&rdquo;
              </h3>
              <p className="text-xs font-mono text-gray-400 mt-1">
                See exactly how much extra money you surrender over time when playing {activeGame.gameTitle} on a lowered RTP tier ({activeSimTier.toFixed(2)}%) vs the certified maximum ({activeGame.maxRtp.toFixed(2)}%).
              </p>
            </div>

            {/* Inputs: Bet Size & Spins */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              <div className="space-y-2">
                <label className="text-[11px] font-mono font-black uppercase tracking-wider text-gray-400">
                  Bet Per Spin ($)
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="0.10"
                  max="500"
                  value={betSize}
                  onChange={(e) => setBetSize(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  className="w-full bg-black border border-[#283347] px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#17c3b2]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-black uppercase tracking-wider text-gray-400">
                  Total Spins
                </label>
                <input
                  type="number"
                  step="100"
                  min="10"
                  max="100000"
                  value={spinCount}
                  onChange={(e) => setSpinCount(Math.max(10, parseInt(e.target.value) || 10))}
                  className="w-full bg-black border border-[#283347] px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#17c3b2]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-black uppercase tracking-wider text-gray-400">
                  Total Volume Wagered
                </label>
                <div className="w-full bg-black/60 border border-gray-800 px-3 py-2 text-sm font-mono text-white font-bold">
                  ${simulation.totalWagered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-black uppercase tracking-wider text-gray-400">
                  Selected Deployed Tier
                </label>
                <select
                  value={activeSimTier}
                  onChange={(e) => setSelectedTierOverride(parseFloat(e.target.value))}
                  className="w-full bg-black border border-[#283347] px-3 py-2 text-sm font-mono text-orange-400 focus:outline-none focus:border-[#17c3b2]"
                >
                  {activeGame.certifiedTiers.map((t) => (
                    <option key={t} value={t}>
                      {t.toFixed(2)}% {t === activeGame.maxRtp ? '(Max Certified)' : `(Lowered)`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Readout Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-black/50 border border-gray-800 p-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">
                  Loss at Max RTP ({activeGame.maxRtp.toFixed(2)}%)
                </div>
                <div className="text-xl font-mono font-bold text-gray-300">
                  -${simulation.maxRtpExpectedLoss.toFixed(2)}
                </div>
                <div className="text-[10px] font-mono text-gray-500 mt-1">
                  Baseline house edge: {(100 - activeGame.maxRtp).toFixed(2)}%
                </div>
              </div>

              <div className="bg-black/50 border border-gray-800 p-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400/80 mb-1">
                  Loss at Deployed Tier ({activeSimTier.toFixed(2)}%)
                </div>
                <div className="text-xl font-mono font-bold text-orange-400">
                  -${simulation.deployedRtpExpectedLoss.toFixed(2)}
                </div>
                <div className="text-[10px] font-mono text-gray-500 mt-1">
                  Deployed house edge: {(100 - activeSimTier).toFixed(2)}%
                </div>
              </div>

              <div className="bg-red-950/20 border border-red-900/50 p-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-red-400 mb-1">
                  Hidden Casino Greed Tax
                </div>
                <div className="text-2xl font-mono font-black text-red-500">
                  {simulation.greedTaxLoss > 0 ? `-$${simulation.greedTaxLoss.toFixed(2)}` : '$0.00'}
                </div>
                <div className="text-[10px] font-mono text-red-400/80 mt-1">
                  {simulation.greedTaxLoss > 0
                    ? `Pure extra edge extracted from your bankroll.`
                    : 'Selected tier matches certified max.'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick-Pick Games Catalog */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-[#283347] pb-3">
              <h3 className="text-lg font-black uppercase tracking-tight text-white">
                Indexed Slot Titles ({filteredGames.length})
              </h3>
              <span className="text-xs font-mono text-gray-500 uppercase">
                Click any slot to scan tiers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredGames.map((game) => {
                const spread = Math.round((game.maxRtp - game.minRtp) * 100) / 100;
                const isCurrent = game.gameSlug === activeGame.gameSlug;

                return (
                  <button
                    key={`${game.providerName}-${game.gameSlug}`}
                    type="button"
                    onClick={() => {
                      setSelectedGameSlug(game.gameSlug);
                      setSelectedTierOverride(null);
                    }}
                    className={`text-left p-3.5 border transition-all ${
                      isCurrent
                        ? 'border-[#17c3b2] bg-[#17c3b2]/10 ring-1 ring-[#17c3b2]'
                        : 'border-[#283347] bg-[#0f121a] hover:border-gray-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-sm font-mono font-bold text-white line-clamp-1">
                        {game.gameTitle}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-black border border-gray-800 text-gray-400 whitespace-nowrap ml-2">
                        {game.maxRtp.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-mono text-gray-400">
                      <span>{game.providerName}</span>
                      <span className={spread > 4 ? 'text-red-400' : 'text-gray-500'}>
                        {game.certifiedTiers.length} Tiers (Spread: -{spread.toFixed(1)}%)
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-8 border-t border-[#283347] text-center">
            <BrandTagline />
          </div>
        </div>
      </section>
    </main>
  );
}
