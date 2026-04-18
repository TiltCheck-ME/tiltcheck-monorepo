/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */
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
import { loadDomainBlacklist } from '../lib/live-feed-data.js';
import { evaluateBreathalyzer, evaluateSentiment } from '../lib/safety.js';
import { authMiddleware } from '../middleware/auth.js';
import { z, ZodError } from 'zod';

const router = Router();
const OUTBOUND_FETCH_TIMEOUT_MS = 8000;
const COMMUNITY_SIGNAL_LIMIT = 50;
const COMMUNITY_SIGNALS_FILE = 'community-signals.json';

const breathalyzerSchema = z.object({
  userId: z.string().trim().min(1),
  eventsInWindow: z.number().finite(),
  windowMinutes: z.number().finite(),
  lossAmountWindow: z.number().finite().optional(),
  streakLosses: z.number().finite().optional(),
});

const antiTiltSchema = z.object({
  userId: z.string().trim().min(1),
  message: z.string().trim().min(1),
  distressSignals: z.array(z.string()).optional(),
});

const suslinkScanSchema = z.object({
  url: z.string().trim().min(1),
});

const reportSchema = z.object({
  type: z.string().trim().min(1),
  details: z.string().trim().min(1),
  casino: z.string().trim().min(1),
});

const notifyBuddySchema = z.object({
  userId: z.string().trim().min(1).optional(),
  type: z.string().trim().min(1),
  data: z.record(z.string(), z.unknown()),
});

const touchGrassSchema = z.object({
  discordId: z.string().trim().min(1),
});

function getErrorMessage(error: ZodError): string {
  return error.issues[0]?.message || 'Invalid request body';
}

function fetchWithTimeout(input: string, init: RequestInit, timeoutMs = OUTBOUND_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(input, {
    ...init,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeout);
  });
}

/**
 * POST /safety/breathalyzer/evaluate
 * Evaluate tilt risk based on recent betting velocity and loss context.
 */
router.post('/breathalyzer/evaluate', (req, res) => {
  const parseResult = breathalyzerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: getErrorMessage(parseResult.error), code: 'INVALID_INPUT' });
    return;
  }

  const { userId, eventsInWindow, windowMinutes, lossAmountWindow, streakLosses } = parseResult.data;

  const result = evaluateBreathalyzer({
    userId,
    eventsInWindow,
    windowMinutes,
    lossAmountWindow,
    streakLosses,
  });

  const eventPayload: BreathalyzerEvaluatedPayload = {
    userId,
    riskScore: result.riskScore,
    riskTier: result.riskTier,
    eventsInWindow,
    windowMinutes,
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
  const parseResult = antiTiltSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: getErrorMessage(parseResult.error), code: 'INVALID_INPUT' });
    return;
  }

  const { userId, message, distressSignals } = parseResult.data;

  const result = evaluateSentiment({
    userId,
    message,
    distressSignals,
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
  const parseResult = suslinkScanSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: getErrorMessage(parseResult.error), code: 'INVALID_INPUT' });
    return;
  }

  const { url } = parseResult.data;

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
    const blacklistSnapshot = await loadDomainBlacklist();
    const scanner = new LinkScanner(blacklistSnapshot.domains);
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
router.post('/report', async (req, res) => {
  const parseResult = reportSchema.safeParse(req.body);
  const userId = (req as any).user?.id || 'guest';

  if (!parseResult.success) {
    res.status(400).json({ error: getErrorMessage(parseResult.error), code: 'INVALID_INPUT' });
    return;
  }

  const { type, details, casino } = parseResult.data;
  const signal = {
    id: `signal_${Date.now()}`,
    type,
    details,
    casino,
    reporterId: userId,
    createdAt: new Date().toISOString(),
  };

  try {
    const existingSignals = await readCommunitySignals();
    await writeCommunitySignals([signal, ...existingSignals].slice(0, COMMUNITY_SIGNAL_LIMIT));
    console.log(`[Community Signal] User ${userId} reported ${type} for ${casino}: ${details}`);
  } catch (error) {
    console.error('[Community Signal] Failed to persist report:', error);
    res.status(500).json({ error: 'Failed to store community signal', code: 'SIGNAL_STORE_FAILED' });
    return;
  }

  res.json({
    success: true,
    message: 'Signal shared with the community',
    id: signal.id
  });
});

/**
 * GET /safety/signals/recent
 * Return the latest community signals for the fairness watchdog feed.
 */
