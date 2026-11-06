// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04

/**
 * vip-comp-engine.ts
 *
 * Mathematical engine analyzing casino VIP loyalty tiers, comp points,
 * and true expected loss vs advertised reward ratios.
 *
 * Reveals the "VIP Churn Trap": How much wager volume and mathematical
 * expected loss is required to unlock VIP status vs what the casino actually pays back.
 */

export interface VipTierDef {
  tierId: string;
  tierName: string;
  cumulativeWagerRequired: number;
  incrementalWagerFromPrevious: number;
  baseRewardValue: number;
  rewardType: string;
  description: string;
}

export interface CasinoVipProgram {
  casinoId: string;
  casinoName: string;
  badgeLabel: string;
  tiers: VipTierDef[];
  rakebackMaxPercent: number;
  notes: string;
}

export interface GameHouseEdgePreset {
  id: string;
  name: string;
  category: 'originals' | 'slots' | 'table' | 'live';
  houseEdgePercent: number;
  rtpPercent: number;
  defaultWeightingPercent: number;
  description: string;
}

export const GAME_HOUSE_EDGE_PRESETS: GameHouseEdgePreset[] = [
  {
    id: 'originals-dice',
    name: 'Casino Originals (Dice / Limbo / Crash)',
    category: 'originals',
    houseEdgePercent: 1.0,
    rtpPercent: 99.0,
    defaultWeightingPercent: 100,
    description: 'In-house provably fair games calibrated to exactly 1.00% house edge.',
  },
  {
    id: 'slots-max-rtp',
    name: 'Slots: Certified Top Tier (96.5% RTP)',
    category: 'slots',
    houseEdgePercent: 3.5,
    rtpPercent: 96.5,
    defaultWeightingPercent: 100,
    description: 'Standard manufacturer default tier for Pragmatic / Hacksaw / NoLimit.',
  },
  {
    id: 'slots-avg-rtp',
    name: 'Slots: Average Industry Tier (95.5% RTP)',
    category: 'slots',
    houseEdgePercent: 4.5,
    rtpPercent: 95.5,
    defaultWeightingPercent: 100,
    description: 'Mid-tier deployment widely found across offshore and sweepstakes rooms.',
  },
  {
    id: 'slots-downgraded',
    name: 'Slots: Stealth Downgrade Tier (94.0% RTP)',
    category: 'slots',
    houseEdgePercent: 6.0,
    rtpPercent: 94.0,
    defaultWeightingPercent: 100,
    description: 'Lowered certified configuration quietly deployed without player alerts.',
  },
  {
    id: 'slots-severe-downgrade',
    name: 'Slots: Severe Downgrade Tier (90.0% RTP)',
    category: 'slots',
    houseEdgePercent: 10.0,
    rtpPercent: 90.0,
    defaultWeightingPercent: 100,
    description: 'Bottom-tier certified payout setting inflicting massive session bleed.',
  },
  {
    id: 'table-blackjack',
    name: 'Live Blackjack (Basic Strategy)',
    category: 'table',
    houseEdgePercent: 0.5,
    rtpPercent: 99.5,
    defaultWeightingPercent: 20,
    description: 'Low house edge, but casinos heavily throttle VIP wager contribution (typically 10-20%).',
  },
  {
    id: 'table-roulette-euro',
    name: 'European Roulette (Single Zero)',
    category: 'table',
    houseEdgePercent: 2.7,
    rtpPercent: 97.3,
    defaultWeightingPercent: 50,
    description: 'Standard single-zero wheel with 2.70% mathematical edge.',
  },
  {
    id: 'table-roulette-american',
    name: 'American Roulette (Double Zero 00)',
    category: 'table',
    houseEdgePercent: 5.26,
    rtpPercent: 94.74,
    defaultWeightingPercent: 50,
    description: 'Double-zero layout nearly doubling the house edge over European rules.',
  },
];

