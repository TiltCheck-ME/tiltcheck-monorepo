/**
 * Affiliate Routes - /affiliate/*
 * Affiliate trust score aggregation and weighting.
 */

import { Router } from 'express';
import {
  calculateAffiliateTrustScore,
  type AffiliateSourceRating,
  type TrustCategoryScores,
} from '@tiltcheck/trust-score-types';
import { createEvent, type AffiliateScoreUpdatedPayload } from '@tiltcheck/event-types';

const router = Router();

/**
 * POST /affiliate/score
 * Calculates affiliate trust score from multi-source category ratings.
 */
router.post('/score', (req, res) => {
  const { affiliateId, sources } = req.body ?? {};

  if (!affiliateId || typeof affiliateId !== 'string') {
    res.status(400).json({ error: 'affiliateId is required', code: 'INVALID_AFFILIATE_ID' });
    return;
  }

  if (!Array.isArray(sources) || sources.length === 0) {
    res.status(400).json({ error: 'sources array is required', code: 'INVALID_SOURCES' });
    return;
  }

  const parsedSources: AffiliateSourceRating[] = [];
  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      continue;
    }
    if (typeof source.source !== 'string' || !isCategoryScores(source.categories)) {
      continue;
    }

    parsedSources.push({
      source: source.source,
      lastUpdatedAt: typeof source.lastUpdatedAt === 'string' ? source.lastUpdatedAt : undefined,
      categories: source.categories,
    });
  }

  if (parsedSources.length === 0) {
    res.status(400).json({
      error: 'No valid source ratings provided',
      code: 'INVALID_SOURCE_PAYLOAD',
    });
    return;
  }

  const result = calculateAffiliateTrustScore(parsedSources);

  const eventPayload: AffiliateScoreUpdatedPayload = {
    affiliateId,
    score: result.score,
    categories: result.categories,
    sourceCount: result.sourceCount,
  };
  const event = createEvent({
    name: 'trust.affiliate.score.updated',
    source: 'api-gateway',
    payload: eventPayload,
    correlationId: req.headers['x-correlation-id'] as string | undefined,
  });

  res.json({
    success: true,
    affiliateId,
    result,
    event,
  });
});

export { router as affiliateRouter };

function isCategoryScores(value: unknown): value is TrustCategoryScores {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isFiniteNumber(candidate.fairness) &&
    isFiniteNumber(candidate.support) &&
    isFiniteNumber(candidate.payouts) &&
    isFiniteNumber(candidate.compliance) &&
    isFiniteNumber(candidate.bonusQuality)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
