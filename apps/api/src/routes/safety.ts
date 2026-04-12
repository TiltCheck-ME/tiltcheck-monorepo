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
import type { SafetyInterventionTriggeredEventData } from '@tiltcheck/types';
import { LinkScanner } from '@tiltcheck/suslink';
import { evaluateBreathalyzer, evaluateSentiment } from '../lib/safety.js';
import { authMiddleware } from '../middleware/auth.js';

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
router.post('/notify-buddy', authMiddleware, async (req, res) => {
  const { userId, type, data } = req.body ?? {};
  const authenticatedUserId = (req as any).user?.id;
  const authenticatedDiscordId = (req as any).user?.discordId;
  const normalizedAuthenticatedUserId = typeof authenticatedDiscordId === 'string' && authenticatedDiscordId.trim() !== ''
    ? authenticatedDiscordId
    : typeof authenticatedUserId === 'string' && authenticatedUserId.trim() !== ''
      ? authenticatedUserId
      : null;

  if (!normalizedAuthenticatedUserId) {
    res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
    return;
  }

  if (typeof userId === 'string' && userId.trim() !== '' && userId !== normalizedAuthenticatedUserId) {
    res.status(403).json({ error: 'userId must match the authenticated user', code: 'FORBIDDEN' });
    return;
  }

  const actualUserId = normalizedAuthenticatedUserId;

  if (!type || typeof type !== 'string' || !data || typeof data !== 'object') {
    res.status(400).json({ error: 'type and data are required', code: 'INVALID_INPUT' });
    return;
  }

  const intervention = buildSafetyIntervention(actualUserId, type, data as Record<string, unknown>);

  const event = createEvent({
    name: 'safety.intervention.triggered',
    source: 'api-gateway',
    payload: intervention,
    correlationId: req.headers['x-correlation-id'] as string | undefined,
  });

  try {
    const botDelivery = await forwardInterventionToBot(intervention);
    console.log(`[Buddy System] Intervention ${type} delivered for ${actualUserId}:`, intervention.metadata);

    res.json({
      success: true,
      message: 'Intervention delivered to Discord bot',
      event,
      delivery: botDelivery,
    });
  } catch (error) {
    console.error(`[Buddy System] Failed to deliver intervention ${type} for ${actualUserId}:`, error);
    res.status(502).json({
      error: 'Failed to deliver intervention to Discord bot',
      code: 'BOT_DELIVERY_FAILED',
      event,
    });
  }
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

function buildSafetyIntervention(
  userId: string,
  type: string,
  data: Record<string, unknown>
): SafetyInterventionTriggeredEventData {
  const normalizedType = type.trim().toLowerCase();
  const message = typeof data.message === 'string' && data.message.trim() !== ''
    ? data.message
    : defaultInterventionMessage(normalizedType);
  const riskScore = typeof data.risk === 'number' && Number.isFinite(data.risk)
    ? Math.max(0, Math.min(100, data.risk))
    : normalizedType === 'phone_friend' || normalizedType === 'phone_friend_discord' || normalizedType === 'critical_tilt'
      ? 95
      : normalizedType === 'cooldown'
        ? 80
        : 65;

  const action = normalizedType === 'phone_friend'
    || normalizedType === 'phone_friend_discord'
    || normalizedType === 'critical_tilt'
    ? 'PHONE_FRIEND'
    : normalizedType === 'cooldown'
      ? 'COOLDOWN_LOCK'
      : normalizedType === 'redeem_nudge'
        ? 'PROFITS_VAULTED'
        : 'OVERLAY_MESSAGE';

  const interventionLevel = riskScore >= 90
    ? 'CRITICAL'
    : riskScore >= 75
      ? 'WARNING'
      : 'CAUTION';

  return {
    userId,
    riskScore,
    interventionLevel,
    action,
    displayText: message,
    metadata: {
      ...data,
      sourceType: type,
      requestedAt: typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString(),
    },
  };
}

function defaultInterventionMessage(type: string): string {
  switch (type) {
    case 'phone_friend':
    case 'phone_friend_discord':
    case 'critical_tilt':
      return 'You are spiraling. Join the accountability voice channel before this gets uglier.';
    case 'cooldown':
      return 'Cooldown triggered. Step away before you torch the next deposit.';
    case 'redeem_nudge':
      return 'You are up. Secure the win before the site rinses it back.';
    default:
      return 'TiltCheck flagged this session. Stop, breathe, and reset before you keep firing.';
  }
}

async function forwardInterventionToBot(intervention: SafetyInterventionTriggeredEventData): Promise<unknown> {
  const botBaseUrl = process.env.DISCORD_BOT_INTERNAL_URL || 'https://bot.tiltcheck.me';
  const serviceSecret = process.env.INTERNAL_API_SECRET;

  if (!serviceSecret || serviceSecret.trim() === '') {
    throw new Error('INTERNAL_API_SECRET is required to deliver interventions to the Discord bot');
  }

  const response = await fetch(`${botBaseUrl.replace(/\/$/, '')}/internal/interventions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(intervention),
  });

  const responseText = await response.text();
  const parsedResponse = responseText ? tryParseJson(responseText) : null;

  if (!response.ok) {
    throw new Error(`Discord bot returned ${response.status}: ${responseText}`);
  }

  return parsedResponse;
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
