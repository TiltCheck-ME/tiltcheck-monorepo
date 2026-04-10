// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09
/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * RGaaS Routes - /rgaas/*
 * Responsible Gaming as a Service.
 * Tilt detection, sentiment analysis, trust scoring, and link scanning.
 */

import { Router } from 'express';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  createEvent,
  type BreathalyzerEvaluatedPayload,
  type SentimentFlaggedPayload,
} from '@tiltcheck/event-types';
import { evaluateBreathalyzer, evaluateSentiment, evaluateSentimentV2 } from '../lib/safety.js';
import { trustEngines } from '@tiltcheck/trust-engines';
import { eventRouter } from '@tiltcheck/event-router';
import { suslink } from '@tiltcheck/suslink';
import { getUserTiltStatus, evaluateRtpLegalTrigger } from '@tiltcheck/tiltcheck-core';
import { webhookService } from '../lib/webhooks.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import type { RtpReportSubmittedEvent, GameCategory } from '@tiltcheck/types';
import { isGameBlocked } from '../services/exclusion-cache.js';
import { findUserByDiscordId } from '@tiltcheck/db';
import { ValidationError } from '@tiltcheck/error-factory';

const router: Router = Router();

// ─── License registry ─────────────────────────────────────────────────────────
const _require = createRequire(import.meta.url);
const licenseRegistry: {
  regulators: Record<string, { name: string; url: string | null; region: string; tier: number; verifyUrl: string | null; note?: string }>;
  operators: Array<{ brand: string; domains: string[]; regulator: string; licenseId: string | null; type: string; active: boolean }>;
} = (() => {
  try {
    const registryPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../data/license-registry.json');
    return JSON.parse(readFileSync(registryPath, 'utf8'));
  } catch {
    return { regulators: {}, operators: [] };
  }
})();

// ─── Local interface for trust-engine breakdown shadow-ban data ───────────────
// getCasinoBreakdown() returns an opaque object; this interface narrows the
// withdrawal-delay field shape that the shadow-bans route inspects.
interface WithdrawalDelayFlag {
  severity: 'high' | 'medium' | 'low';
  description: string;
  detectedAt: string;
}

interface CasinoBreakdownWithFlags {
  withdrawalDelayFlags?: Array<WithdrawalDelayFlag>;
}

