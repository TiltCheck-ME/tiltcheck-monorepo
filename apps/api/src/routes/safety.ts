/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12 */
/**
 * Safety Routes - /safety/*
 * Degen Breathalyzer and Anti-Tilt interventions.
 */

import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
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
    // Load local blacklist
    const dataDir = process.env.STATS_DATA_DIR || path.resolve(process.cwd(), 'data');
    const blacklistPath = path.join(dataDir, 'domain_blacklist.json');
    let blacklist: string[] = [];
    try {
      const raw = await fs.readFile(blacklistPath, 'utf8');
      blacklist = JSON.parse(raw);
    } catch {
      // Fallback if file missing
    }

    const scanner = new LinkScanner(blacklist);
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
    console.error('[Safety API] SusLink scan error:', err);
    res.status(500).json({ error: 'Internal scan error' });
  }
});

/**
 * POST /safety/report
 * Submit a community report about a casino.
 */
router.post('/report', (req, res) => {
  const { type, details, casino } = req.body ?? {};
  const userId = (req as any).user?.id || 'guest';

  if (!type || !details || !casino) {
    res.status(400).json({ error: 'Missing required fields', code: 'INVALID_INPUT' });
    return;
  }

  // In a real app, we'd save this to a database and trigger trust score recalculation.
  // For now, we'll log it and return success for the UX.
  console.log(`[Community Signal] User ${userId} reported ${type} for ${casino}: ${details}`);

  res.json({
    success: true,
    message: 'Signal shared with the community',
    id: `signal_${Date.now()}`
  });
});

/**
 * POST /safety/notify-buddy
 * Trigger a buddy system notification (e.g., Discord snitch).
 */
router.post('/notify-buddy', (req, res) => {
  const { userId, type, data } = req.body ?? {};
  const actualUserId = userId || (req as any).user?.id || 'guest';

  if (!type || !data) {
    res.status(400).json({ error: 'type and data are required', code: 'INVALID_INPUT' });
    return;
  }

  const event = createEvent({
    name: 'safety.intervention.triggered',
    source: 'api-gateway',
    payload: {
      userId: actualUserId,
      type,
      data,
      timestamp: Date.now(),
    },
    correlationId: req.headers['x-correlation-id'] as string | undefined,
  });

  // Log the intervention for audit/telemetry
  console.log(`[Buddy System] Intervention ${type} triggered for ${actualUserId}:`, data);

  res.json({
    success: true,
    message: 'Intervention signal emitted',
    event,
  });
});

// In-memory store for Touch Grass lockouts (persisted to Supabase when available)
const touchGrassLockouts = new Map<string, number>();

/**
 * POST /safety/touchgrass
 * Trigger a 24-hour emergency session lockout for the user.
 * Body: { discordId: string }
 */
router.post('/touchgrass', (req, res) => {
  const { discordId } = req.body ?? {};
  if (!discordId || typeof discordId !== 'string') {
    res.status(400).json({ error: 'discordId is required', code: 'INVALID_INPUT' });
    return;
  }

  const lockoutUntil = Date.now() + 24 * 60 * 60 * 1000;
  touchGrassLockouts.set(discordId, lockoutUntil);
  console.log(`[Touch Grass] 24hr lockout activated for ${discordId} until ${new Date(lockoutUntil).toISOString()}`);

  res.json({
    success: true,
    locked: true,
    discordId,
    lockedUntil: new Date(lockoutUntil).toISOString(),
    message: 'Touch Grass lockout active. Come back in 24 hours.',
  });
});

/**
 * GET /safety/touchgrass/:discordId
 * Check if a user is currently locked out.
 */
router.get('/touchgrass/:discordId', (req, res) => {
  const { discordId } = req.params;
  const lockoutUntil = touchGrassLockouts.get(discordId);

  if (!lockoutUntil || Date.now() >= lockoutUntil) {
    if (lockoutUntil) touchGrassLockouts.delete(discordId);
    res.json({ locked: false, discordId });
    return;
  }

  res.json({
    locked: true,
    discordId,
    lockedUntil: new Date(lockoutUntil).toISOString(),
    remainingMs: lockoutUntil - Date.now(),
  });
});

export { router as safetyRouter, touchGrassLockouts };

function isFiniteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}
