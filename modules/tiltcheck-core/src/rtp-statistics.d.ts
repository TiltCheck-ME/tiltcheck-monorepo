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
export declare function computeRtpZScore(observedRtp: number, claimedRtp: number, sampleSize: number): number;
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
export declare function computeRtpPValue(zScore: number): number;
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
export declare function computeMinSampleSize(claimedRtp: number, detectionDeltaPct: number, alpha?: number, power?: number): number;
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
export declare function assessRtpConfidence(observedRtp: number, claimedRtp: number, sampleSize: number): RtpConfidenceResult;
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
export declare function computeProviderFairnessGrade(meanNerfDelta: number, nerfFrequency: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
