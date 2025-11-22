#!/usr/bin/env ts-node
/**
 * TiltCheck Casino Grading Engine
 * ================================
 * Unified quantitative + qualitative fairness evaluation across five categories:
 * 1. RNG Integrity
 * 2. RTP Transparency
 * 3. Volatility Consistency
 * 4. Session-Level Behavior
 * 5. Transparency & Ethics
 *
 * Outputs per-category scores, metric values, composite grade, and narrative rationale.
 */

import * as fs from 'fs';
import * as path from 'path';

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────

export interface SpinRecord {
  ts: number;
  netWin: number;
  symbolFreq?: Record<string, number>;
  featureTriggered?: boolean;
}

export interface SeedRotation {
  ts: number;
}

export interface BonusEvent {
  ts: number;
  type: string;
}

export interface CasinoData {
  casino: string;
  spins: SpinRecord[];
  paytableBaseline?: Record<string, number>;
  expectedBonusPerSpins?: number;
  seedRotations?: SeedRotation[];
  bonusEvents?: BonusEvent[];
  disclosures?: DisclosureChecklist;
  hashVerifications?: HashVerificationResult[];
}

export interface DisclosureChecklist {
  rtpVersionPublished: boolean;
  auditReportPresent: boolean;
  fairnessPolicyURL?: string;
  regulatorLicense?: string;
}

export interface HashVerificationResult {
  verified: boolean;
  ts: number;
}

export interface MetricResult {
  value: number; // 0-1 anomaly score
  confidence: number; // 0-1
  sampleSize: number;
}

export interface CategoryScore {
  score: number; // 0-100
  metrics: Record<string, number>;
  rationale: string[];
}

export interface GradingOutput {
  casino: string;
  categories: {
    rngIntegrity: CategoryScore;
    rtpTransparency: CategoryScore;
    volatilityConsistency: CategoryScore;
    sessionBehavior: CategoryScore;
    transparencyEthics: CategoryScore;
  };
  compositeScore: number;
  disclaimer: string;
  version: string;
}

// ────────────────────────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────────────────────────

function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  return arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / arr.length;
}

function stdDev(arr: number[]): number {
  return Math.sqrt(variance(arr));
}

function confidenceScaling(sampleSize: number, minRequired: number): number {
  if (sampleSize >= minRequired) return 1;
  return Math.sqrt(sampleSize / minRequired);
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

// ────────────────────────────────────────────────────────────────────────────────
// Metric Calculators
// ────────────────────────────────────────────────────────────────────────────────

// RNG Integrity
export function computeHashVerification(verifications?: HashVerificationResult[]): MetricResult {
  if (!verifications || verifications.length === 0) {
    return { value: 0.5, confidence: 0, sampleSize: 0 }; // unknown = mid anomaly
  }
  const failCount = verifications.filter(v => !v.verified).length;
  const anomaly = failCount / verifications.length;
  return { value: anomaly, confidence: 1, sampleSize: verifications.length };
}

export function computeRotationRegularity(rotations?: SeedRotation[]): MetricResult {
  if (!rotations || rotations.length < 3) {
    return { value: 0.3, confidence: 0.3, sampleSize: rotations?.length || 0 };
  }
  const sorted = rotations.slice().sort((a, b) => a.ts - b.ts);
  const intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(sorted[i].ts - sorted[i - 1].ts);
  }
  const avgInterval = mean(intervals);
  const stdInterval = stdDev(intervals);
  const cv = safeDiv(stdInterval, avgInterval); // coefficient of variation
  const anomaly = Math.min(1, cv / 2); // normalize; high variance = irregular
  return { value: anomaly, confidence: confidenceScaling(intervals.length, 5), sampleSize: intervals.length };
}

// New: Seed interval CV metric for RNG Integrity
export function computeSeedIntervalCV(rotations?: SeedRotation[]): MetricResult {
  if (!rotations || rotations.length < 3) {
    return { value: 0, confidence: 0, sampleSize: rotations?.length || 0 };
  }
  const sorted = rotations.slice().sort((a, b) => a.ts - b.ts);
  const intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(sorted[i].ts - sorted[i - 1].ts);
  }
  const avgInterval = mean(intervals);
  const stdInterval = stdDev(intervals);
  const cv = safeDiv(stdInterval, avgInterval);
  // CV > 1 = high irregularity; normalize to anomaly score
  const anomaly = Math.min(1, cv);
  return { value: anomaly, confidence: confidenceScaling(intervals.length, 5), sampleSize: intervals.length };
}

