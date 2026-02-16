/**
 * Safety Routes - /safety/*
 * Degen Breathalyzer and Anti-Tilt interventions.
 */

import { Router } from 'express';
import {
  createEvent,
  type BreathalyzerEvaluatedPayload,
  type SentimentFlaggedPayload,
} from '@tiltcheck/event-types';
import { LinkScanner } from '@tiltcheck/suslink';
import { evaluateBreathalyzer, evaluateSentiment } from '../lib/safety.js';

const router = Router();

/**
 * POST /safety/breathalyzer/evaluate
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
 * POST /safety/anti-tilt/evaluate
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
 * POST /safety/suslink/scan
 * Scan a URL for suspicious patterns using the SusLink engine.
 */
router.post('/suslink/scan', async (req, res) => {
  const { url } = req.body ?? {};

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url is required', code: 'INVALID_URL' });
    return;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      res.status(400).json({ error: 'URL must use http:// or https://', code: 'INVALID_PROTOCOL' });
      return;
    }
  } catch {
    res.status(400).json({ error: 'Invalid URL format', code: 'INVALID_URL_FORMAT' });
    return;
  }

  try {
    const scanner = new LinkScanner();
    const result = await scanner.scan(url);

    res.json({
      success: true,
      result: {
        url: result.url,
        riskLevel: result.riskLevel,
        reason: result.reason,
        scannedAt: result.scannedAt,
      },
    });
  } catch (err) {
    console.error('[Safety API] SusLink scan error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Scan failed', code: 'SCAN_FAILED' });
  }
});

export { router as safetyRouter };

function isFiniteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}