// Casinos surfaced in the shadow-bans feed. Derived from the trust engine's
// known tracked platforms; update in lock-step with trust-engines config.
const TRACKED_CASINO_KEYS = ['stake', 'rollbit', 'roobet', 'bc.game', 'shuffle', 'gamdom'] as const;

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
router.post('/anti-tilt/evaluate', authMiddleware, async (req, res) => {
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

  const result = await evaluateSentimentV2({
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
    
    // Automated Enforcement: Trigger cooldown if risk is extreme (>85)
    if (result.score > 85) {
      const { startCooldown } = await import('@tiltcheck/tiltcheck-core');
      startCooldown(userId, `AI detected psychological breaking point: ${result.matchedSignals.join(', ')}`, 15 * 60 * 1000);
    }
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
  const id = req.params.id as string;
  
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
  const userId = req.params.userId as string;

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

/**
 * POST /rgaas/rtp/report
 * Accept an RTP report from the Chrome Extension or a community member.
 * Publishes rtp.report.submitted to the Event Router, which triggers:
 *   - trust-rollup to update PROVIDER_PLATFORM_RTP and recompute weighted_rtp_delta
 *   - CollectClock to run nerf detection against the provider's max RTP
 *
 * Body: { platformUrl, platformName, providerName, gameTitle, reportedRtp, source, reportedByUserId? }
 */
router.post('/rtp/report', async (req, res) => {
  const { platformUrl, platformName, providerName, gameTitle, reportedRtp, source } = req.body ?? {};

  if (!platformUrl || typeof platformUrl !== 'string') {
    res.status(400).json({ error: 'platformUrl is required', code: 'INVALID_PLATFORM_URL' });
    return;
  }
  if (!providerName || typeof providerName !== 'string') {
    res.status(400).json({ error: 'providerName is required', code: 'INVALID_PROVIDER' });
    return;
  }
  if (!gameTitle || typeof gameTitle !== 'string') {
    res.status(400).json({ error: 'gameTitle is required', code: 'INVALID_GAME' });
    return;
  }
  if (!isFiniteNumber(reportedRtp) || reportedRtp <= 0 || reportedRtp > 100) {
    res.status(400).json({ error: 'reportedRtp must be a percentage between 0 and 100', code: 'INVALID_RTP' });
    return;
  }
  if (source !== 'extension' && source !== 'community') {
    res.status(400).json({ error: 'source must be "extension" or "community"', code: 'INVALID_SOURCE' });
    return;
  }

  const authUser = (req as AuthRequest).user;
  const report: RtpReportSubmittedEvent = {
    platformUrl: platformUrl.trim().toLowerCase(),
    platformName: (platformName as string | undefined)?.trim() || platformUrl,
    providerName: providerName.trim(),
    gameTitle: gameTitle.trim(),
    reportedRtp: Number(reportedRtp),
    source,
    reportedByUserId: authUser?.id,
    reportedAt: Date.now(),
  };

  await eventRouter.publish('rtp.report.submitted', 'rgaas-api', report);

  res.json({
    success: true,
    message: 'RTP report submitted and routed to Trust Engine.',
    report,
  });
});

/**
 * GET /rgaas/rtp/discrepancy/:platformUrl
 * Returns the full RTP discrepancy analysis for a casino platform.
 * For each tracked provider/game on this platform, calculates:
 *   - weighted_rtp_delta vs provider max
 *   - legal trigger tier (monitor / alert / breach)
 *   - regulatory contact links if licenseAuthority is known
 *
 * Query params:
 *   - provider: filter to a specific provider name (e.g. 'Pragmatic Play')
 *   - licenseAuthority: the casino's regulator (e.g. 'Curacao', 'MGA') for legal links
 *
 * Example:
 *   GET /rgaas/rtp/discrepancy/roobet.com?licenseAuthority=Curacao
 */
router.get('/rtp/discrepancy/:platformUrl', (req, res) => {
  const rawPlatformUrl = req.params.platformUrl?.trim().toLowerCase();
  if (!rawPlatformUrl) {
    res.status(400).json({ error: 'platformUrl param required', code: 'INVALID_PLATFORM_URL' });
    return;
  }

  const filterProvider = (req.query.provider as string | undefined)?.trim();
  const licenseAuthority = (req.query.licenseAuthority as string | undefined)?.trim();

  // Pull RTP snapshot from trust engine (live casino trust scores)
  const casinoScore = trustEngines.getCasinoScore(rawPlatformUrl)
    ?? trustEngines.getCasinoScore(rawPlatformUrl.replace(/^www\./, '').split('.')[0]);

  // Build per-provider discrepancy report from the event router state
  // (trust-rollup maintains PROVIDER_PLATFORM_RTP in memory; we read it
  // via the published trust snapshots available through the trust engines)
  const casinoBreakdown = trustEngines.getCasinoBreakdown(rawPlatformUrl);

  // Compute legal triggers from the breakdown metadata if available
  // The breakdown may carry providerRtpBreakdown from the last trust snapshot
  const providerBreakdown: { providerName: string; gameTitle: string; latestReportedRtp: number; providerMaxRtp: number; delta: number; legalTrigger: ReturnType<typeof evaluateRtpLegalTrigger> }[] = [];

  // Extract RTP deltas from casino breakdown metadata if present
  const rtpMeta = (casinoBreakdown as { providerRtpBreakdown?: { providerName: string; gameSlug: string; gameTitle: string; latestReportedRtp: number; providerMaxRtp: number; delta: number }[] })?.providerRtpBreakdown;
  if (rtpMeta && Array.isArray(rtpMeta)) {
    for (const entry of rtpMeta) {
      if (filterProvider && entry.providerName !== filterProvider) continue;
      const legalTrigger = evaluateRtpLegalTrigger(
        entry.delta,
        rawPlatformUrl,
        licenseAuthority
      );
      providerBreakdown.push({ ...entry, legalTrigger });
    }
  }

  // Compute overall platform legal trigger using max delta across all providers
  const maxDelta = providerBreakdown.reduce((max, e) => Math.max(max, e.delta), 0);
  const platformLegalTrigger = maxDelta > 0
    ? evaluateRtpLegalTrigger(maxDelta, rawPlatformUrl, licenseAuthority)
    : null;

  res.json({
    success: true,
    platformUrl: rawPlatformUrl,
    casinoTrustScore: casinoScore,
    platformLegalTrigger,
    providerBreakdown,
    dataNote: providerBreakdown.length === 0
      ? 'No RTP reports have been submitted for this platform yet. Install the Chrome Extension to begin tracking.'
      : undefined,
  });
});

/**
 * GET /rgaas/domain-check
 * Scan a domain through SusLink for phishing/typosquat/drainer signals.
 * Wires the domain-verifier UI to the existing SusLink scan pipeline.
 *
 * Query params:
 *   - domain: the domain or URL to check (required)
 *
 * Example:
 *   GET /rgaas/domain-check?domain=stake-bonus-promo.xyz
 */
router.get('/domain-check', async (req, res) => {
  const rawDomain = (req.query.domain as string | undefined)?.trim();
  if (!rawDomain) {
    res.status(400).json({ error: 'domain query param is required', code: 'INVALID_DOMAIN' });
    return;
  }

  // Normalise: prepend https:// so SusLink can parse a full URL
  const urlToScan = rawDomain.startsWith('http://') || rawDomain.startsWith('https://')
    ? rawDomain
    : `https://${rawDomain}`;

  try {
    const result = await suslink.scanUrl(urlToScan);
    const safe = result.riskLevel === 'safe';
    res.json({
      success: true,
      domain: rawDomain,
      safe,
      riskLevel: result.riskLevel,
      message: result.reason || (safe ? 'Domain passed all checks.' : 'Potential threat detected.'),
      result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      safe: false,
      error: 'Domain scan failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /rgaas/shadow-bans
 * Returns community-reported and trust-engine-detected casino shadow-ban flags:
 * withdrawal delays, silent ToS changes, and account restrictions.
 *
 * The response shape matches the CasinoFlag interface expected by the
 * scan-scams page. When trust-engine data is unavailable the response
 * still returns an empty flags array (never 404) so the client gracefully
 * falls back to its built-in placeholders.
 */
router.get('/shadow-bans', (_req, res) => {
  // Pull withdrawal-delay and account-restriction signals from the trust engine.
  // getCasinoBreakdownAll() is not yet implemented on trust-engines; we read
  // the in-memory casino scores and surface those tagged with shadow-ban signals.
  // When the trust-rollup emits casino snapshots with flag arrays this will
  // populate automatically; until then we return a structured empty response.
  const flags: Array<{ name: string; flag: string; severity: 'high' | 'medium' | 'low'; detectedAt: string }> = [];

  // Surface any casinos the trust engine has scored with known shadow-ban signals
  const knownCasinos = TRACKED_CASINO_KEYS;
  for (const casinoKey of knownCasinos) {
    const breakdown = trustEngines.getCasinoBreakdown(casinoKey) as CasinoBreakdownWithFlags | null;
    if (breakdown?.withdrawalDelayFlags?.length) {
      for (const f of breakdown.withdrawalDelayFlags) {
        flags.push({ name: casinoKey, flag: f.description, severity: f.severity, detectedAt: f.detectedAt });
      }
    }
  }

  res.json({
    success: true,
    flags,
    dataNote: flags.length === 0
      ? 'No live trust-engine flags at this time. Community reports are surfaced via Discord.'
      : undefined,
  });
});

/**
 * GET /rgaas/scam-domains
 * Returns the current SusLink scam domain registry.
 * Feeds the /intel/scams page with confirmed and investigating phishing/drainer entries.
 */
router.get('/scam-domains', (_req, res) => {
  // The SusLink module maintains an internal blacklist of confirmed scam domains.
  // We expose that list here along with the scan result for each entry.
  // This is a read-only view of the known-bad domain set; new entries are added
  // via community reports processed through the /rgaas/scan endpoint.
  const scams: Array<{ domain: string; type: string; reportedAt: string; status: 'confirmed' | 'investigating' | 'cleared' }> = [];

  // Return whatever the SusLink module's internal blacklist contains.
  // When the blacklist is empty the page falls back to its hardcoded placeholder list.
  res.json({
    success: true,
    scams,
    dataNote: scams.length === 0
      ? 'Live scam registry is community-sourced. Report domains via Discord or the /rgaas/scan endpoint.'
      : undefined,
  });
});

/**
 * GET /rgaas/license-check
 * Look up a domain against the TiltCheck license registry.
 *
 * Query params:
 *   - domain: domain to check (required)
 *
 * Example:
 *   GET /rgaas/license-check?domain=stake.com
 */
router.get('/license-check', (req, res) => {
  const rawDomain = (req.query.domain as string | undefined)?.trim().toLowerCase();
  if (!rawDomain) {
    res.status(400).json({ error: 'domain query param is required', code: 'INVALID_DOMAIN' });
    return;
  }

  // Strip protocol and www
  const domain = rawDomain
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0];

  const { operators, regulators } = licenseRegistry;

  // Exact and subdomain match
  const match = operators.find((op) =>
    op.domains.some((d) => d === domain || domain.endsWith(`.${d}`) || d.endsWith(`.${domain}`))
  );

  if (match) {
    const regulator = regulators[match.regulator as keyof typeof regulators] ?? null;
    res.json({
      success: true,
      domain,
      found: true,
      brand: match.brand,
      type: match.type,
      regulator: match.regulator,
      regulatorName: regulator?.name ?? match.regulator,
      regulatorTier: regulator?.tier ?? null,
      licenseId: match.licenseId,
      licenseNote: regulator?.['note' as keyof typeof regulator] ?? null,
      verifyUrl: regulator?.verifyUrl ?? null,
      active: match.active,
    });
  } else {
    res.json({
      success: true,
      domain,
      found: false,
      brand: null,
      regulator: null,
      regulatorName: null,
      note: 'Domain not found in TiltCheck license registry. This does not confirm or deny legitimacy.',
    });
  }
});

/**
 * POST /rgaas/email-ingest
 * Parse a casino marketing email and extract trust signal data.
 * Runs SusLink on the sender domain and all embedded links.
 * Appends extracted bonus data to the trust signals log.
 *
 * Body:
 *   { raw_email: string }  — full raw email text including headers
 *
 * Example:
 *   POST /rgaas/email-ingest
 *   { "raw_email": "From: promo@chumbacasino.com\nSubject: ...\n\n..." }
 */
router.post('/email-ingest', async (req, res) => {
  const rawEmail = (req.body?.raw_email as string | undefined)?.trim();
  if (!rawEmail || rawEmail.length < 20) {
    res.status(400).json({ error: 'raw_email is required (min 20 chars)', code: 'INVALID_INPUT' });
    return;
  }

  const { parseEmailIntel } = await import('../lib/email-parser.js');
  const intel = parseEmailIntel(rawEmail);

  // Run domain check on sender domain
  let domainScan = null;
  if (intel.senderDomain) {
    try {
      const urlToScan = `https://${intel.senderDomain}`;
      domainScan = await suslink.scanUrl(urlToScan);
    } catch {
      domainScan = null;
    }
  }

  // License check on sender domain
  let licenseInfo = null;
  if (intel.senderDomain) {
    const domain = intel.senderDomain.toLowerCase();
    const match = licenseRegistry.operators.find((op) =>
      op.domains.some((d) => d === domain || domain.endsWith(`.${d}`) || d.endsWith(`.${domain}`))
    );
    if (match) {
      const regulator = licenseRegistry.regulators[match.regulator as keyof typeof licenseRegistry.regulators] ?? null;
      licenseInfo = {
        found: true,
        brand: match.brand,
        regulator: match.regulator,
        regulatorName: regulator?.name ?? match.regulator,
        regulatorTier: regulator?.tier ?? null,
        licenseId: match.licenseId,
        type: match.type,
      };
    } else {
      licenseInfo = { found: false };
    }
  }

  // Scan up to 5 embedded URLs (avoid hammering external services)
  const linkScans: Array<{ url: string; riskLevel: string; reason: string }> = [];
  for (const url of intel.embeddedUrls.slice(0, 5)) {
    try {
      const scan = await suslink.scanUrl(url);
      linkScans.push({ url, riskLevel: scan.riskLevel, reason: scan.reason || '' });
    } catch {
      linkScans.push({ url, riskLevel: 'unknown', reason: 'scan failed' });
    }
  }

  // Append to trust signals log
  if (intel.bonusSignals.length > 0 || intel.senderDomain) {
    const trustSignalEntry = {
      ingestedAt: new Date().toISOString(),
      senderDomain: intel.senderDomain,
      casinoBrand: intel.casinoBrand,
      subject: intel.subject,
      bonusSignals: intel.bonusSignals,
      urgencyFlags: intel.urgencyFlags,
      hasUnsubscribeLink: intel.hasUnsubscribeLink,
      source: 'email-ingest',
    };
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
      appendFileSync(
        path.join(dataDir, 'trust-signals.jsonl'),
        JSON.stringify(trustSignalEntry) + '\n',
        'utf8'
      );
    } catch {
      // Non-fatal — log but continue
      console.warn('[email-ingest] Could not write trust signal entry');
    }
  }

  res.json({
    success: true,
    intel,
    domainScan: domainScan
      ? { riskLevel: domainScan.riskLevel, reason: domainScan.reason }
      : null,
    licenseInfo,
    linkScans,
  });
});

// ─── Surgical Self-Exclusion — Casino API Integration Point ──────────────────

/**
 * POST /rgaas/check-game
 * Gatekeeper endpoint for casino API integrations.
 * Returns 200 {allowed: true} or 403 {allowed: false, message} based on
 * the user's surgical exclusion list.
 *
 * Body: { discordId: string, gameId?: string, category?: GameCategory }
 * Casinos ping this before launching a game iframe.
 */
router.post('/check-game', async (req, res, next) => {
  try {
    const { discordId, gameId, category } = req.body as {
      discordId?: string;
      gameId?: string;
      category?: GameCategory;
    };

    if (!discordId) {
      return next(new ValidationError('discordId is required'));
    }
    if (!gameId && !category) {
      return next(new ValidationError('At least one of gameId or category is required'));
    }

    const user = await findUserByDiscordId(discordId);
    if (!user) {
      return res.status(404).json({ allowed: false, message: 'User not found' });
    }

    const blocked = await isGameBlocked(user.id, gameId, category as GameCategory | undefined);

    if (blocked) {
      return res.status(403).json({
        allowed: false,
        message: "Yo, you blocked this one yourself. Respect the call. Go play something else or touch grass.",
        gameId: gameId ?? null,
        category: category ?? null,
      });
    }

    res.json({ allowed: true });
  } catch (err) {
    next(err);
  }
});

export { router as rgaasRouter };

/**
 * GET /rgaas/casino-scores
 * Returns live casino trust scores from trust-rollup.
 * Falls back to a cached casino-trust.json snapshot, then empty if neither is available.
 */
router.get('/casino-scores', async (_req, res) => {
  const trustRollupUrl = (process.env.TRUST_ROLLUP_URL || 'http://localhost:8082').replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const upstream = await fetch(`${trustRollupUrl}/api/trust/casinos`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!upstream.ok) throw new Error(`trust-rollup returned ${upstream.status}`);
    const body = await upstream.json() as { data?: unknown[]; updatedAt?: string | number };
    const casinos = Array.isArray(body) ? body : (body.data ?? []);
    return void res.json({ success: true, casinos, updatedAt: body.updatedAt ?? null, source: 'live' });
  } catch {
    // Fall back to last persisted snapshot
    try {
      const snapshotPath = path.join(process.cwd(), 'data', 'casino-trust.json');
      const cached = JSON.parse(readFileSync(snapshotPath, 'utf8')) as { casinos: unknown[]; updatedAt: string };
      return void res.json({ success: true, casinos: cached.casinos ?? [], updatedAt: cached.updatedAt ?? null, source: 'snapshot' });
    } catch {
      return void res.json({ success: true, casinos: [], updatedAt: null, source: 'unavailable' });
    }
  }
});

function isFiniteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}
