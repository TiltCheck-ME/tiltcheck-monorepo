/**
 * @tiltcheck/trust-score-types
 * Canonical trust score models and scoring helpers.
 */

export const TRUST_SCORE_CATEGORIES = [
  'fairness',
  'support',
  'payouts',
  'compliance',
  'bonusQuality',
] as const;

export type TrustScoreCategory = (typeof TRUST_SCORE_CATEGORIES)[number];

export interface TrustCategoryScores {
  fairness: number;
  support: number;
  payouts: number;
  compliance: number;
  bonusQuality: number;
}

export type TrustWeights = Record<TrustScoreCategory, number>;

export interface TrustScoreBreakdown {
  score: number;
  categories: TrustCategoryScores;
  weights: TrustWeights;
}

export interface AffiliateSourceRating {
  source: string;
  lastUpdatedAt?: string;
  categories: TrustCategoryScores;
}

export interface AffiliateScoreResult extends TrustScoreBreakdown {
  sourceCount: number;
  sourceCoverage: number;
}

export const EQUAL_WEIGHTS_20: TrustWeights = {
  fairness: 0.2,
  support: 0.2,
  payouts: 0.2,
  compliance: 0.2,
  bonusQuality: 0.2,
};

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, score));
}

export function normalizeWeights(weights: TrustWeights = EQUAL_WEIGHTS_20): TrustWeights {
  const total = TRUST_SCORE_CATEGORIES.reduce((sum, category) => sum + weights[category], 0);
  if (total <= 0) {
    return EQUAL_WEIGHTS_20;
  }

  return {
    fairness: weights.fairness / total,
    support: weights.support / total,
    payouts: weights.payouts / total,
    compliance: weights.compliance / total,
    bonusQuality: weights.bonusQuality / total,
  };
}

export function sanitizeCategoryScores(scores: TrustCategoryScores): TrustCategoryScores {
  return {
    fairness: clampScore(scores.fairness),
    support: clampScore(scores.support),
    payouts: clampScore(scores.payouts),
    compliance: clampScore(scores.compliance),
    bonusQuality: clampScore(scores.bonusQuality),
  };
}

export function calculateWeightedTrustScore(
  scores: TrustCategoryScores,
  weights: TrustWeights = EQUAL_WEIGHTS_20,
): TrustScoreBreakdown {
  const safeScores = sanitizeCategoryScores(scores);
  const normalizedWeights = normalizeWeights(weights);

  const score = TRUST_SCORE_CATEGORIES.reduce((sum, category) => {
    return sum + safeScores[category] * normalizedWeights[category];
  }, 0);

  return {
    score: Math.round(score * 100) / 100,
    categories: safeScores,
    weights: normalizedWeights,
  };
}

export function aggregateAffiliateSources(sources: AffiliateSourceRating[]): TrustCategoryScores {
  if (sources.length === 0) {
    return {
      fairness: 0,
      support: 0,
      payouts: 0,
      compliance: 0,
      bonusQuality: 0,
    };
  }

  const totals: TrustCategoryScores = {
    fairness: 0,
    support: 0,
    payouts: 0,
    compliance: 0,
    bonusQuality: 0,
  };

  for (const source of sources) {
    const safe = sanitizeCategoryScores(source.categories);
    totals.fairness += safe.fairness;
    totals.support += safe.support;
    totals.payouts += safe.payouts;
    totals.compliance += safe.compliance;
    totals.bonusQuality += safe.bonusQuality;
  }

  const divisor = sources.length;
  return {
    fairness: Math.round((totals.fairness / divisor) * 100) / 100,
    support: Math.round((totals.support / divisor) * 100) / 100,
    payouts: Math.round((totals.payouts / divisor) * 100) / 100,
    compliance: Math.round((totals.compliance / divisor) * 100) / 100,
    bonusQuality: Math.round((totals.bonusQuality / divisor) * 100) / 100,
  };
}

export function calculateAffiliateTrustScore(
  sources: AffiliateSourceRating[],
  weights: TrustWeights = EQUAL_WEIGHTS_20,
): AffiliateScoreResult {
  const categories = aggregateAffiliateSources(sources);
  const weighted = calculateWeightedTrustScore(categories, weights);
  const sourceCount = sources.length;
  const sourceCoverage = Math.min(1, sourceCount / 3);

  return {
    ...weighted,
    sourceCount,
    sourceCoverage: Math.round(sourceCoverage * 100) / 100,
  };
}