export const CASINO_VIP_PROGRAMS: CasinoVipProgram[] = [
  {
    casinoId: 'stake',
    casinoName: 'Stake (Stake.com / Stake.us)',
    badgeLabel: 'STAKE VIP',
    rakebackMaxPercent: 10,
    notes: 'Level-up bonuses scale incrementally with wager volume. Slots contribute 100%; table games may contribute less.',
    tiers: [
      {
        tierId: 'stake-bronze',
        tierName: 'Bronze',
        cumulativeWagerRequired: 10000,
        incrementalWagerFromPrevious: 10000,
        baseRewardValue: 15,
        rewardType: 'Bonus + Rakeback Unlock',
        description: 'First milestone: unlocks 10% rakeback on house edge and weekly telegram bonus.',
      },
      {
        tierId: 'stake-silver',
        tierName: 'Silver',
        cumulativeWagerRequired: 50000,
        incrementalWagerFromPrevious: 40000,
        baseRewardValue: 50,
        rewardType: 'Level-Up Bonus',
        description: 'Requires $40k additional wager after Bronze.',
      },
      {
        tierId: 'stake-gold',
        tierName: 'Gold',
        cumulativeWagerRequired: 100000,
        incrementalWagerFromPrevious: 50000,
        baseRewardValue: 110,
        rewardType: 'Level-Up Bonus',
        description: 'Requires $50k additional wager after Silver.',
      },
      {
        tierId: 'stake-plat1',
        tierName: 'Platinum I',
        cumulativeWagerRequired: 250000,
        incrementalWagerFromPrevious: 150000,
        baseRewardValue: 220,
        rewardType: 'Level-Up Bonus + 14d Daily Reload',
        description: 'Requires $150k additional wager after Gold. Daily reload lasts 14 days.',
      },
      {
        tierId: 'stake-plat2',
        tierName: 'Platinum II',
        cumulativeWagerRequired: 500000,
        incrementalWagerFromPrevious: 250000,
        baseRewardValue: 440,
        rewardType: 'Level-Up Bonus + 28d Daily Reload',
        description: 'Requires $250k additional wager after Plat I.',
      },
      {
        tierId: 'stake-plat3',
        tierName: 'Platinum III',
        cumulativeWagerRequired: 1000000,
        incrementalWagerFromPrevious: 500000,
        baseRewardValue: 880,
        rewardType: 'Level-Up Bonus + 42d Daily Reload',
        description: 'Requires $500k additional wager after Plat II. Seven-figure cumulative wager.',
      },
      {
        tierId: 'stake-plat4',
        tierName: 'Platinum IV',
        cumulativeWagerRequired: 2500000,
        incrementalWagerFromPrevious: 1500000,
        baseRewardValue: 1600,
        rewardType: 'Level-Up Bonus + Dedicated VIP Host',
        description: 'Requires $1.5M additional wager after Plat III. Personal Telegram host assigned.',
      },
      {
        tierId: 'stake-plat5',
        tierName: 'Platinum V',
        cumulativeWagerRequired: 5000000,
        incrementalWagerFromPrevious: 2500000,
        baseRewardValue: 3200,
        rewardType: 'Level-Up Bonus + Custom Reload',
        description: 'Requires $2.5M additional wager after Plat IV.',
      },
      {
        tierId: 'stake-plat6',
        tierName: 'Platinum VI',
        cumulativeWagerRequired: 10000000,
        incrementalWagerFromPrevious: 5000000,
        baseRewardValue: 6400,
        rewardType: 'Level-Up Bonus + VIP Concierge',
        description: 'Requires $5.0M additional wager after Plat V. Eight-figure cumulative turnover.',
      },
    ],
  },
  {
    casinoId: 'roobet',
    casinoName: 'Roobet (Roowards)',
    badgeLabel: 'ROOBET ROOWARDS',
    rakebackMaxPercent: 10,
    notes: 'Roobet structures rewards across Daily Rakeback, Weekly Cashback, and Monthly Tier bonuses.',
    tiers: [
      {
        tierId: 'roobet-lvl1',
        tierName: 'Level 1 (Apprentice)',
        cumulativeWagerRequired: 1000,
        incrementalWagerFromPrevious: 1000,
        baseRewardValue: 2,
        rewardType: 'Daily Rakeback Activated',
        description: 'Initial hurdle activating recurring daily rakeback claims.',
      },
      {
        tierId: 'roobet-lvl5',
        tierName: 'Level 5 (Challenger)',
        cumulativeWagerRequired: 25000,
        incrementalWagerFromPrevious: 24000,
        baseRewardValue: 35,
        rewardType: 'Weekly Boost Tier 2',
        description: 'Requires $24k incremental wager. Enhances weekly rakeback percentage.',
      },
      {
        tierId: 'roobet-lvl10',
        tierName: 'Level 10 (Master)',
        cumulativeWagerRequired: 100000,
        incrementalWagerFromPrevious: 75000,
        baseRewardValue: 120,
        rewardType: 'Monthly Bonus Tier',
        description: 'Requires $75k incremental turnover after Level 5.',
      },
      {
        tierId: 'roobet-vip',
        tierName: 'Roobet VIP (Invite Only)',
        cumulativeWagerRequired: 500000,
        incrementalWagerFromPrevious: 400000,
        baseRewardValue: 650,
        rewardType: 'VIP Host + Event Invites',
        description: 'Private concierge access requiring estimated $500k minimum turnover.',
      },
    ],
  },
  {
    casinoId: 'bcgame',
    casinoName: 'BC.Game VIP Club',
    badgeLabel: 'BC.GAME VIP',
    rakebackMaxPercent: 15,
    notes: 'BC.Game uses XP points (1 USD wager = 1 XP) with SVIP levels reaching up to level 70.',
    tiers: [
      {
        tierId: 'bcgame-bronze',
        tierName: 'Bronze (VIP 8)',
        cumulativeWagerRequired: 4000,
        incrementalWagerFromPrevious: 4000,
        baseRewardValue: 6,
        rewardType: 'Roll Point Game + Secret Chest',
        description: 'Unlocks roll competitions and forum tips.',
      },
      {
        tierId: 'bcgame-silver',
        tierName: 'Silver (VIP 22)',
        cumulativeWagerRequired: 50000,
        incrementalWagerFromPrevious: 46000,
        baseRewardValue: 60,
        rewardType: 'Level-Up Bonus + Rain Feature',
        description: 'Requires $46k additional volume after VIP 8.',
      },
      {
        tierId: 'bcgame-gold',
        tierName: 'Gold (VIP 38)',
        cumulativeWagerRequired: 200000,
        incrementalWagerFromPrevious: 150000,
        baseRewardValue: 240,
        rewardType: 'Coin Drop + Dedicated Host',
        description: 'Requires $150k additional turnover after Silver.',
      },
      {
        tierId: 'bcgame-platinum',
        tierName: 'Platinum (VIP 56)',
        cumulativeWagerRequired: 1000000,
        incrementalWagerFromPrevious: 800000,
        baseRewardValue: 1100,
        rewardType: 'SVIP Daily Reload',
        description: 'Seven-figure requirement unlocking custom daily withdrawals.',
      },
    ],
  },
  {
    casinoId: 'sweepstakes',
    casinoName: 'Sweepstakes VIP (McLuck / Pulsz / WOW Vegas)',
    badgeLabel: 'SWEEPSTAKES VIP',
    rakebackMaxPercent: 5,
    notes: 'Social sweepstakes rooms offer coin packages with VIP tiers yielding SC rewards and discount coin bundles.',
    tiers: [
      {
        tierId: 'sweeps-bronze',
        tierName: 'Bronze Tier',
        cumulativeWagerRequired: 5000,
        incrementalWagerFromPrevious: 5000,
        baseRewardValue: 10,
        rewardType: '10 SC Level-Up Reward',
        description: 'Entry-level sweepstakes loyalty status.',
      },
      {
        tierId: 'sweeps-silver',
        tierName: 'Silver Tier',
        cumulativeWagerRequired: 25000,
        incrementalWagerFromPrevious: 20000,
        baseRewardValue: 50,
        rewardType: '50 SC Reward + 5% GC Bundle Discount',
        description: 'Requires 20,000 SC additional turnover.',
      },
      {
        tierId: 'sweeps-gold',
        tierName: 'Gold Tier',
        cumulativeWagerRequired: 100000,
        incrementalWagerFromPrevious: 75000,
        baseRewardValue: 180,
        rewardType: '180 SC Reward + Priority Redemption',
        description: 'Requires 75,000 SC additional turnover.',
      },
      {
        tierId: 'sweeps-platinum',
        tierName: 'Platinum Tier',
        cumulativeWagerRequired: 500000,
        incrementalWagerFromPrevious: 400000,
        baseRewardValue: 900,
        rewardType: '900 SC Reward + VIP Host',
        description: 'Dedicated account manager for prize redemptions.',
      },
    ],
  },
];

