/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, expect, it } from 'vitest';
import {
  calculateAffiliateTrustScore,
  calculateWeightedTrustScore,
  EQUAL_WEIGHTS_20,
} from '../src/index.js';

describe('trust-score-types', () => {
  it('calculates weighted score with 20% parity', () => {
    const result = calculateWeightedTrustScore(
      {
        fairness: 80,
        support: 60,
        payouts: 90,
        compliance: 70,
        bonusQuality: 50,
      },
      EQUAL_WEIGHTS_20,
    );

    expect(result.score).toBe(70);
  });

  it('aggregates affiliate score across sources', () => {
    const result = calculateAffiliateTrustScore([
      {
        source: 'askgamblers',
        categories: {
          fairness: 70,
          support: 75,
          payouts: 80,
          compliance: 65,
          bonusQuality: 60,
        },
      },
      {
        source: 'trustpilot',
        categories: {
          fairness: 60,
          support: 70,
          payouts: 75,
          compliance: 55,
          bonusQuality: 65,
        },
      },
    ]);

    expect(result.sourceCount).toBe(2);
    expect(result.categories.fairness).toBe(65);
    expect(result.score).toBe(67.5);
    expect(result.sourceCoverage).toBeCloseTo(0.67, 2);
  });
});
