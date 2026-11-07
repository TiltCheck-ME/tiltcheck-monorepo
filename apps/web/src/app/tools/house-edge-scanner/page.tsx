// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-06
"use client";
import React, { useState, useMemo } from 'react';
import ToolPageHeader from '@/components/ToolPageHeader';
import Link from 'next/link';
import {
  calculateRtpDelta,
  calculateVipCompCost,
  CASINO_VIP_PROGRAMS,
  GAME_HOUSE_EDGE_PRESETS,
  type CasinoVipProgram,
  type GameHouseEdgePreset,
  type VipTierDef,
} from '@/lib/vip-comp-engine';

type ScannerMode = 'vip' | 'delta';

export default function HouseEdgeScannerPage() {
  const [activeMode, setActiveMode] = useState<ScannerMode>('vip');

  // VIP Scanner State
  const [selectedCasinoId, setSelectedCasinoId] = useState<string>('stake');
  const [selectedTierId, setSelectedTierId] = useState<string>('stake-plat1');
  const [selectedGamePresetId, setSelectedGamePresetId] = useState<string>('slots-max-rtp');

  // Custom inputs for VIP calculation
  const [currentWager, setCurrentWager] = useState<number>(100000); // e.g. Gold level on Stake
  const [targetWager, setTargetWager] = useState<number>(250000); // e.g. Plat I on Stake
  const [expectedReward, setExpectedReward] = useState<number>(220);
  const [customEdge, setCustomEdge] = useState<number>(3.5);
  const [gameWeighting, setGameWeighting] = useState<number>(100);
  const [betSize, setBetSize] = useState<number>(2.0);

  // Delta Engine State
  const [deltaGameName, setDeltaGameName] = useState('');
  const [certifiedRtp, setCertifiedRtp] = useState('96.5');
  const [observedRtp, setObservedRtp] = useState('91.8');
  const [totalWagered, setTotalWagered] = useState('500');
  const [spinCount, setSpinCount] = useState('350');
  const [deltaResultActive, setDeltaResultActive] = useState(false);

  // Casino program lookup
  const currentCasino = useMemo<CasinoVipProgram>(() => {
    return CASINO_VIP_PROGRAMS.find((c) => c.casinoId === selectedCasinoId) || CASINO_VIP_PROGRAMS[0];
  }, [selectedCasinoId]);

  // Handle casino change
  const handleCasinoChange = (casinoId: string) => {
    setSelectedCasinoId(casinoId);
    const prog = CASINO_VIP_PROGRAMS.find((c) => c.casinoId === casinoId) || CASINO_VIP_PROGRAMS[0];
    const defaultTier = prog.tiers[prog.tiers.length > 2 ? 2 : 0];
    setSelectedTierId(defaultTier.tierId);
    setTargetWager(defaultTier.cumulativeWagerRequired);
    setExpectedReward(defaultTier.baseRewardValue);
    // Set sensible current wager (e.g. 50% toward target)
    setCurrentWager(Math.floor(defaultTier.cumulativeWagerRequired * 0.4));
  };

  // Handle tier preset selection
  const handleTierSelect = (tier: VipTierDef) => {
    setSelectedTierId(tier.tierId);
    setTargetWager(tier.cumulativeWagerRequired);
    setExpectedReward(tier.baseRewardValue);
  };

  // Handle game preset selection
  const handleGamePresetSelect = (preset: GameHouseEdgePreset) => {
    setSelectedGamePresetId(preset.id);
    setCustomEdge(preset.houseEdgePercent);
    setGameWeighting(preset.defaultWeightingPercent);
  };

  // Live VIP Comp Cost calculation
  const vipCostResult = useMemo(() => {
    return calculateVipCompCost({
      currentWager,
      targetWager,
      expectedReward,
      houseEdgePercent: customEdge,
      betSize,
      gameWeightingPercent: gameWeighting,
    });
  }, [currentWager, targetWager, expectedReward, customEdge, betSize, gameWeighting]);

  // Live Delta calculation
  const deltaResult = useMemo(() => {
    const cert = parseFloat(certifiedRtp);
    const obs = parseFloat(observedRtp);
    const wag = parseFloat(totalWagered);
    const spins = parseInt(spinCount, 10) || 0;
    if (isNaN(cert) || isNaN(obs) || isNaN(wag) || wag <= 0) return null;
    return calculateRtpDelta(cert, obs, wag, spins);
  }, [certifiedRtp, observedRtp, totalWagered, spinCount]);

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <ToolPageHeader
        centered
        eyebrow="RTP forensics & loyalty economics"
        title="House Edge & Comp Point Scanner"
        description={
          <>
            Calculate VIP milestone expected losses, comp point return ratios, and slot house-edge tax. Compare certified
            casinos at{' '}
            <Link href="/casinos" className="text-[#17c3b2] hover:underline">
              /casinos
            </Link>
            .
          </>
        }
      />

      <div className="mx-auto max-w-5xl px-4 pb-16">
        {/* Navigation Tabs */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={() => setActiveMode('vip')}
            className={`flex-1 border-2 py-3 font-mono text-xs font-black uppercase tracking-widest transition-all ${
              activeMode === 'vip'
                ? 'border-[#17c3b2] bg-[#17c3b2] text-black'
                : 'border-[#283347] bg-black/40 text-gray-400 hover:border-[#17c3b2]'
            }`}
          >
            VIP Comp Point & Churn Scanner
          </button>
          <button
            onClick={() => setActiveMode('delta')}
            className={`flex-1 border-2 py-3 font-mono text-xs font-black uppercase tracking-widest transition-all ${
              activeMode === 'delta'
                ? 'border-[#17c3b2] bg-[#17c3b2] text-black'
                : 'border-[#283347] bg-black/40 text-gray-400 hover:border-[#17c3b2]'
            }`}
          >
            The Delta Engine (Slot RTP Overcharge)
          </button>
        </div>

        {activeMode === 'vip' ? (
          <div>
            {/* Casino Selectors */}
            <div className="mb-8 border border-[#283347] bg-black/40 p-5">
              <span className="mb-3 block font-mono text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                Step 1: Select Casino Loyalty Program
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CASINO_VIP_PROGRAMS.map((casino) => (
                  <button
                    key={casino.casinoId}
                    onClick={() => handleCasinoChange(casino.casinoId)}
                    className={`border p-3 text-left font-mono transition-all ${
                      selectedCasinoId === casino.casinoId
                        ? 'border-[#17c3b2] bg-[#17c3b2]/10 text-white'
                        : 'border-[#283347] bg-black text-gray-400 hover:border-[#17c3b2]'
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase text-[#17c3b2]">{casino.badgeLabel}</span>
                    <span className="text-xs font-semibold">{casino.casinoName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Left Column: Parameters (7 cols) */}
              <div className="space-y-6 lg:col-span-7">
                {/* Milestone Tier Selection */}
                <div className="border border-[#283347] bg-black/40 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2]">
                      Step 2: Target Milestone Tier
                    </span>
                    <span className="font-mono text-[9px] uppercase text-gray-500">
                      Up to {currentCasino.rakebackMaxPercent}% Rakeback
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {currentCasino.tiers.map((tier) => (
                      <button
                        key={tier.tierId}
                        onClick={() => handleTierSelect(tier)}
                        className={`border p-2.5 text-left font-mono transition-all ${
                          selectedTierId === tier.tierId
                            ? 'border-[#17c3b2] bg-[#17c3b2]/20 text-white'
                            : 'border-[#283347] bg-black text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        <span className="block text-xs font-black uppercase text-white">{tier.tierName}</span>
                        <span className="block text-[10px] text-[#17c3b2]">
                          ${tier.cumulativeWagerRequired.toLocaleString()}
                        </span>
                        <span className="block text-[9px] text-gray-500">+${tier.baseRewardValue} reward</span>
                      </button>
                    ))}
                  </div>

                  {/* Manual adjustment sliders / inputs */}
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-[#283347] pt-4">
                    <div>
                      <label className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Current Wager ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={currentWager}
                        onChange={(e) => setCurrentWager(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full border border-[#283347] bg-black p-2 font-mono text-xs text-white outline-none focus:border-[#17c3b2]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Target Tier Wager ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={targetWager}
                        onChange={(e) => setTargetWager(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full border border-[#283347] bg-black p-2 font-mono text-xs text-white outline-none focus:border-[#17c3b2]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Level-Up Bonus ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={expectedReward}
                        onChange={(e) => setExpectedReward(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full border border-[#283347] bg-black p-2 font-mono text-xs text-white outline-none focus:border-[#17c3b2]"
                      />
                    </div>
                  </div>
                </div>

                {/* Game Type & House Edge Presets */}
                <div className="border border-[#283347] bg-black/40 p-5">
                  <span className="mb-3 block font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2]">
                    Step 3: Game Type & Active House Edge
                  </span>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {GAME_HOUSE_EDGE_PRESETS.slice(0, 6).map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleGamePresetSelect(preset)}
                        className={`border p-2.5 text-left font-mono transition-all ${
                          selectedGamePresetId === preset.id
                            ? 'border-[#17c3b2] bg-[#17c3b2]/10 text-white'
                            : 'border-[#283347] bg-black text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{preset.name}</span>
                          <span className="text-[10px] font-black text-[#17c3b2]">{preset.houseEdgePercent.toFixed(1)}%</span>
                        </div>
                        <span className="block text-[9px] text-gray-500">{preset.description}</span>
                      </button>
                    ))}
                  </div>

                  {/* Fine-tune parameters */}
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-[#283347] pt-4">
                    <div>
                      <label className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        House Edge %
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="25"
                        value={customEdge}
                        onChange={(e) => setCustomEdge(Math.max(0.1, parseFloat(e.target.value) || 1.0))}
                        className="w-full border border-[#283347] bg-black p-2 font-mono text-xs text-white outline-none focus:border-[#17c3b2]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        VIP Weighting %
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={gameWeighting}
                        onChange={(e) => setGameWeighting(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 100)))}
                        className="w-full border border-[#283347] bg-black p-2 font-mono text-xs text-white outline-none focus:border-[#17c3b2]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Bet Size ($)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.1"
                        value={betSize}
                        onChange={(e) => setBetSize(Math.max(0.1, parseFloat(e.target.value) || 1.0))}
                        className="w-full border border-[#283347] bg-black p-2 font-mono text-xs text-white outline-none focus:border-[#17c3b2]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Mathematical Readout (5 cols) */}
              <div className="space-y-6 lg:col-span-5">
                <div className="border border-[#17c3b2] bg-black/60 p-6">
                  <div className="mb-4 flex items-center justify-between border-b border-[#283347] pb-3">
                    <span className="font-mono text-xs font-black uppercase tracking-wider text-white">
                      LOYALTY COST BREAKDOWN
                    </span>
                    <span
                      className={`border px-2 py-0.5 font-mono text-[9px] font-black uppercase ${
                        vipCostResult.churnSeverity === 'mild'
                          ? 'border-[#22c55e]/50 bg-[#22c55e]/10 text-[#22c55e]'
                          : vipCostResult.churnSeverity === 'moderate'
                            ? 'border-[#ffd700]/50 bg-[#ffd700]/10 text-[#ffd700]'
                            : 'border-[#ef4444]/50 bg-[#ef4444]/10 text-[#ef4444]'
                      }`}
                    >
                      {vipCostResult.churnSeverity} churn
                    </span>
                  </div>

                  {/* Primary Callout: The Net Deficit */}
                  <div className="mb-6 border border-[#ef4444]/40 bg-[#ef4444]/10 p-4">
                    <span className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[#ef4444]">
                      True Mathematical Deficit (Net Loss)
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-mono text-3xl font-black text-[#ef4444]">
                        -${vipCostResult.netDeficit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-gray-400">
                      Expected statistical loss after deducting the ${vipCostResult.expectedReward.toFixed(2)} bonus.
                    </p>
                  </div>

                  {/* Key Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                    <div className="border border-[#283347] bg-black/40 p-3">
                      <span className="block text-[9px] font-bold uppercase text-gray-500">Wager Remaining</span>
                      <span className="text-sm font-bold text-white">
                        ${vipCostResult.effectiveWagerNeeded.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                      {vipCostResult.gameWeightingPercent < 100 && (
                        <span className="block text-[9px] text-[#ffd700]">
                          ({vipCostResult.gameWeightingPercent}% throttled)
                        </span>
                      )}
                    </div>

                    <div className="border border-[#283347] bg-black/40 p-3">
                      <span className="block text-[9px] font-bold uppercase text-gray-500">Expected House Loss</span>
                      <span className="text-sm font-bold text-[#ef4444]">
                        -${vipCostResult.expectedLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="border border-[#283347] bg-black/40 p-3">
                      <span className="block text-[9px] font-bold uppercase text-gray-500">Comp Return Ratio</span>
                      <span className="text-sm font-bold text-[#17c3b2]">
                        {vipCostResult.compRewardRatioPercent.toFixed(2)}%
                      </span>
                      <span className="block text-[9px] text-gray-500">of expected loss</span>
                    </div>

                    <div className="border border-[#283347] bg-black/40 p-3">
                      <span className="block text-[9px] font-bold uppercase text-gray-500">House Retained Share</span>
                      <span className="text-sm font-bold text-white">
                        {vipCostResult.houseRetainedPercent.toFixed(2)}%
                      </span>
                      <span className="block text-[9px] text-gray-500">kept by casino</span>
                    </div>

                    <div className="border border-[#283347] bg-black/40 p-3">
                      <span className="block text-[9px] font-bold uppercase text-gray-500">Rounds to Target</span>
                      <span className="text-sm font-bold text-white">
                        {vipCostResult.spinsOrRoundsNeeded.toLocaleString()} spins
                      </span>
                      <span className="block text-[9px] text-gray-500">at ${betSize.toFixed(2)}/spin</span>
                    </div>

                    <div className="border border-[#283347] bg-black/40 p-3">
                      <span className="block text-[9px] font-bold uppercase text-gray-500">Estimated Play Time</span>
                      <span className="text-sm font-bold text-white">
                        ~{vipCostResult.estimatedPlayTimeHours.toFixed(1)} hrs
                      </span>
                      <span className="block text-[9px] text-gray-500">at 3.5s/spin</span>
                    </div>
                  </div>

                  {/* Audit Takeaway */}
                  <div className="mt-5 border-t border-[#283347] pt-4">
                    <p className="font-mono text-[10px] font-black uppercase text-[#17c3b2]">
                      {vipCostResult.headlineVerdict}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-gray-400">
                      {vipCostResult.auditTakeaway}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Educational Dossier */}
            <div className="mt-12 border border-[#283347] bg-black/40 p-6">
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2]">
                Loyalty Forensics: The 3 Truths of Casino VIP Clubs
              </span>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="border border-[#283347] bg-black/30 p-4">
                  <h3 className="font-mono text-xs font-bold uppercase text-white">01. The Sunk-Cost Progress Bar</h3>
                  <p className="mt-2 text-xs leading-relaxed text-gray-400">
                    Casinos place VIP progress bars directly under your balance because visual progress triggers dopamine.
                    Players chase the remaining 15% without realizing they must donate thousands in expected loss to reach it.
                  </p>
                </div>
                <div className="border border-[#283347] bg-black/30 p-4">
                  <h3 className="font-mono text-xs font-bold uppercase text-white">02. Rakeback Does Not Equal Profit</h3>
                  <p className="mt-2 text-xs leading-relaxed text-gray-400">
                    10% rakeback on a 4% house edge game merely reduces the edge to 3.6%. You are still mathematically
                    guaranteed to bleed long term. Rakeback softens the slope; it never reverses it.
                  </p>
                </div>
                <div className="border border-[#283347] bg-black/30 p-4">
                  <h3 className="font-mono text-xs font-bold uppercase text-white">03. Game Weighting Penalties</h3>
                  <p className="mt-2 text-xs leading-relaxed text-gray-400">
                    Casinos restrict low-edge table games (0.5% Blackjack) to 10-20% contribution, while high-edge slots
                    (3.5-10% edge) get 100%. This forces players seeking VIP badges onto the most volatile house traps.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Delta Engine Mode (Slot RTP Deviation Forensics) */
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-2 text-2xl font-black uppercase tracking-tight">Greed Premium Calculator</h2>
            <p className="mb-8 font-mono text-xs uppercase tracking-widest text-gray-500">
              Manual input. Enter certified manufacturer RTP vs what your session actually returned.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setDeltaResultActive(true);
              }}
              className="flex flex-col gap-5 border border-[#283347] bg-black/40 p-6"
            >
              <div className="flex flex-col gap-1">
                <label className="font-mono text-xs font-black uppercase tracking-widest text-gray-400">
                  Game (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gates of Olympus"
                  value={deltaGameName}
                  onChange={(e) => setDeltaGameName(e.target.value)}
                  className="border border-[#283347] bg-black px-4 py-3 font-mono text-sm text-white placeholder-gray-600 outline-none focus:border-[#17c3b2]"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs font-black uppercase tracking-widest text-gray-400">
                    Certified RTP (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="50"
                    max="100"
                    required
                    placeholder="e.g. 96.5"
                    value={certifiedRtp}
                    onChange={(e) => setCertifiedRtp(e.target.value)}
                    className="border border-[#283347] bg-black px-4 py-3 font-mono text-sm text-white placeholder-gray-600 outline-none focus:border-[#17c3b2]"
                  />
                  <p className="font-mono text-[10px] text-gray-600">From GLI/eCOGRA cert or casino game info page.</p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs font-black uppercase tracking-widest text-gray-400">
                    Observed RTP (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="200"
                    required
                    placeholder="e.g. 91.8"
                    value={observedRtp}
                    onChange={(e) => setObservedRtp(e.target.value)}
                    className="border border-[#283347] bg-black px-4 py-3 font-mono text-sm text-white placeholder-gray-600 outline-none focus:border-[#17c3b2]"
                  />
                  <p className="font-mono text-[10px] text-gray-600">(Total returned / Total wagered) * 100</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs font-black uppercase tracking-widest text-gray-400">
                    Total Wagered ($)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 500"
                    value={totalWagered}
                    onChange={(e) => setTotalWagered(e.target.value)}
                    className="border border-[#283347] bg-black px-4 py-3 font-mono text-sm text-white placeholder-gray-600 outline-none focus:border-[#17c3b2]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs font-black uppercase tracking-widest text-gray-400">
                    Number of Spins
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 350"
                    value={spinCount}
                    onChange={(e) => setSpinCount(e.target.value)}
                    className="border border-[#283347] bg-black px-4 py-3 font-mono text-sm text-white placeholder-gray-600 outline-none focus:border-[#17c3b2]"
                  />
                  <p className="font-mono text-[10px] text-gray-600">Used for confidence scoring.</p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#17c3b2] py-3.5 font-mono text-sm font-black uppercase tracking-widest text-black transition-colors hover:bg-[#48d5c6]"
              >
                Calculate Greed Premium
              </button>
            </form>

            {deltaResultActive && deltaResult && (
              <div className="mt-8 flex flex-col gap-6">
                {deltaGameName && (
                  <p className="font-mono text-xs uppercase tracking-widest text-gray-500">
                    Game: <span className="font-bold text-white">{deltaGameName}</span>
                  </p>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1 border border-[#283347] bg-black/60 p-4">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Certified RTP</span>
                    <span className="text-2xl font-black text-white">{certifiedRtp}%</span>
                  </div>
                  <div className="flex flex-col gap-1 border border-[#283347] bg-black/60 p-4">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Observed RTP</span>
                    <span className="text-2xl font-black text-white">{observedRtp}%</span>
                  </div>
                  <div className="flex flex-col gap-1 border border-[#ef4444]/50 bg-[#ef4444]/10 p-4">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#ef4444]">Delta</span>
                    <span className="text-2xl font-black text-[#ef4444]">
                      {deltaResult.delta >= 0 ? '-' : '+'}
                      {Math.abs(deltaResult.delta).toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border border-[#ef4444]/40 bg-[#ef4444]/5 p-6">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#ef4444]">Greed Premium</span>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div>
                      <span className="text-4xl font-black text-[#ef4444]">
                        ${Math.abs(deltaResult.greedPremiumPer100).toFixed(2)}
                      </span>
                      <span className="ml-2 font-mono text-sm text-gray-400">per $100 wagered</span>
                    </div>
                    <div className="font-mono text-sm text-gray-400">
                      Total overcharge on ${totalWagered}:{' '}
                      <span className="font-bold text-[#ef4444]">${Math.abs(deltaResult.totalOvercharge).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 border border-[#283347] bg-black/40 p-4 font-mono text-xs">
                  <span
                    className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: deltaResult.confidence.color }}
                  />
                  <div>
                    <span className="font-black uppercase tracking-widest" style={{ color: deltaResult.confidence.color }}>
                      Confidence:{' '}
                    </span>
                    <span className="text-gray-400">{deltaResult.confidence.label}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="mt-12 text-center font-mono text-[10px] text-gray-600">
          Mathematical models based on public casino VIP terms. Expected loss = Effective Wager * House Edge.
        </p>
      </div>
    </main>
  );
}
