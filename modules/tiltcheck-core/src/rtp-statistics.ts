// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * RTP Statistical Confidence Engine
 *
 * Converts raw RTP deltas into court-ready statistical evidence by applying
 * a one-sided z-test (normal approximation to the binomial distribution).
 *
 * Why this matters:
 *   A 3% RTP gap on 50 spins is noise. A 3% gap on 50,000 spins is fraud.
 *   This module answers: "Is this deviation statistically impossible, or just bad luck?"
 *
 * Math reference:
 *   - One-sided z-test for proportions: z = (p_hat - p0) / sqrt(p0*(1-p0)/n)
 *   - Normal CDF approximation via Abramowitz & Stegun erf formula 7.1.26
 *   - Minimum sample size via power analysis: n = (z_alpha + z_beta)^2 * p*(1-p) / delta^2
 */

import type { RtpConfidenceResult } from '@tiltcheck/types';

// ============================================================
// Math utilities (no external dependencies)
// ============================================================

/**
 * Error function approximation using Abramowitz & Stegun formula 7.1.26.
 * Max absolute error: 1.5e-7. Pure JS — no imports needed.
 */
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const ax = Math.abs(x);
  const t = 1.0 / (1.0 + 0.3275911 * ax);
  const poly =
    t * (0.254829592 +
    t * (-0.284496736 +
    t * (1.421413741 +
    t * (-1.453152027 +
    t * 1.061405429))));
  return sign * (1.0 - poly * Math.exp(-ax * ax));
}

/**
 * Standard normal CDF: P(Z <= z).
 * Uses the erf approximation above.
 */
function normalCdf(z: number): number {
  return 0.5 * (1.0 + erf(z / Math.SQRT2));
}

/**
 * Inverse normal CDF (quantile function) via rational approximation.
 * Accurate to ~1e-4 for p in [0.0001, 0.9999].
 * Used for power analysis / minimum sample size calculation.
 */
function normalInv(p: number): number {
  // Beasley-Springer-Moro algorithm (simplified Horner form)
  const a = [0, -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [0, -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[1]*r+a[2])*r+a[3])*r+a[4])*r+a[5])*r+a[6])*q /
           (((((b[1]*r+b[2])*r+b[3])*r+b[4])*r+b[5])*r+1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}

// ============================================================
// Core statistical functions
// ============================================================

/**
 * Compute the z-score for an observed RTP vs claimed RTP using a one-sided
 * z-test for proportions (normal approximation to binomial).
 *
 * Model: each spin is a Bernoulli trial where "success" = returning at least
 * the wagered amount. claimedRtp/100 is the claimed success probability p0.
 *
 * z = (observedRtp - claimedRtp) / SE
 * SE = sqrt(p0 * (1 - p0) / n)
 *
 * Negative z = observed RTP is lower than claimed (platform is paying out less).
 *
 * @param observedRtp  - Actual aggregate RTP from community sessions (e.g. 89.5)
 * @param claimedRtp   - Platform's advertised RTP (e.g. 94.0)
 * @param sampleSize   - Number of spins/sessions used to compute observedRtp
 */
export function computeRtpZScore(
  observedRtp: number,
  claimedRtp: number,
  sampleSize: number
): number {
  if (sampleSize <= 0) return 0;
  const p0 = claimedRtp / 100;
  const se = Math.sqrt((p0 * (1 - p0)) / sampleSize);
  if (se === 0) return 0;
  return (observedRtp / 100 - p0) / se;
}

/**
 * Compute the one-sided p-value for a given z-score.
 * Tests the left tail: P(Z <= z) — the probability of observing results
 * this low or lower if the claimed RTP were true.
 *
 * p < 0.05 = reject null hypothesis at 95% confidence.
 * p < 0.01 = reject null hypothesis at 99% confidence.
 *
 * @param zScore - Output of computeRtpZScore (negative = paying out less)
 */
export function computeRtpPValue(zScore: number): number {
  return normalCdf(zScore);
}

/**
 * Compute the minimum number of spins required to detect a given RTP delta
 * with the specified statistical power (default 80%) at significance level alpha.
 *
 * Uses the two-sample proportion power formula:
 *   n = (z_alpha + z_beta)^2 * p0*(1-p0) / delta^2
 *
 * @param claimedRtp        - Claimed RTP on this platform (e.g. 94.0)
 * @param detectionDeltaPct - Minimum delta to detect in percentage points (e.g. 2.0)
 * @param alpha             - Significance level (default 0.05 for 95% confidence)
 * @param power             - Statistical power (default 0.80)
 */
export function computeMinSampleSize(
  claimedRtp: number,
  detectionDeltaPct: number,
  alpha = 0.05,
  power = 0.80
): number {
  if (detectionDeltaPct <= 0) return Infinity;
  const p0 = claimedRtp / 100;
  const delta = detectionDeltaPct / 100;
  const zAlpha = -normalInv(alpha);        // e.g. 1.645 for alpha=0.05
  const zBeta = normalInv(power);          // e.g. 0.842 for power=0.80
  const n = Math.pow(zAlpha + zBeta, 2) * (p0 * (1 - p0)) / Math.pow(delta, 2);
  return Math.ceil(n);
}

// ============================================================
// Confidence tier classification
// ============================================================

const SIGNIFICANCE_THRESHOLDS = {
  BREACH_P: 0.01,   // p < 0.01 -> confirmed_nerf (99% confidence -> regulatory complaint)
  ALERT_P: 0.05,    // p < 0.05 -> likely_nerf (95% confidence -> request history)
  MONITOR_DELTA: 0.5, // delta >= 0.5pp -> worth monitoring
} as const;