// RTP Transparency
export function computePayoutDrift(spins: SpinRecord[], baseline?: Record<string, number>): MetricResult {
  if (!baseline || Object.keys(baseline).length === 0) {
    return { value: 0, confidence: 0, sampleSize: 0 };
  }
  const agg: Record<string, number> = {};
  let totalSymbols = 0;
  for (const s of spins) {
    for (const [sym, count] of Object.entries(s.symbolFreq || {})) {
      agg[sym] = (agg[sym] || 0) + count;
      totalSymbols += count;
    }
  }
  if (totalSymbols === 0) return { value: 0, confidence: 0, sampleSize: 0 };

  let chi = 0;
  for (const [sym, observedCount] of Object.entries(agg)) {
    const expectedP = baseline[sym] || 0;
    const expectedCount = expectedP * totalSymbols;
    if (expectedCount > 0) {
      chi += Math.pow(observedCount - expectedCount, 2) / expectedCount;
    }
  }
  const df = Math.max(Object.keys(agg).length - 1, 1);
  const normalized = chi / (df * 10); // heuristic scale
  return { value: Math.min(1, normalized), confidence: confidenceScaling(totalSymbols, 5000), sampleSize: totalSymbols };
}

export function computeRtpDriftScore(spins: SpinRecord[], theoreticalRTP?: number): MetricResult {
  if (!theoreticalRTP || spins.length === 0) {
    return { value: 0, confidence: 0, sampleSize: 0 };
  }
  const returns = spins.map(s => s.netWin);
  const observedMean = mean(returns);
  
  // Percentile-based calibration: compare observed vs expected within confidence bounds
  const p25 = percentile(returns, 0.25);
  const p75 = percentile(returns, 0.75);
  const iqr = p75 - p25;
  const lowerBound = theoreticalRTP - 1.5 * iqr;
  const upperBound = theoreticalRTP + 1.5 * iqr;
  
  // If observedMean falls outside bounds, flag anomaly
  let anomaly = 0;
  if (observedMean < lowerBound) {
    anomaly = Math.min(1, (lowerBound - observedMean) / Math.abs(theoreticalRTP || 1));
  } else if (observedMean > upperBound) {
    anomaly = Math.min(1, (observedMean - upperBound) / Math.abs(theoreticalRTP || 1));
  }
  
  return { value: anomaly, confidence: confidenceScaling(spins.length, 1000), sampleSize: spins.length };
}

// Volatility Consistency
export function computeVolatilityShift(spins: SpinRecord[]): MetricResult {
  if (spins.length < 30) return { value: 0, confidence: 0, sampleSize: spins.length };
  const returns = spins.map(s => s.netWin);
  let maxWin = -Infinity;
  let maxIdx = 0;
  returns.forEach((v, i) => {
    if (v > maxWin) {
      maxWin = v;
      maxIdx = i;
    }
  });
  const windowSize = Math.min(20, Math.floor(spins.length / 4));
  const pre = returns.slice(Math.max(0, maxIdx - windowSize), maxIdx);
  const post = returns.slice(maxIdx + 1, Math.min(spins.length, maxIdx + 1 + windowSize));
  const preVar = variance(pre);
  const postVar = variance(post);
  if (preVar === 0 && postVar === 0) return { value: 0, confidence: 1, sampleSize: spins.length };
  const shift = Math.abs(postVar - preVar) / (Math.max(preVar, postVar) || 1);
  return { value: Math.min(1, shift), confidence: confidenceScaling(spins.length, 300), sampleSize: spins.length };
}

export function computeBonusLatency(spins: SpinRecord[], bonusEvents?: BonusEvent[], expectedPerSpins?: number): MetricResult {
  if (!bonusEvents || bonusEvents.length < 2 || !expectedPerSpins || expectedPerSpins <= 0) {
    return { value: 0, confidence: 0, sampleSize: bonusEvents?.length || 0 };
  }
  const sorted = bonusEvents.slice().sort((a, b) => a.ts - b.ts);
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const start = sorted[i - 1].ts;
    const end = sorted[i].ts;
    const count = spins.filter(s => s.ts >= start && s.ts < end).length;
    intervals.push(count);
  }
  if (intervals.length === 0) return { value: 0, confidence: 0, sampleSize: 0 };
  const avg = mean(intervals);
  const ratio = avg / expectedPerSpins;
  const anomaly = ratio > 1 ? Math.min(1, (ratio - 1) / 2) : 0; // penalize slower only
  return { value: anomaly, confidence: confidenceScaling(intervals.length, 3), sampleSize: intervals.length };
}

