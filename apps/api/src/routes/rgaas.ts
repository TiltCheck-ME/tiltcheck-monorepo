/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * RGaaS Routes - /rgaas/*
 * Responsible Gaming as a Service.
 * Tilt detection, sentiment analysis, trust scoring, and link scanning.
 */

import { Router } from 'express';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  createEvent,
  type BreathalyzerEvaluatedPayload,
  type SentimentFlaggedPayload,
} from '@tiltcheck/event-types';
import { evaluateBreathalyzer, evaluateSentiment } from '../lib/safety.js';
import { trustEngines } from '@tiltcheck/trust-engines';
import { eventRouter } from '@tiltcheck/event-router';
import { suslink } from '@tiltcheck/suslink';
import { getUserTiltStatus } from '@tiltcheck/tiltcheck-core';
import { webhookService } from '../lib/webhooks.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router: Router = Router();

/**
 * POST /rgaas/breathalyzer/evaluate
 * Evaluate tilt risk based on recent betting velocity and loss context.
 */
router.post('/breathalyzer/evaluate', authMiddleware, (req, res) => {
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

  if (result.riskScore > 60) {
    webhookService.dispatch('safety.breathalyzer.evaluated', { ...eventPayload, result });
  }

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
router.post('/anti-tilt/evaluate', authMiddleware, (req, res) => {
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

  if (result.severity === 'high') {
    webhookService.dispatch('safety.sentiment.flagged', { ...eventPayload, result });
  }

  res.json({
    success: true,
    result,
    event,
  });
});

/**
 * POST /rgaas/trust/degen-intel
 * Ingest watcher community report into local trust pipeline (no Elastic required).
 */
router.post('/trust/degen-intel', async (req, res) => {
  const requiredKey = (process.env.COMMUNITY_INTEL_INGEST_KEY || '').trim();
  
  // H4 Fix: Enforce ingest key in all environments. If not set, the endpoint is disabled.
  if (!requiredKey) {
    console.error('[API] COMMUNITY_INTEL_INGEST_KEY not set. Ingestion disabled.');
    res.status(503).json({ error: 'Ingestion service unavailable', code: 'DISABLED' });
    return;
  }

  const provided = String(req.headers['x-community-intel-key'] || '');
  if (provided !== requiredKey) {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_INGEST_KEY' });
    return;
  }

  const source = String(req.body?.source || 'channel-watcher');
  const report = String(req.body?.report || '').trim();
  const messageCount = Number(req.body?.messageCount || 0);
  const runAtISO = String(req.body?.runAtISO || new Date().toISOString());
  const signals = req.body?.signals && typeof req.body.signals === 'object' ? req.body.signals : {};
  const samples = Array.isArray(req.body?.samples) ? req.body.samples.slice(-50) : [];
  const casinoName = req.body?.casinoName ? String(req.body.casinoName) : undefined;

  if (!report) {
    res.status(400).json({ error: 'report is required', code: 'INVALID_REPORT' });
    return;
  }

  const signalNum = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const tiltSignalStrength =
    signalNum((signals as Record<string, unknown>).distressSignals) +
    signalNum((signals as Record<string, unknown>).scamSignals);
  const severity = Math.max(1, Math.min(5, Math.round(tiltSignalStrength / 3) || 1));
  const syntheticCommunityUser = `community:${source}`;

  try {
    // Feed degen trust engine via existing event bus
    await eventRouter.publish(
      'tilt.detected',
      'tiltcheck',
      {
        userId: syntheticCommunityUser,
        severity,
        reason: 'Community watcher intelligence ingest',
        tiltScore: severity,
        reportExcerpt: report.slice(0, 400),
        messageCount,
      },
      syntheticCommunityUser,
      { source, runAtISO }
    );

    // Also feed casino trust engine if casinoName is present
    await eventRouter.publish(
      'trust.degen-intel.ingested',
      'trust-engine-api',
      {
        source,
        reportExcerpt: report.slice(0, 400),
        severity,
        communityUserId: syntheticCommunityUser,
        trustLevel: trustEngines.getTrustLevel(trustEngines.getDegenScore(syntheticCommunityUser)),
        casinoName,
      }
    );

    // Persist raw intelligence to local JSONL for your own retrieval/indexing jobs.
    const outDir = path.join(process.cwd(), 'data');
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    const outFile = path.join(outDir, 'degen-intel-events.jsonl');
    const row = {
      timestamp: new Date().toISOString(),
      source,
      runAtISO,
      messageCount,
      severity,
      signals,
      report,
      samples,
    };
    appendFileSync(outFile, `${JSON.stringify(row)}
`);

    const trustLevel = trustEngines.getTrustLevel(trustEngines.getDegenScore(syntheticCommunityUser));
    
    // Async dispatch to partners
    webhookService.dispatch('trust.degen-intel.ingested', {
        source,
        severity,
        communityUserId: syntheticCommunityUser,
        trustLevel
    });

    res.json({
      success: true,
      ingested: true,
      communityUserId: syntheticCommunityUser,
      severity,
      trustLevel,
      outputFile: 'data/degen-intel-events.jsonl',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to ingest degen trust intelligence',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /rgaas/casinos
 * Retrieve all monitored casinos and their pillar-based trust scores.
 */
router.get('/casinos', (_req, res) => {
  const scores = trustEngines.getCasinoScores();
  res.json({
    success: true,
    casinos: scores,
  });
});

/**
 * POST /rgaas/audit
 * Trigger a system-wide trust score audit/recalculation.
 * Intended for Cloud Scheduler or manual override.
 */
router.post('/audit', (_req, res) => {
  // Publish an audit trigger event
  eventRouter.publish('trust.audit.trigger', 'trust-engine-api', {
    timestamp: Date.now(),
    reason: 'Manual or scheduled system-wide audit'
  });

  res.json({
    success: true,
    message: 'System-wide audit triggered. Scores will refresh asynchronously.',
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
router.get('/trust/user/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  // H3 Fix: Only allow users to see their own trust profile (unless admin)
  const authUser = (req as AuthRequest).user;
  if (authUser?.id !== id && !authUser?.roles?.includes('admin')) {
    res.status(403).json({ error: 'Forbidden: You can only access your own trust profile' });
    return;
  }
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
    
    if (result.riskLevel !== 'safe') {
        webhookService.dispatch('link.flagged', { url, userId, scan: result });
    }

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
router.get('/profile/:userId', authMiddleware, (req, res) => {
  const { userId } = req.params;

  // H3 Fix: Only allow users to see their own risk profile (unless admin)
  const authUser = (req as AuthRequest).user;
  if (authUser?.id !== userId && !authUser?.roles?.includes('admin')) {
    res.status(403).json({ error: 'Forbidden: You can only access your own risk profile' });
    return;
  }

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