export interface VipCostInput {
  currentWager: number;
  targetWager: number;
  expectedReward: number;
  houseEdgePercent: number;
  betSize: number;
  gameWeightingPercent?: number;
}

export interface VipCostResult {
  currentWager: number;
  targetWager: number;
  wagerRemainingNominal: number;
  gameWeightingPercent: number;
  effectiveWagerNeeded: number;
  houseEdgePercent: number;
  expectedLoss: number;
  expectedReward: number;
  netDeficit: number;
  compRewardRatioPercent: number;
  houseRetainedPercent: number;
  spinsOrRoundsNeeded: number;
  estimatedPlayTimeHours: number;
  churnSeverity: 'mild' | 'moderate' | 'predatory' | 'extreme';
  headlineVerdict: string;
  auditTakeaway: string;
}

/**
 * Calculates the exact mathematical cost and comp ratio to reach a target VIP tier.
 */
export function calculateVipCompCost(input: VipCostInput): VipCostResult {
  const current = Math.max(0, input.currentWager || 0);
  const target = Math.max(current, input.targetWager || 0);
  const reward = Math.max(0, input.expectedReward || 0);
  const edge = Math.max(0.01, Math.min(50, input.houseEdgePercent || 3.5));
  const bet = Math.max(0.1, input.betSize || 1.0);
  const weighting = Math.max(1, Math.min(100, input.gameWeightingPercent ?? 100));

  const wagerRemainingNominal = Math.max(0, target - current);
  // If game only contributes 20%, you need 5x more turnover
  const effectiveWagerNeeded = wagerRemainingNominal / (weighting / 100);

  const expectedLoss = Math.round(effectiveWagerNeeded * (edge / 100) * 100) / 100;
  const netDeficit = Math.round(Math.max(0, expectedLoss - reward) * 100) / 100;

  let compRewardRatioPercent = 0;
  if (expectedLoss > 0) {
    compRewardRatioPercent = Math.min(100, (reward / expectedLoss) * 100);
  }
  const houseRetainedPercent = Math.max(0, 100 - compRewardRatioPercent);

  const spinsOrRoundsNeeded = Math.ceil(effectiveWagerNeeded / bet);
  // Average 3.5 seconds per spin/round
  const estimatedPlayTimeHours = (spinsOrRoundsNeeded * 3.5) / 3600;

  let churnSeverity: 'mild' | 'moderate' | 'predatory' | 'extreme';
  let headlineVerdict: string;
  let auditTakeaway: string;

  if (compRewardRatioPercent >= 25) {
    churnSeverity = 'mild';
    headlineVerdict = 'REASONABLE REBATE: High reward return on low-edge turnover.';
    auditTakeaway = 'You recover over 25% of your statistical loss. Still negative expectation, but acceptable for casual play on low house-edge games.';
  } else if (compRewardRatioPercent >= 10) {
    churnSeverity = 'moderate';
    headlineVerdict = 'MODERATE SINKHOLE: House retains 75-90% of expected loss.';
    auditTakeaway = 'The casino pays back a small fraction of what mathematics projects you will lose. Do not increase bets specifically to hit this tier.';
  } else if (compRewardRatioPercent >= 3) {
    churnSeverity = 'predatory';
    headlineVerdict = 'PREDATORY CHURN: You donate over 90% in expected losses to claim badge.';
    auditTakeaway = 'Massive disparity between wager required and reward paid. You are spending thousands in mathematical bleed for a token bonus.';
  } else {
    churnSeverity = 'extreme';
    headlineVerdict = 'EXTREME HOUSE EXTRACTION: Over 97% unrecoverable house tax.';
    auditTakeaway = 'The reward is practically negligible compared to expected statistical loss. Chasing this tier is mathematically ruinous.';
  }

  return {
    currentWager: current,
    targetWager: target,
    wagerRemainingNominal,
    gameWeightingPercent: weighting,
    effectiveWagerNeeded,
    houseEdgePercent: edge,
    expectedLoss,
    expectedReward: reward,
    netDeficit,
    compRewardRatioPercent,
    houseRetainedPercent,
    spinsOrRoundsNeeded,
    estimatedPlayTimeHours,
    churnSeverity,
    headlineVerdict,
    auditTakeaway,
  };
}