/**
 * Full statistical assessment of an RTP discrepancy.
 *
 * This is the "court-ready" evidence block. It:
 *   1. Runs the z-test to get a p-value
 *   2. Calculates minimum required sample size for this specific delta
 *   3. Classifies the confidence tier
 *   4. Generates a human-readable evidence summary for the "Review Evidence" screen
 *
 * @param observedRtp  - Actual aggregate RTP from community sessions
 * @param claimedRtp   - Platform's advertised RTP (from game info panel scrape)
 * @param sampleSize   - Number of spins/sessions contributing to observedRtp
 */
export function assessRtpConfidence(
  observedRtp: number,
  claimedRtp: number,
  sampleSize: number
): RtpConfidenceResult {
  const delta = claimedRtp - observedRtp; // positive = platform paying less than claimed
  const zScore = computeRtpZScore(observedRtp, claimedRtp, sampleSize);
  const pValue = computeRtpPValue(zScore);
  const minimumRequiredSample = delta > 0
    ? computeMinSampleSize(claimedRtp, delta)
    : Infinity;

  let confidenceTier: RtpConfidenceResult['confidenceTier'];
  let isStatisticallySignificant = false;

  if (sampleSize < minimumRequiredSample) {
    confidenceTier = 'insufficient_data';
  } else if (pValue >= SIGNIFICANCE_THRESHOLDS.ALERT_P) {
    confidenceTier = 'plausible_variance';
  } else if (pValue >= SIGNIFICANCE_THRESHOLDS.BREACH_P) {
    confidenceTier = 'likely_nerf';
    isStatisticallySignificant = true;
  } else {
    confidenceTier = 'confirmed_nerf';
    isStatisticallySignificant = true;
  }

  const pPct = (pValue * 100).toFixed(2);
  const deltaPp = delta.toFixed(2);
  const evidenceSummary = buildEvidenceSummary(
    confidenceTier, delta, sampleSize, minimumRequiredSample, pValue, pPct, deltaPp
  );

  return {
    claimedRtp,
    observedRtp,
    sampleSize,
    delta,
    zScore,
    pValue,
    minimumRequiredSample,
    isStatisticallySignificant,
    confidenceTier,
    evidenceSummary,
  };
}

function buildEvidenceSummary(
  tier: RtpConfidenceResult['confidenceTier'],
  delta: number,
  sampleSize: number,
  minimumRequired: number,
  pValue: number,
  pPct: string,
  deltaPp: string
): string {
  switch (tier) {
    case 'insufficient_data':
      return `Deviation of ${deltaPp}pp detected across ${sampleSize.toLocaleString()} spins. `
        + `Minimum ${minimumRequired.toLocaleString()} spins required to confirm this is not random variance. `
        + `Continue monitoring — do not file a complaint yet.`;

    case 'plausible_variance':
      return `Deviation of ${deltaPp}pp across ${sampleSize.toLocaleString()} spins. `
        + `p-value: ${pPct}% — within the range of normal volatility. `
        + `This could be a bad run rather than a nerfed setting. Keep tracking.`;

    case 'likely_nerf':
      return `Deviation of ${deltaPp}pp across ${sampleSize.toLocaleString()} spins. `
        + `p-value: ${pPct}% — statistically significant at 95% confidence. `
        + `There is a less than 5% probability this is due to chance. `
        + `Recommended action: request your full game history export from the operator.`;

    case 'confirmed_nerf':
      return `Deviation of ${deltaPp}pp across ${sampleSize.toLocaleString()} spins. `
        + `p-value: ${pPct}% — statistically significant at 99% confidence. `
        + `The probability of this occurring by chance is less than 1%. `
        + `This constitutes a mathematical deviation from the advertised RTP. `
        + `Recommended action: file a Fairness Dispute with the casino's licensing authority, `
        + `attaching this analysis and your game history as supporting evidence.`;

    default:
      return `RTP analysis: ${deltaPp}pp deviation across ${sampleSize.toLocaleString()} spins (p=${pPct}%).`;
  }
}

// ============================================================
// Provider Fairness Grade
// ============================================================

/**
 * Assign a fairness grade to a provider based on how frequently and deeply
 * their games are nerfed across all tracked platforms.
 *
 * Grade scale (from best to worst):
 *   S — Rarely nerfed: mean delta < 0.5pp, nerf frequency < 10%
 *   A — Occasionally nerfed: mean delta < 1.0pp, nerf frequency < 20%
 *   B — Sometimes nerfed: mean delta < 2.0pp, nerf frequency < 30%
 *   C — Often nerfed: mean delta < 3.0pp or nerf frequency < 50%
 *   D — Frequently nerfed: mean delta < 5.0pp or nerf frequency < 70%
 *   F — Systematically nerfed: mean delta >= 5.0pp or nerf frequency >= 70%
 */
export function computeProviderFairnessGrade(
  meanNerfDelta: number,
  nerfFrequency: number
): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (meanNerfDelta >= 5.0 || nerfFrequency >= 0.70) return 'F';
  if (meanNerfDelta >= 3.0 || nerfFrequency >= 0.50) return 'D';
  if (meanNerfDelta >= 2.0 || nerfFrequency >= 0.30) return 'C';
  if (meanNerfDelta >= 1.0 || nerfFrequency >= 0.20) return 'B';
  if (meanNerfDelta >= 0.5 || nerfFrequency >= 0.10) return 'A';
  return 'S';
}
