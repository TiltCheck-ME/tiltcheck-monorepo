/**
 * RGaaS Routes - /rgaas/*
 * Responsible Gaming as a Service.
 * Tilt detection, sentiment analysis, trust scoring, and link scanning.
 */

import { Router } from 'express';
import {
  createEvent,
  type BreathalyzerEvaluatedPayload,
  type SentimentFlaggedPayload,
} from '@tiltcheck/event-types';
import { evaluateBreathalyzer, evaluateSentiment } from '../lib/safety.js';
import { trustEngines } from '@tiltcheck/trust-engines';
import { suslink } from '@tiltcheck/suslink';
import { getUserTiltStatus } from '@tiltcheck/tiltcheck-core';

const router = Router();

/**
 * POST /rgaas/breathalyzer/evaluate
 * Evaluate tilt risk based on recent betting velocity and loss context.
 */
router.post('/breathalyzer/evaluate', (req, res) => {
  const { userId, eventsInWindow, windowMinutes, lossAmountWindow, streakLosses } = req.body ?? {};

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required', code: 'INVALID_USER_ID' });
    return;
  }
  if (!isFiniteNumber(eventsInWindow) || !isFiniteNumber(windowMinutes)) {
    res.status(400).json({
      error: 'eventsInWindow and windowMinutes must be numbers',
      code: 'INVALID_INPUT',
    });
    return;
  }

  const result = evaluateBreathalyzer({
    userId,
    eventsInWindow: Number(eventsInWindow),
    windowMinutes: Number(windowMinutes),
    lossAmountWindow: isFiniteNumber(lossAmountWindow) ? Number(lossAmountWindow) : undefined,
    streakLosses: isFiniteNumber(streakLosses) ? Number(streakLosses) : undefined,
  });

  const eventPayload: BreathalyzerEvaluatedPayload = {
    userId,
    riskScore: result.riskScore,
    riskTier: result.riskTier,
    eventsInWindow: Number(eventsInWindow),
    windowMinutes: Number(windowMinutes),
    recommendedCooldownMinutes: result.recommendedCooldownMinutes,
  };

  const event = createEvent({
    name: 'safety.breathalyzer.evaluated',
    source: 'api-gateway',
    payload: eventPayload,
    correlationId: req.headers['x-correlation-id'] as string | undefined,
  });

  res.json({
    success: true,
    result,
    event,
  });
});

/**
 * POST /rgaas/anti-tilt/evaluate
 * Evaluate user sentiment and decide intervention level.
 */
router.post('/anti-tilt/evaluate', (req, res) => {
  const { userId, message, distressSignals } = req.body ?? {};

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'userId is required', code: 'INVALID_USER_ID' });
    return;
  }
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message is required', code: 'INVALID_MESSAGE' });
    return;
  }

  const signals = Array.isArray(distressSignals)
    ? distressSignals.filter((signal): signal is string => typeof signal === 'string')
    : undefined;

  const result = evaluateSentiment({
    userId,
    message,
    distressSignals: signals,
  });

  const eventPayload: SentimentFlaggedPayload = {
    userId,
    score: result.score,
    severity: result.severity,
    matchedSignals: result.matchedSignals,
  };

  const event = createEvent({
    name: 'safety.sentiment.flagged',
    source: 'api-gateway',
    payload: eventPayload,
    correlationId: req.headers['x-correlation-id'] as string | undefined,
  });

  res.json({
    success: true,
    result,
    event,
  });
});

/**
 * GET /rgaas/trust/casino/:name
 * Get trust score and breakdown for a casino.
 */
router.get('/trust/casino/:name', (req, res) => {
  const { name } = req.params;
  const score = trustEngines.getCasinoScore(name);
  const breakdown = trustEngines.getCasinoBreakdown(name);
  const explanation = trustEngines.explainCasinoScore(name);

  res.json({
    success: true,
    casino: name,
    score,
    breakdown,
    explanation,
  });
});

/**
 * GET /rgaas/trust/user/:id
 * Get trust level and metrics for a user.
 */
router.get('/trust/user/:id', (req, res) => {
  const { id } = req.params;
  const level = trustEngines.getDegenScore(id);
  const breakdown = trustEngines.getDegenBreakdown(id);
  const explanation = trustEngines.explainDegenScore(id);

  res.json({
    success: true,
    userId: id,
    level,
    breakdown,
    explanation,
  });
});

/**
 * POST /rgaas/scan
 * Scan a URL for gambling-related risks.
 */
router.post('/scan', async (req, res) => {
  const { url, userId } = req.body ?? {};

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url is required', code: 'INVALID_URL' });
    return;
  }

  try {
    const result = await suslink.scanUrl(url, userId);
    res.json({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to scan URL',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /rgaas/profile/:userId
 * Unified Risk Profile for a user.
 */
router.get('/profile/:userId', (req, res) => {
  const { userId } = req.params;

  const trustLevel = trustEngines.getDegenScore(userId);
  const trustBreakdown = trustEngines.getDegenBreakdown(userId);
  const tiltStatus = getUserTiltStatus(userId);

  res.json({
    success: true,
    userId,
    profile: {
      trustLevel,
      riskScore: 100 - trustBreakdown.score, // Invert trust for risk
      onCooldown: tiltStatus.onCooldown,
      lossStreak: tiltStatus.lossStreak,
      recentSignals: tiltStatus.recentSignals,
      recommendation: (100 - trustBreakdown.score) > 60 || tiltStatus.onCooldown 
        ? 'INTERVENE_IMMEDIATELY' 
        : (100 - trustBreakdown.score) > 40 
          ? 'MONITOR_CLOSELY' 
          : 'NORMAL_PLAY',
    }
  });
});

export { router as rgaasRouter };

function isFiniteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}
