// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import { describe, it, expect } from 'vitest';
import {
  computeRtpZScore,
  computeRtpPValue,
  computeMinSampleSize,
  assessRtpConfidence,
  computeProviderFairnessGrade,
} from '../src/rtp-statistics.js';

// ─── computeRtpZScore ────────────────────────────────────────────────────────

describe('computeRtpZScore', () => {
  it('returns 0 for zero sample size', () => {
    expect(computeRtpZScore(90, 96, 0)).toBe(0);
  });

  it('returns 0 when observed RTP equals claimed RTP', () => {
    const z = computeRtpZScore(96, 96, 10_000);
    expect(z).toBeCloseTo(0, 5);
  });

  it('returns a negative z-score when observed RTP is below claimed', () => {
    // 93% observed vs 96% claimed at 10,000 spins
    const z = computeRtpZScore(93, 96, 10_000);
    expect(z).toBeLessThan(-10); // Should be highly significant
  });

  it('returns a positive z-score when observed RTP is above claimed', () => {
    const z = computeRtpZScore(99, 96, 10_000);
    expect(z).toBeGreaterThan(0);
  });

  it('produces larger negative z-score with larger sample size for same delta', () => {
    const zSmall = computeRtpZScore(93, 96, 100);
    const zLarge = computeRtpZScore(93, 96, 100_000);
    expect(zLarge).toBeLessThan(zSmall);
  });

  it('produces larger negative z-score for larger RTP gap', () => {
    const zSmall = computeRtpZScore(95, 96, 10_000);
    const zLarge = computeRtpZScore(90, 96, 10_000);
    expect(zLarge).toBeLessThan(zSmall);
  });

  it('reflects proportional deviation at 88% RTP vs 96.5% certified', () => {
    // Greed Premium scenario: Gates of Olympus tier manipulation
    const z = computeRtpZScore(88, 96.5, 50_000);
    expect(z).toBeLessThan(-50); // Massively significant
  });
});

// ─── computeRtpPValue ────────────────────────────────────────────────────────

describe('computeRtpPValue', () => {
  it('returns approximately 0.5 for z=0 (no deviation)', () => {
    expect(computeRtpPValue(0)).toBeCloseTo(0.5, 3);
  });

  it('returns p < 0.05 for z = -1.645 (95% significance threshold)', () => {
    expect(computeRtpPValue(-1.645)).toBeLessThan(0.05);
  });

  it('returns p < 0.01 for z = -2.33 (99% significance threshold)', () => {
    expect(computeRtpPValue(-2.33)).toBeLessThan(0.01);
  });

  it('returns p close to 0 for very negative z-scores', () => {
    expect(computeRtpPValue(-10)).toBeLessThan(1e-20);
  });

  it('returns p close to 1 for very positive z-scores', () => {
    expect(computeRtpPValue(10)).toBeGreaterThan(0.9999);
  });

  it('is symmetric: p(z) + p(-z) ≈ 1', () => {
    const z = 2.5;
    expect(computeRtpPValue(z) + computeRtpPValue(-z)).toBeCloseTo(1.0, 3);
  });
});

// ─── computeMinSampleSize ────────────────────────────────────────────────────

describe('computeMinSampleSize', () => {
  it('returns Infinity for zero detection delta', () => {
    expect(computeMinSampleSize(96, 0)).toBe(Infinity);
  });

  it('returns a positive integer for a valid scenario', () => {
    const n = computeMinSampleSize(96, 2);
    expect(Number.isFinite(n)).toBe(true);
    expect(n).toBeGreaterThan(0);
    expect(Number.isInteger(n)).toBe(true);
  });

  it('requires more samples to detect a smaller delta', () => {
    const nSmall = computeMinSampleSize(96, 0.5);
    const nLarge = computeMinSampleSize(96, 2.0);
    expect(nSmall).toBeGreaterThan(nLarge);
  });

  it('requires more samples at higher power', () => {
    const n80 = computeMinSampleSize(96, 2, 0.05, 0.80);
    const n95 = computeMinSampleSize(96, 2, 0.05, 0.95);
    expect(n95).toBeGreaterThan(n80);
  });

  it('requires more samples at lower alpha (stricter significance)', () => {
    const n05 = computeMinSampleSize(96, 2, 0.05, 0.80);
    const n01 = computeMinSampleSize(96, 2, 0.01, 0.80);
    expect(n01).toBeGreaterThan(n05);
  });

  it('produces a practically reasonable minimum for a 2pp delta at 96% RTP', () => {
    // With 80% power at 5% significance, detecting 2pp RTP gap should need ~200-5000 spins
    const n = computeMinSampleSize(96, 2);
    expect(n).toBeGreaterThan(100);
    expect(n).toBeLessThan(50_000);
  });
});