export function computeFeatureIntervalVariance(bonusEvents?: BonusEvent[], expectedPerSpins?: number): MetricResult {
  if (!bonusEvents || bonusEvents.length < 3 || !expectedPerSpins) {
    return { value: 0, confidence: 0, sampleSize: bonusEvents?.length || 0 };
  }
  const sorted = bonusEvents.slice().sort((a, b) => a.ts - b.ts);
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(sorted[i].ts - sorted[i - 1].ts);
  }
  const observedVar = variance(intervals);
  const expectedVar = expectedPerSpins; // Poisson-like; variance ≈ mean
  const anomaly = Math.min(1, Math.abs(observedVar - expectedVar) / (expectedVar || 1));
  return { value: anomaly, confidence: confidenceScaling(intervals.length, 5), sampleSize: intervals.length };
}

// Session-Level Behavior
export function computeSeedRotationCorrelation(spins: SpinRecord[], rotations?: SeedRotation[]): MetricResult {
  if (!rotations || rotations.length < 2 || spins.length === 0) {
    return { value: 0, confidence: 0, sampleSize: rotations?.length || 0 };
  }
  const sortedRot = rotations.slice().sort((a, b) => a.ts - b.ts);
  const epochs: { start: number; end: number; mean: number }[] = [];
  for (let i = 0; i < sortedRot.length - 1; i++) {
    const start = sortedRot[i].ts;
    const end = sortedRot[i + 1].ts;
    const epochSpins = spins.filter(s => s.ts >= start && s.ts < end);
    if (epochSpins.length === 0) continue;
    const m = mean(epochSpins.map(s => s.netWin));
    epochs.push({ start, end, mean: m });
  }
  if (epochs.length < 3) return { value: 0, confidence: 0, sampleSize: epochs.length };
  const means = epochs.map(e => e.mean);
  const diffs: number[] = [];
  for (let i = 1; i < means.length; i++) diffs.push(Math.abs(means[i] - means[i - 1]));
  const avgDiff = mean(diffs);
  const overallMean = mean(means);
  const metric = safeDiv(avgDiff, Math.abs(overallMean) || 1);
  const anomaly = Math.min(1, metric / 5); // heuristic dampening
  return { value: anomaly, confidence: confidenceScaling(epochs.length, 5), sampleSize: epochs.length };
}

export function computeStreakClusterZ(spins: SpinRecord[]): MetricResult {
  if (spins.length < 100) return { value: 0, confidence: 0, sampleSize: spins.length };
  // Identify losing streaks (consecutive netWin < 0)
  const streaks: number[] = [];
  let currentStreak = 0;
  for (const s of spins) {
    if (s.netWin < 0) {
      currentStreak++;
    } else {
      if (currentStreak > 0) streaks.push(currentStreak);
      currentStreak = 0;
    }
  }
  if (currentStreak > 0) streaks.push(currentStreak);
  if (streaks.length < 5) return { value: 0, confidence: 0.3, sampleSize: streaks.length };
  const avgStreak = mean(streaks);
  const stdStreak = stdDev(streaks);
  const maxStreak = Math.max(...streaks);
  const z = safeDiv(maxStreak - avgStreak, stdStreak || 1);
  const anomaly = Math.min(1, z / 5); // z > 5 very unusual
  return { value: anomaly, confidence: confidenceScaling(streaks.length, 10), sampleSize: streaks.length };
}

export function computePostBonusSlopeScore(spins: SpinRecord[], bonusEvents?: BonusEvent[]): MetricResult {
  if (!bonusEvents || bonusEvents.length === 0 || spins.length < 50) {
    return { value: 0, confidence: 0, sampleSize: 0 };
  }
  // For each bonus, analyze next N spins
  const postWindow = 20;
  const slopes: number[] = [];
  for (const bonus of bonusEvents) {
    const idx = spins.findIndex(s => s.ts >= bonus.ts);
    if (idx === -1 || idx + postWindow > spins.length) continue;
    const postSpins = spins.slice(idx, idx + postWindow);
    const returns = postSpins.map(s => s.netWin);
    // simple linear regression slope
    const n = returns.length;
    const xMean = (n - 1) / 2;
    const yMean = mean(returns);
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (returns[i] - yMean);
      den += Math.pow(i - xMean, 2);
    }
    const slope = safeDiv(num, den);
    slopes.push(slope);
  }
  if (slopes.length === 0) return { value: 0, confidence: 0, sampleSize: 0 };
  const avgSlope = mean(slopes);
  // Negative slope = downward trend; penalize sustained negative
  const anomaly = avgSlope < 0 ? Math.min(1, Math.abs(avgSlope) / 0.5) : 0; // heuristic threshold
  return { value: anomaly, confidence: confidenceScaling(slopes.length, 3), sampleSize: slopes.length };
}