/**
 * Calculates slot RTP deviation (The Delta Engine).
 */
export interface RtpDeltaResult {
  delta: number;
  greedPremiumPer100: number;
  totalOvercharge: number;
  confidence: {
    tier: 'low' | 'moderate' | 'solid' | 'high';
    label: string;
    color: string;
  };
}

export function calculateRtpDelta(
  certifiedRtp: number,
  observedRtp: number,
  totalWagered: number,
  spinCount?: number
): RtpDeltaResult {
  const delta = certifiedRtp - observedRtp;
  const greedPremiumPer100 = delta;
  const totalOvercharge = (delta / 100) * totalWagered;

  const spins = spinCount || 0;
  let confidence: RtpDeltaResult['confidence'];

  if (spins < 100) {
    confidence = {
      tier: 'low',
      label: 'LOW - Too few spins for statistical significance',
      color: '#ef4444',
    };
  } else if (spins < 500) {
    confidence = {
      tier: 'moderate',
      label: 'MODERATE - Directional signal only',
      color: '#ffd700',
    };
  } else if (spins < 2000) {
    confidence = {
      tier: 'solid',
      label: 'SOLID - Meaningful sample size',
      color: '#17c3b2',
    };
  } else {
    confidence = {
      tier: 'high',
      label: 'HIGH - Statistically robust sample',
      color: '#22c55e',
    };
  }

  return {
    delta,
    greedPremiumPer100,
    totalOvercharge,
    confidence,
  };
}