// ─── assessRtpConfidence ─────────────────────────────────────────────────────

describe('assessRtpConfidence', () => {
  it('returns an RtpConfidenceResult with all required fields', () => {
    const result = assessRtpConfidence(93, 96, 10_000);
    expect(result).toHaveProperty('observedRtp');
    expect(result).toHaveProperty('claimedRtp');
    expect(result).toHaveProperty('sampleSize');
    expect(result).toHaveProperty('delta');
    expect(result).toHaveProperty('zScore');
    expect(result).toHaveProperty('pValue');
    expect(result).toHaveProperty('minimumRequiredSample');
    expect(result).toHaveProperty('confidenceTier');
    expect(result).toHaveProperty('evidenceSummary');
    expect(result).toHaveProperty('isStatisticallySignificant');
  });

  it('classifies as confirmed_nerf for large sample + significant deviation', () => {
    // 93% observed vs 96% claimed at 50,000 spins — should be statistically impossible by chance
    const result = assessRtpConfidence(93, 96, 50_000);
    expect(result.confidenceTier).toBe('confirmed_nerf');
    expect(result.pValue).toBeLessThan(0.01);
  });

  it('classifies as insufficient_data for tiny sample', () => {
    const result = assessRtpConfidence(90, 96, 5);
    expect(result.confidenceTier).toBe('insufficient_data');
  });

  it('classifies as plausible_variance or insufficient_data when deviation is within noise for small sample', () => {
    const result = assessRtpConfidence(95.5, 96, 200);
    expect(['plausible_variance', 'insufficient_data']).toContain(result.confidenceTier);
  });

  it('returns a non-empty evidenceSummary string', () => {
    const result = assessRtpConfidence(93, 96, 50_000);
    expect(typeof result.evidenceSummary).toBe('string');
    expect(result.evidenceSummary.length).toBeGreaterThan(20);
  });

  it('reflects input values correctly in result', () => {
    const result = assessRtpConfidence(93.5, 96.5, 25_000);
    expect(result.observedRtp).toBe(93.5);
    expect(result.claimedRtp).toBe(96.5);
    expect(result.sampleSize).toBe(25_000);
  });

  it('sets isStatisticallySignificant=true for confirmed_nerf', () => {
    const result = assessRtpConfidence(93, 96, 50_000);
    expect(result.isStatisticallySignificant).toBe(true);
  });

  it('sets isStatisticallySignificant=false for insufficient_data', () => {
    const result = assessRtpConfidence(90, 96, 5);
    expect(result.isStatisticallySignificant).toBe(false);
  });

  it('delta is positive when observed is below claimed', () => {
    const result = assessRtpConfidence(93, 96, 10_000);
    expect(result.delta).toBeGreaterThan(0);
    expect(result.delta).toBeCloseTo(3, 5);
  });
});

// ─── computeProviderFairnessGrade ────────────────────────────────────────────

describe('computeProviderFairnessGrade', () => {
  it('returns S for minimal nerf delta and low frequency', () => {
    expect(computeProviderFairnessGrade(0.2, 0.05)).toBe('S');
  });

  it('returns A for moderate delta and frequency', () => {
    expect(computeProviderFairnessGrade(0.7, 0.15)).toBe('A');
  });

  it('returns B for elevated delta or frequency', () => {
    expect(computeProviderFairnessGrade(1.5, 0.25)).toBe('B');
  });

  it('returns C for concerning delta or frequency', () => {
    expect(computeProviderFairnessGrade(2.5, 0.45)).toBe('C');
  });

  it('returns D for high delta or frequency', () => {
    expect(computeProviderFairnessGrade(4.0, 0.60)).toBe('D');
  });

  it('returns F for systematic manipulation threshold', () => {
    expect(computeProviderFairnessGrade(6.0, 0.80)).toBe('F');
  });

  it('returns F when frequency alone meets the 70% threshold', () => {
    expect(computeProviderFairnessGrade(0.1, 0.75)).toBe('F');
  });

  it('returns F when delta alone meets the 5.0pp threshold', () => {
    expect(computeProviderFairnessGrade(5.5, 0.10)).toBe('F');
  });
});