// Transparency & Ethics
export function computeDisclosureCompleteness(disclosures?: DisclosureChecklist): MetricResult {
  if (!disclosures) {
    return { value: 0.7, confidence: 1, sampleSize: 1 }; // missing checklist = high anomaly
  }
  const items = [
    disclosures.rtpVersionPublished,
    disclosures.auditReportPresent,
    !!disclosures.fairnessPolicyURL,
    !!disclosures.regulatorLicense,
  ];
  const satisfied = items.filter(Boolean).length;
  const completeness = satisfied / items.length;
  const anomaly = 1 - completeness;
  return { value: anomaly, confidence: 1, sampleSize: items.length };
}

export function computeAuditPresenceFlag(disclosures?: DisclosureChecklist): MetricResult {
  const present = disclosures?.auditReportPresent || false;
  return { value: present ? 0 : 1, confidence: 1, sampleSize: 1 };
}

// ────────────────────────────────────────────────────────────────────────────────
// Category Scoring
// ────────────────────────────────────────────────────────────────────────────────

interface MetricWeight {
  name: string;
  weight: number;
  compute: (data: CasinoData) => MetricResult;
  rationaleFragment: (val: number) => string;
}

const RNG_INTEGRITY_METRICS: MetricWeight[] = [
  {
    name: 'hashVerification',
    weight: 10,
    compute: (data) => computeHashVerification(data.hashVerifications),
    rationaleFragment: (v) => v > 0.1 ? 'Some hash verifications failed' : 'All hash verifications passed',
  },
  {
    name: 'rotationRegularity',
    weight: 5,
    compute: (data) => computeRotationRegularity(data.seedRotations),
    rationaleFragment: (v) => v > 0.3 ? 'Irregular seed rotation intervals' : 'Regular seed rotations',
  },
  {
    name: 'seedIntervalCV',
    weight: 5,
    compute: (data) => computeSeedIntervalCV(data.seedRotations),
    rationaleFragment: (v) => v > 0.8 ? 'High seed interval variability (CV > 0.8)' : 'Consistent seed rotation timing',
  },
];

const RTP_TRANSPARENCY_METRICS: MetricWeight[] = [
  {
    name: 'payoutDrift',
    weight: 8,
    compute: (data) => computePayoutDrift(data.spins, data.paytableBaseline),
    rationaleFragment: (v) => v > 0.3 ? 'Outcome distribution diverges from baseline paytable' : 'Distribution aligns with paytable',
  },
  {
    name: 'rtpDriftScore',
    weight: 8,
    compute: (data) => computeRtpDriftScore(data.spins, -0.02), // mock theoretical RTP
    rationaleFragment: (v) => v > 0.2 ? 'Observed RTP deviates from theoretical' : 'RTP within expected range',
  },
];

const VOLATILITY_CONSISTENCY_METRICS: MetricWeight[] = [
  {
    name: 'volatilityShift',
    weight: 8,
    compute: (data) => computeVolatilityShift(data.spins),
    rationaleFragment: (v) => v > 0.4 ? 'Variance spikes after large win' : 'Stable volatility profile',
  },
  {
    name: 'bonusLatency',
    weight: 6,
    compute: (data) => computeBonusLatency(data.spins, data.bonusEvents, data.expectedBonusPerSpins),
    rationaleFragment: (v) => v > 0.15 ? 'Bonus intervals slower than expected' : 'Bonus frequency as expected',
  },
  {
    name: 'featureIntervalVariance',
    weight: 6,
    compute: (data) => computeFeatureIntervalVariance(data.bonusEvents, data.expectedBonusPerSpins),
    rationaleFragment: (v) => v > 0.3 ? 'High variance in bonus intervals' : 'Consistent bonus spacing',
  },
];

const SESSION_BEHAVIOR_METRICS: MetricWeight[] = [
  {
    name: 'seedRotationCorrelation',
    weight: 6,
    compute: (data) => computeSeedRotationCorrelation(data.spins, data.seedRotations),
    rationaleFragment: (v) => v > 0.25 ? 'Payout shifts near seed rotations' : 'No rotation-payout correlation',
  },
  {
    name: 'streakClusterZ',
    weight: 7,
    compute: (data) => computeStreakClusterZ(data.spins),
    rationaleFragment: (v) => v > 0.35 ? 'Extended loss streak clusters detected' : 'Normal streak distribution',
  },
  {
    name: 'postBonusSlopeScore',
    weight: 7,
    compute: (data) => computePostBonusSlopeScore(data.spins, data.bonusEvents),
    rationaleFragment: (v) => v > 0.3 ? 'Downward trend after bonuses' : 'No post-bonus downturn',
  },
];

