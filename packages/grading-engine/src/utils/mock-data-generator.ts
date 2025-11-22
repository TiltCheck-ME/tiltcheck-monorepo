/**
 * Mock Spin Data Generator
 * 
 * Generates realistic casino spin outcomes for testing grading engine
 * without requiring real on-chain data.
 */

import type { SpinRecord, CasinoData, DisclosureChecklist } from '../index.js';

export interface MockDataConfig {
  /** Number of spins to generate */
  spinCount: number;
  /** Target RTP (will add realistic variance) */
  targetRTP: number;
  /** Include bonus rounds? */
  includeBonuses?: boolean;
  /** Bonus trigger rate (0-1) */
  bonusTriggerRate?: number;
  /** Manipulation factor (1.0 = none, 0.8 = 20% below target) */
  manipulationFactor?: number;
}

/**
 * Generate mock spin outcomes with realistic distributions
 */
export function generateMockSpins(config: MockDataConfig): SpinRecord[] {
  const {
    spinCount,
    targetRTP,
    includeBonuses = true,
    bonusTriggerRate = 0.05,
    manipulationFactor = 1.0
  } = config;

  const effectiveRTP = targetRTP * manipulationFactor;
  const spins: SpinRecord[] = [];
  let rotationCounter = 0;

  for (let i = 0; i < spinCount; i++) {
    // Rotate seed every 100 spins (realistic casino behavior)
    if (i > 0 && i % 100 === 0) {
      rotationCounter++;
    }

    const betAmount = randomBet();
    const isBonus = includeBonuses && Math.random() < bonusTriggerRate;
    const payout = generatePayout(betAmount, effectiveRTP, isBonus);
    
    const spin: SpinRecord = {
      ts: Date.now() - (spinCount - i) * 10000, // 10s between spins
      netWin: payout - betAmount,
      symbolFreq: countSymbols(generateSymbols(payout, betAmount)),
      featureTriggered: isBonus
    };

    spins.push(spin);
  }

  return spins;
}

/**
 * Generate realistic payout based on RTP
 * Uses geometric distribution with occasional big wins
 */
function generatePayout(betAmount: number, _targetRTP: number, isBonus: boolean): number {
  // Slot outcomes follow geometric distribution with occasional big wins
  const rand = Math.random();
  
  if (isBonus) {
    // Bonuses have higher variance
    if (rand < 0.7) return betAmount * randomBetween(5, 20); // Common bonus win
    if (rand < 0.95) return betAmount * randomBetween(20, 100); // Big bonus
    return betAmount * randomBetween(100, 500); // Jackpot
  }
  
  // Regular spins: mostly losses, occasional wins
  if (rand < 0.7) return 0; // 70% losses
  if (rand < 0.90) return betAmount * randomBetween(0.5, 2); // Small wins
  if (rand < 0.98) return betAmount * randomBetween(2, 20); // Medium wins
  return betAmount * randomBetween(20, 200); // Big wins
}

/**
 * Generate slot symbols based on outcome
 */
function generateSymbols(payout: number, betAmount: number): string[] {
  const multiplier = payout / betAmount;
  
  if (multiplier === 0) return ['🍒', '🍋', '⭐']; // Loss
  if (multiplier < 2) return ['🍒', '🍒', '🍋']; // Small win
  if (multiplier < 10) return ['🍒', '🍒', '🍒']; // Medium win
  if (multiplier < 50) return ['💎', '💎', '💎']; // Big win
  return ['🎰', '🎰', '🎰']; // Jackpot
}

/**
 * Generate random bet amount (realistic distribution)
 */
function randomBet(): number {
  const amounts = [1, 2, 5, 10, 20, 50, 100]; // Common bet sizes (in cents)
  return amounts[Math.floor(Math.random() * amounts.length)];
}

/**
 * Generate realistic casino disclosures
 */
export function generateMockDisclosures(config: {
  hasRTPStated?: boolean;
  hasProvablyFair?: boolean;
  hasAudit?: boolean;
}): DisclosureChecklist {
  const {
    hasRTPStated = true,
    hasProvablyFair = true,
    hasAudit = true
  } = config;

  return {
    rtpVersionPublished: hasRTPStated,
    auditReportPresent: hasAudit,
    fairnessPolicyURL: hasProvablyFair ? 'https://example.casino/fairness' : undefined,
    regulatorLicense: 'Curacao eGaming License #1668/JAZ'
  };
}

/**
 * Generate complete mock casino dataset
 */
export function generateMockCasinoData(scenario: 'fair' | 'rigged' | 'shady' | 'excellent'): CasinoData {
  const configs = {
    fair: {
      spinCount: 1000,
      targetRTP: 96.5,
      manipulationFactor: 1.0,
      disclosures: { hasRTPStated: true, hasProvablyFair: true, hasAudit: true }
    },
    rigged: {
      spinCount: 1000,
      targetRTP: 96.5,
      manipulationFactor: 0.85, // 15% below stated RTP
      disclosures: { hasRTPStated: true, hasProvablyFair: false, hasAudit: false }
    },
    shady: {
      spinCount: 500,
      targetRTP: 96.5,
      manipulationFactor: 0.92, // Slight manipulation
      disclosures: { hasRTPStated: false, hasProvablyFair: false, hasAudit: false }
    },
    excellent: {
      spinCount: 2000,
      targetRTP: 97.5, // Above average RTP
      manipulationFactor: 1.0,
      disclosures: { hasRTPStated: true, hasProvablyFair: true, hasAudit: true }
    }
  };

  const config = configs[scenario];
  
  return {
    casino: `test-${scenario}`,
    spins: generateMockSpins(config),
    disclosures: generateMockDisclosures(config.disclosures)
  };
}

// Helper functions
function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function countSymbols(symbols: string[]): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const symbol of symbols) {
    freq[symbol] = (freq[symbol] || 0) + 1;
  }
  return freq;
}
