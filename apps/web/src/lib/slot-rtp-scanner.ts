/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */

/**
 * slot-rtp-scanner.ts
 * Slot RTP Downgrade Scanner & Bankroll Bleed Calculator.
 *
 * Compares certified manufacturer RTP tiers against deployed casino profiles.
 * Sourced from GLI/eCOGRA certification PAR sheets and third-party forensic audits.
 * Non-custodial: client-side calculations with zero player custody.
 */

import rtpData from '../data/provider-master-rtp.json';
import casinosData from '../data/casinos.json';

export interface MasterGame {
  gameTitle: string;
  gameSlug: string;
  certifiedTiers: number[];
  maxRtp: number;
  minRtp: number;
  certifiedBy: string;
  certifiedYear: number;
  providerName: string;
}

export interface OperatorDeploymentProfile {
  name: string;
  category: string;
  grade: string;
  risk: string;
  rtpSummary?: string;
  rtpOriginals?: string;
  rtpSlots?: string;
  audited: boolean;
}

export interface BleedComparison {
  tier: number;
  houseEdge: number;
  bleedIncreasePercent: number;
  lossPer1000Wagered: number;
  greedTaxPer1000Wagered: number;
}

export interface SessionSimulationResult {
  betSize: number;
  spinCount: number;
  totalWagered: number;
  maxRtpExpectedLoss: number;
  deployedRtpExpectedLoss: number;
  greedTaxLoss: number;
}

export function calculateBleedIncrease(defaultRtp: number, deployedRtp: number): number {
  const defaultEdge = 100 - defaultRtp;
  const deployedEdge = 100 - deployedRtp;
  if (defaultEdge <= 0) return 0;
  return Math.round(((deployedEdge - defaultEdge) / defaultEdge) * 100);
}

export function calculateExpectedLoss(wager: number, rtp: number): number {
  if (wager <= 0 || rtp <= 0 || rtp > 100) return 0;
  const edge = (100 - rtp) / 100;
  return Math.round(wager * edge * 100) / 100;
}

export function simulateSessionLoss(
  betSize: number,
  spinCount: number,
  maxRtp: number,
  deployedRtp: number,
): SessionSimulationResult {
  const totalWagered = Math.round(betSize * spinCount * 100) / 100;
  const maxRtpExpectedLoss = calculateExpectedLoss(totalWagered, maxRtp);
  const deployedRtpExpectedLoss = calculateExpectedLoss(totalWagered, deployedRtp);
  const greedTaxLoss = Math.round((deployedRtpExpectedLoss - maxRtpExpectedLoss) * 100) / 100;

  return {
    betSize,
    spinCount,
    totalWagered,
    maxRtpExpectedLoss,
    deployedRtpExpectedLoss,
    greedTaxLoss,
  };
}

export function getAllIndexedGames(): MasterGame[] {
  const list: MasterGame[] = [];
  for (const provider of rtpData.providers) {
    for (const game of provider.games) {
      list.push({
        gameTitle: game.gameTitle,
        gameSlug: game.gameSlug,
        certifiedTiers: game.certifiedTiers,
        maxRtp: game.maxRtp,
        minRtp: game.minRtp,
        certifiedBy: game.certifiedBy,
        certifiedYear: game.certifiedYear,
        providerName: provider.providerName,
      });
    }
  }
  return list;
}

export function getIndexedProviders(): string[] {
  return rtpData.providers.map((p) => p.providerName);
}

export function getFeaturedOperators(): OperatorDeploymentProfile[] {
  const records = casinosData as OperatorDeploymentProfile[];
  return records.filter((c) => c.audited || c.rtpSlots);
}

export function findOperatorDeployment(operatorName: string): OperatorDeploymentProfile | null {
  if (!operatorName || !operatorName.trim()) return null;
  const query = operatorName.trim().toLowerCase();
  const records = casinosData as OperatorDeploymentProfile[];

  const exact = records.find((c) => c.name.toLowerCase() === query);
  if (exact) return exact;

  const partial = records.find((c) => c.name.toLowerCase().includes(query) || query.includes(c.name.toLowerCase()));
  return partial ?? null;
}

export function buildBleedComparisons(maxRtp: number, tiers: number[]): BleedComparison[] {
  const baseLossPer1000 = calculateExpectedLoss(1000, maxRtp);

  return tiers.map((tier) => {
    const houseEdge = Math.round((100 - tier) * 100) / 100;
    const bleedIncreasePercent = calculateBleedIncrease(maxRtp, tier);
    const lossPer1000Wagered = calculateExpectedLoss(1000, tier);
    const greedTaxPer1000Wagered = Math.round((lossPer1000Wagered - baseLossPer1000) * 100) / 100;

    return {
      tier,
      houseEdge,
      bleedIncreasePercent,
      lossPer1000Wagered,
      greedTaxPer1000Wagered,
    };
  });
}