router.get('/signals/recent', async (_req, res) => {
  try {
    const signals = await readCommunitySignals();
    res.json({ success: true, signals: signals.slice(0, 8) });
  } catch (error) {
    console.error('[Community Signal] Failed to read recent signals:', error);
    res.status(500).json({ error: 'Failed to load recent signals', code: 'SIGNAL_READ_FAILED' });
  }
});

/**
 * POST /safety/notify-buddy
 * Trigger a support-only buddy accountability notification.
 */
router.post('/notify-buddy', authMiddleware, async (req, res) => {
  const parseResult = notifyBuddySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: getErrorMessage(parseResult.error), code: 'INVALID_INPUT' });
    return;
  }

  const { userId, type, data } = parseResult.data;
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

  const intervention = buildSafetyIntervention(actualUserId, type, data);

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
  const parseResult = touchGrassSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: getErrorMessage(parseResult.error), code: 'INVALID_INPUT' });
    return;
  }

  const { discordId } = parseResult.data;

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

async function readCommunitySignals(): Promise<Array<{
  id: string;
  type: string;
  details: string;
  casino: string;
  reporterId: string;
  createdAt: string;
}>> {
  const filePath = getCommunitySignalsPath();

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is {
          id: string;
          type: string;
          details: string;
          casino: string;
          reporterId: string;
          createdAt: string;
        } => typeof entry === 'object' && entry !== null)
      : [];
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function writeCommunitySignals(signals: Array<{
  id: string;
  type: string;
  details: string;
  casino: string;
  reporterId: string;
  createdAt: string;
}>): Promise<void> {
  const filePath = getCommunitySignalsPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(signals, null, 2), 'utf8');
}

function getCommunitySignalsPath(): string {
  const dataDir = process.env.STATS_DATA_DIR || path.resolve(process.cwd(), 'data');
  return path.join(dataDir, COMMUNITY_SIGNALS_FILE);
}

function buildSafetyIntervention(
  userId: string,
  type: string,
  data: Record<string, unknown>
): SafetyInterventionTriggeredEventData {
  const normalizedType = type.trim().toLowerCase();
  const message = shouldUseSupportOnlyMessage(normalizedType)
    ? supportOnlyInterventionMessage(normalizedType)
    : typeof data.message === 'string' && data.message.trim() !== ''
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
    metadata: sanitizeInterventionMetadata(type, data),
  };
}

function shouldUseSupportOnlyMessage(type: string): boolean {
  return type === 'phone_friend'
    || type === 'phone_friend_discord'
    || type === 'critical_tilt'
    || type === 'cooldown';
}

function supportOnlyInterventionMessage(type: string): string {
  switch (type) {
    case 'cooldown':
      return 'Cooldown triggered. Keep the check-in on pause, cash-out, water, or voice. No money asks, no transfer asks.';
    case 'phone_friend':
    case 'phone_friend_discord':
    case 'critical_tilt':
    default:
      return 'Accountability check-in required. Push a pause, a cash-out, or a voice check-in. Do not ask for money, tips, transfers, or wallet screenshots.';
  }
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

function sanitizeInterventionMetadata(type: string, data: Record<string, unknown>): Record<string, unknown> {
  const requestedAt = typeof data.timestamp === 'string'
    ? data.timestamp
    : typeof data.requestedAt === 'string'
      ? data.requestedAt
      : new Date().toISOString();

  const metadata: Record<string, unknown> = {
    sourceType: type,
    requestedAt,
    accountabilityMode: 'support_only',
    antiSolicitationPolicy: 'no-loans-no-tips-no-transfers',
    supportActions: [
      'tell them to pause',
      'tell them to cash out',
      'offer a voice check-in',
      'tell them to drink water and log off',
    ],
  };

  const passthroughKeys = ['guildId', 'voiceChannelId', 'inviteUrl', 'timestamp'];
  for (const key of passthroughKeys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim() !== '') {
      metadata[key] = value;
    }
  }

  return metadata;
}

async function forwardInterventionToBot(intervention: SafetyInterventionTriggeredEventData): Promise<unknown> {
  const botBaseUrl = process.env.DISCORD_BOT_INTERNAL_URL || 'https://bot.tiltcheck.me';
  const serviceSecret = process.env.INTERNAL_API_SECRET;

  if (!serviceSecret || serviceSecret.trim() === '') {
    throw new Error('INTERNAL_API_SECRET is required to deliver interventions to the Discord bot');
  }

  const response = await fetchWithTimeout(`${botBaseUrl.replace(/\/$/, '')}/internal/interventions`, {
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