const TRANSPARENCY_ETHICS_METRICS: MetricWeight[] = [
  {
    name: 'disclosureCompleteness',
    weight: 10,
    compute: (data) => computeDisclosureCompleteness(data.disclosures),
    rationaleFragment: (v) => v > 0.5 ? 'Missing key disclosures (RTP/audit)' : 'Complete transparency checklist',
  },
  {
    name: 'auditPresenceFlag',
    weight: 5,
    compute: (data) => computeAuditPresenceFlag(data.disclosures),
    rationaleFragment: (v) => v > 0.5 ? 'No external audit report' : 'External audit present',
  },
];

function scoreCategory(metrics: MetricWeight[], data: CasinoData): CategoryScore {
  const results: Record<string, MetricResult> = {};
  let totalWeightedPenalty = 0;
  let totalWeight = 0;

  for (const m of metrics) {
    const result = m.compute(data);
    results[m.name] = result;
    const effectiveWeight = m.weight * result.confidence;
    totalWeightedPenalty += result.value * effectiveWeight;
    totalWeight += effectiveWeight;
  }

  const score = Math.max(0, Math.round(100 - totalWeightedPenalty));

  // Generate rationale: pick top 2 metrics by (value * weight)
  const sorted = metrics
    .map(m => ({ metric: m, result: results[m.name], impact: results[m.name].value * m.weight }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 2);

  const rationale = sorted.map(item => item.metric.rationaleFragment(item.result.value));

  const metricsSimple: Record<string, number> = {};
  for (const [k, v] of Object.entries(results)) {
    metricsSimple[k] = Math.round(v.value * 100) / 100;
  }

  return { score, metrics: metricsSimple, rationale };
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Grading Function
// ────────────────────────────────────────────────────────────────────────────────

export function gradeEngine(data: CasinoData): GradingOutput {
  const rngIntegrity = scoreCategory(RNG_INTEGRITY_METRICS, data);
  const rtpTransparency = scoreCategory(RTP_TRANSPARENCY_METRICS, data);
  const volatilityConsistency = scoreCategory(VOLATILITY_CONSISTENCY_METRICS, data);
  const sessionBehavior = scoreCategory(SESSION_BEHAVIOR_METRICS, data);
  const transparencyEthics = scoreCategory(TRANSPARENCY_ETHICS_METRICS, data);

  const categoryWeights = {
    rngIntegrity: 15,
    rtpTransparency: 25,
    volatilityConsistency: 20,
    sessionBehavior: 20,
    transparencyEthics: 20,
  };

  const compositeScore = Math.round(
    (rngIntegrity.score * categoryWeights.rngIntegrity +
      rtpTransparency.score * categoryWeights.rtpTransparency +
      volatilityConsistency.score * categoryWeights.volatilityConsistency +
      sessionBehavior.score * categoryWeights.sessionBehavior +
      transparencyEthics.score * categoryWeights.transparencyEthics) /
      100
  );

  return {
    casino: data.casino,
    categories: {
      rngIntegrity,
      rtpTransparency,
      volatilityConsistency,
      sessionBehavior,
      transparencyEthics,
    },
    compositeScore,
    disclaimer:
      'Advisory, data-driven anomaly-based grading. High anomaly values indicate statistical deviations requiring cautious interpretation, not definitive misconduct.',
    version: '0.1.0',
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// CLI
// ────────────────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log(`Usage: grading-engine <data.json> [--format json|text]`);
    process.exit(0);
  }

  const file = args[0];
  const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'json';

  const data: CasinoData = JSON.parse(fs.readFileSync(path.resolve(file), 'utf-8'));
  const result = gradeEngine(data);

  if (format === 'text') {
    console.log(`\n═══ TiltCheck Grading Report: ${result.casino} ═══\n`);
    console.log(`Composite Score: ${result.compositeScore}/100\n`);
    console.log(`Categories:`);
    for (const [key, cat] of Object.entries(result.categories)) {
      console.log(`  • ${key}: ${cat.score}/100`);
      cat.rationale.forEach(r => console.log(`    - ${r}`));
    }
    console.log(`\n${result.disclaimer}\n`);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

// Only run main if executed directly (ESM compatible check)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
