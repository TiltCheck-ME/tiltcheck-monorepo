// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
/* Copyright (c) 2026 TiltCheck. All rights reserved. */
// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Trust Rollup Service
 * Aggregates trust.casino.updated and trust.domain.updated events hourly and publishes rollups.
 * Also fetches external casino data periodically for verification.
 * Lightweight in-memory implementation.
 */

import { eventRouter } from '@tiltcheck/event-router';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { validateRollupSnapshotFile } from './rollup-schema.js';
import { startCasinoVerificationScheduler } from './verification-scheduler.js';
import type { TiltCheckEvent, BonusUpdateEvent, BonusNerfDetectedEventData, TrustCasinoRollupEventData, DomainRollupData, TrustDomainRollupEventData, CasinoRollupData, RtpReportSubmittedEvent, ProviderFairnessScore } from '@tiltcheck/types';
import { computeRtpZScore, computeRtpPValue, computeMinSampleSize, computeProviderFairnessGrade } from '@tiltcheck/tiltcheck-core';

/**
 * Casino Trust Aggregator (real-time snapshot + volatility/risk classification)
 * Extends hourly rollup logic with a rolling 24h window per casino.
 */

interface CasinoRealTimeWindowEvent {
  ts: number;
  type: 'trust' | 'bonus-update' | 'bonus-nerf' | 'rtp-report';
  delta?: number; // trust delta or bonus change
  percentChange?: number; // bonus nerf percent drop
  severity?: number;
  // RTP-specific fields (type === 'rtp-report')
  providerName?: string;
  gameSlug?: string;
  reportedRtp?: number;
  providerMaxRtp?: number;
}

// Per-provider, per-game RTP window entry (keyed by providerName:gameSlug)
interface ProviderRtpWindowEntry {
  providerName: string;
  gameSlug: string;       // URL-safe identifier derived from gameTitle
  gameTitle: string;
  reports: { reportedRtp: number; reportedAt: number; source: 'extension' | 'community' }[];
  providerMaxRtp: number | null; // null until first report seeds it
}

interface CasinoTrustSnapshot {
  casinoName: string;
  currentScore: number;
  previousScore?: number;
  scoreDelta?: number;
  lastUpdated: number;
  severity?: number;
  volatility24h: number;
  events24h: number;
  nerfs24h: number;
  avgBonusChange24h?: number;
  percentNerfMax24h?: number;
  riskLevel: 'low' | 'watch' | 'elevated' | 'high' | 'critical';
  lastReasons: string[];
  sources: Set<string>;
  // Analytics metrics
  payoutDrift?: number; // 0-1 normalized absolute mean trust delta indicating directional bias
  volatilityShift?: number; // 0-1 magnitude of recent variance change (captures regime shift)
  /**
   * Weighted RTP delta aggregated across all tracked providers on this casino.
   * Calculated as the mean of (providerMaxRtp - latestReportedRtp) for each
   * provider/game pair where providerMaxRtp is known.
   *
   * Positive value = platform is running nerfed RTP versions (bad for players).
   * Example: Pragmatic Play on Stake = 0.5pp delta, on Roobet = 5.5pp delta.
   * weightedRtpDelta for Roobet will be significantly higher, lowering its trust score.
   */
  weightedRtpDelta?: number;
  /** Per-provider breakdown of RTP nerfing on this platform */
  providerRtpBreakdown?: { providerName: string; gameSlug: string; gameTitle: string; latestReportedRtp: number; providerMaxRtp: number; delta: number }[];
}

const CASINO_WINDOWS: Map<string, CasinoRealTimeWindowEvent[]> = new Map();
const CASINO_SNAPSHOTS: Map<string, CasinoTrustSnapshot> = new Map();
const REASONS: Map<string, string[]> = new Map();
const SOURCES: Map<string, Set<string>> = new Map();

// Provider-Platform RTP tracking
// Outer key: platformUrl (e.g. 'stake.com')
// Inner key: `${providerName}:${gameSlug}` (e.g. 'Pragmatic Play:gates-of-olympus')
//
// This is the structure that answers:
//   "What RTP is Pragmatic Play running on Stake vs Roobet?"
//
// CASINO_WINDOWS key = casinoName (e.g. 'Stake')
// PROVIDER_PLATFORM_RTP key = platformUrl (e.g. 'stake.com')
// Both must resolve to the same physical casino — the trust engine joins on platformName.
const PROVIDER_PLATFORM_RTP: Map<string, Map<string, ProviderRtpWindowEntry>> = new Map();
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_EVENTS_PER_WINDOW = 2000; // Hard cap per casino to prevent OOM
const MAX_REASONS_RETAINED = 50;

function pruneWindow(arr: CasinoRealTimeWindowEvent[]) {
  const cutoff = Date.now() - WINDOW_MS;
  // Prune by time
  while (arr.length && arr[0].ts < cutoff) arr.shift();
  // Prune by size (keep most recent)
  if (arr.length > MAX_EVENTS_PER_WINDOW) {
    arr.splice(0, arr.length - MAX_EVENTS_PER_WINDOW);
  }
}

// Periodic cleanup of inactive entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  for (const [casinoName, window] of CASINO_WINDOWS.entries()) {
    pruneWindow(window);
    if (window.length === 0) {
      // If window is empty after pruning (older than cutoff)
      CASINO_WINDOWS.delete(casinoName);
      REASONS.delete(casinoName);
      SOURCES.delete(casinoName);
    }
  }

  // Prune stale RTP reports from provider windows (keep last 24h per provider/game/platform)
  for (const [platformUrl, providerMap] of PROVIDER_PLATFORM_RTP.entries()) {
    for (const [providerKey, entry] of providerMap.entries()) {
      entry.reports = entry.reports.filter(r => r.reportedAt >= cutoff);
      if (entry.reports.length === 0) providerMap.delete(providerKey);
    }
    if (providerMap.size === 0) PROVIDER_PLATFORM_RTP.delete(platformUrl);
  }

  console.log(`[TrustRollup] Periodic cleanup completed. Cutoff: ${new Date(cutoff).toISOString()} | Active windows: ${CASINO_WINDOWS.size} | Active RTP platforms: ${PROVIDER_PLATFORM_RTP.size}`);
}, 60 * 60 * 1000); // Hourly cleanup

/** Convert a game title to a URL-safe slug (e.g. 'Gates of Olympus' -> 'gates-of-olympus') */
function toGameSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Compute the weighted_rtp_delta for a given casino platform.
 *
 * This is the specific block that differentiates Pragmatic Play on Stake
 * vs Pragmatic Play on Roobet:
 *
 *   platformUrl = 'stake.com'  -> Pragmatic Play 'Gates of Olympus' at 96.5%
 *                               -> providerMaxRtp = 96.5, delta = 0.0pp
 *
 *   platformUrl = 'roobet.com' -> Pragmatic Play 'Gates of Olympus' at 91.0%
 *                               -> providerMaxRtp = 96.5, delta = 5.5pp
 *
 * The mean delta across all tracked providers on that platform becomes the
 * weightedRtpDelta fed into CasinoTrustSnapshot, lowering the trust score
 * for platforms running consistently nerfed RTP versions.
 *
 * @param platformUrl - Casino domain key (e.g. 'stake.com')
 * @returns { weightedRtpDelta, breakdown } or null if no RTP data
 */
function computeWeightedRtpDelta(platformUrl: string): {
  weightedRtpDelta: number;
  breakdown: { providerName: string; gameSlug: string; gameTitle: string; latestReportedRtp: number; providerMaxRtp: number; delta: number }[];
} | null {
  const providerMap = PROVIDER_PLATFORM_RTP.get(platformUrl);
  if (!providerMap || providerMap.size === 0) return null;

  const breakdown: { providerName: string; gameSlug: string; gameTitle: string; latestReportedRtp: number; providerMaxRtp: number; delta: number }[] = [];

  for (const entry of providerMap.values()) {
    if (!entry.providerMaxRtp || entry.reports.length === 0) continue;
    // Use the most recent report as the current platform setting
    const latestReport = entry.reports[entry.reports.length - 1];
    const delta = entry.providerMaxRtp - latestReport.reportedRtp;
    breakdown.push({
      providerName: entry.providerName,
      gameSlug: entry.gameSlug,
      gameTitle: entry.gameTitle,
      latestReportedRtp: latestReport.reportedRtp,
      providerMaxRtp: entry.providerMaxRtp,
      delta,
    });
  }

  if (breakdown.length === 0) return null;

  const weightedRtpDelta = breakdown.reduce((sum, b) => sum + b.delta, 0) / breakdown.length;
  return { weightedRtpDelta, breakdown };
}

function stdDev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((sum, v) => sum + (v - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

/**
 * Classify the risk level for a casino based on volatility, nerf count,
 * and (critically) statistical confidence in the weighted RTP delta.
 *
 * Statistical gating: an RTP delta alone does NOT trigger "critical" unless
 * the sample size is sufficient AND the p-value confirms significance.
 * This prevents false positives from small-sample noise.
 *
 * @param weightedRtpDelta - Mean pp deficit across all tracked providers on this platform
 * @param rtpSampleSize    - Total reports contributing to weightedRtpDelta (for confidence gating)
 * @param claimedRtp       - Representative claimed RTP (used for min-sample calculation)
 */
function classifyRisk(
  volatility: number,
  nerfs24h: number,
  weightedRtpDelta?: number,
  rtpSampleSize?: number,
  claimedRtp?: number
): 'low' | 'watch' | 'elevated' | 'high' | 'critical' {
  if (weightedRtpDelta !== undefined && weightedRtpDelta > 0) {
    // Gate RTP-driven classification on statistical significance
    const sampleOk = rtpSampleSize !== undefined && rtpSampleSize > 0;
    let rtpIsSignificant = false;

    if (sampleOk && claimedRtp !== undefined) {
      const observedRtp = claimedRtp - weightedRtpDelta;
      const zScore = computeRtpZScore(observedRtp, claimedRtp, rtpSampleSize!);
      const pValue = computeRtpPValue(zScore);
      const minSample = computeMinSampleSize(claimedRtp, weightedRtpDelta);
      rtpIsSignificant = pValue < 0.05 && rtpSampleSize! >= minSample;
    }

    // Only escalate to "critical" or "high" when data supports it
    if (rtpIsSignificant) {
      if (weightedRtpDelta > 3.0) return 'critical';
      if (weightedRtpDelta > 1.1) return 'high';
    }
  }

  if (volatility < 0.15 && nerfs24h === 0) return 'low';
  if (volatility < 0.30 && nerfs24h <= 1) return 'watch';
  if (volatility < 0.50 && nerfs24h <= 2) return 'elevated';
  if (volatility < 0.70 || nerfs24h <= 3) return 'high';
  return 'critical';
}

function recomputeSnapshot(casinoName: string, currentScore?: number, previousScore?: number, severity?: number, platformUrl?: string) {
  const window = CASINO_WINDOWS.get(casinoName) || [];
  pruneWindow(window);
  const events24h = window.length;
  const nerfs24h = window.filter(e => e.type === 'bonus-nerf' || e.type === 'rtp-report').length;
  const bonusChanges = window.filter(e => e.type === 'bonus-update' && typeof e.delta === 'number').map(e => e.delta as number);
  const nerfPercents = window.filter(e => e.type === 'bonus-nerf' && typeof e.percentChange === 'number').map(e => e.percentChange as number);
  // Build volatility input: trust deltas + bonus percentage changes (nerfs weighted heavier)
  const volatilityInputs: number[] = [];
  for (const e of window) {
    if (e.type === 'trust' && typeof e.delta === 'number') volatilityInputs.push(e.delta);
    if (e.type === 'bonus-update' && typeof e.delta === 'number') volatilityInputs.push(e.delta);
    if (e.type === 'bonus-nerf' && typeof e.percentChange === 'number') volatilityInputs.push((e.percentChange as number) * 1.5);
    // RTP deviations contribute to volatility proportionally (weighted 2x — math evidence is stronger signal)
    if (e.type === 'rtp-report' && typeof e.providerMaxRtp === 'number' && typeof e.reportedRtp === 'number') {
      volatilityInputs.push((e.providerMaxRtp - e.reportedRtp) * 2);
    }
  }
  const rawStd = stdDev(volatilityInputs);
  // Normalize volatility: assume practical std dev upper bound ~50 (large swings); clamp 0-1
  const volatility24h = Math.min(1, rawStd / 50);
  const avgBonusChange24h = bonusChanges.length ? bonusChanges.reduce((a, b) => a + b, 0) / bonusChanges.length : undefined;
  const percentNerfMax24h = nerfPercents.length ? Math.max(...nerfPercents) : undefined;
  const lastReasons = REASONS.get(casinoName) || [];
  const sources = SOURCES.get(casinoName) || new Set();

  // Payout Drift Metric: mean of trust deltas absolute value normalized to cap (cap=25)
  const trustDeltas = window.filter(e => e.type === 'trust' && typeof e.delta === 'number').map(e => e.delta as number);
  const meanDelta = trustDeltas.length ? trustDeltas.reduce((a,b)=>a+b,0) / trustDeltas.length : 0;
  const payoutDrift = Math.min(1, Math.abs(meanDelta) / 25); // directional bias strength

  // Volatility Shift Metric: compare variance of last 10 trust deltas vs previous 10
  let volatilityShift: number | undefined;
  if (trustDeltas.length >= 20) {
    const recent = trustDeltas.slice(-10);
    const prior = trustDeltas.slice(-20, -10);
    const recentVar = stdDev(recent);
    const priorVar = stdDev(prior);
    const diff = Math.abs(recentVar - priorVar);
    // Normalize with cap diff=30
    volatilityShift = Math.min(1, diff / 30);
  }

  // -----------------------------------------------------------------------
  // Weighted RTP Delta: differentiates Pragmatic Play on Stake vs Roobet.
  //
  // Uses platformUrl to look up all provider/game RTP profiles for this
  // specific casino and computes the mean nerf delta across all tracked games.
  //
  // Example:
  //   Pragmatic Play 'Gates of Olympus' on stake.com = 96.5% (delta: 0.0pp)
  //   Pragmatic Play 'Gates of Olympus' on roobet.com = 91.0% (delta: 5.5pp)
  //   Hacksaw 'Chaos Crew' on roobet.com = 94.0% (delta: 2.0pp)
  //   => roobet.com weightedRtpDelta = (5.5 + 2.0) / 2 = 3.75pp -> CRITICAL
  //   => stake.com  weightedRtpDelta = (0.0) / 1 = 0.0pp -> no impact
  // -----------------------------------------------------------------------
  const rtpResult = platformUrl ? computeWeightedRtpDelta(platformUrl) : null;
  const weightedRtpDelta = rtpResult?.weightedRtpDelta;
  const providerRtpBreakdown = rtpResult?.breakdown;

  // Aggregate sample size and representative claimed RTP across all tracked providers
  // on this platform — needed for statistical confidence gating in classifyRisk
  const rtpSampleSize = providerRtpBreakdown
    ? providerRtpBreakdown.reduce((sum, e) => {
        const providerMap = platformUrl ? PROVIDER_PLATFORM_RTP.get(platformUrl) : undefined;
        const entry = providerMap?.get(`${e.providerName}:${e.gameSlug}`);
        return sum + (entry?.reports.length ?? 0);
      }, 0)
    : undefined;
  const representativeClaimedRtp = providerRtpBreakdown && providerRtpBreakdown.length > 0
    ? providerRtpBreakdown.reduce((sum, e) => sum + e.providerMaxRtp, 0) / providerRtpBreakdown.length
    : undefined;

  const snapshot: CasinoTrustSnapshot = {
    casinoName,
    currentScore: currentScore ?? (CASINO_SNAPSHOTS.get(casinoName)?.currentScore || 0),
    previousScore,
    scoreDelta: currentScore !== undefined && previousScore !== undefined ? currentScore - previousScore : undefined,
    lastUpdated: Date.now(),
    severity,
    volatility24h,
    events24h,
    nerfs24h,
    avgBonusChange24h,
    percentNerfMax24h,
    riskLevel: classifyRisk(volatility24h, nerfs24h, weightedRtpDelta, rtpSampleSize, representativeClaimedRtp),
    lastReasons: lastReasons.slice(-5),
    sources,
    payoutDrift,
    volatilityShift,
    weightedRtpDelta,
    providerRtpBreakdown,
  };
  CASINO_SNAPSHOTS.set(casinoName, snapshot);
  const rollupData: TrustCasinoRollupEventData = {
    casinos: {
      [casinoName]: {
        totalDelta: snapshot.scoreDelta || 0,
        events: snapshot.events24h,
      },
    },
    source: 'trust-rollup',
  };
  // Publish synthetic rollup snapshot for this casino only
  eventRouter.publish('trust.casino.rollup', 'trust-rollup', rollupData).catch(console.error);
}

// Public accessor
export function getCasinoSnapshots(): CasinoTrustSnapshot[] {
  return Array.from(CASINO_SNAPSHOTS.values()).sort((a, b) => {
    // Sort by risk severity then score descending
    const rank: Record<string, number> = { critical: 5, high: 4, elevated: 3, watch: 2, low: 1 };
    const diff = rank[b.riskLevel] - rank[a.riskLevel];
    if (diff !== 0) return diff;
    return b.currentScore - a.currentScore;
  });
}

// SSE clients
const sseClients: Set<http.ServerResponse> = new Set();
function broadcastSnapshots() {
  const payload = JSON.stringify(getCasinoSnapshots());
  for (const res of sseClients) {
    res.write(`data: ${payload}\n\n`);
  }
}

// Subscribe to events for real-time window maintenance
eventRouter.subscribe('trust.casino.updated', (evt: TiltCheckEvent<'trust.casino.updated'>) => {
  const { casinoName, previousScore, newScore, delta, severity, reason, source } = evt.data;
  if (!CASINO_WINDOWS.has(casinoName)) CASINO_WINDOWS.set(casinoName, []);
  CASINO_WINDOWS.get(casinoName)!.push({ ts: Date.now(), type: 'trust', delta, severity });
  if (reason) {
    const arr = REASONS.get(casinoName) || [];
    arr.push(reason);
    if (arr.length > MAX_REASONS_RETAINED) arr.shift();
    REASONS.set(casinoName, arr);
  }
  if (source) {
    if (!SOURCES.has(casinoName)) SOURCES.set(casinoName, new Set());
    const set = SOURCES.get(casinoName)!;
    set.add(source);
    // Cap unique sources per casino (highly unlikely to hit 100, but safe)
    if (set.size > 100) {
      const first = set.values().next().value;
      if (first) set.delete(first);
    }
  }
  recomputeSnapshot(casinoName, newScore ?? 0, previousScore, severity);
  broadcastSnapshots();
}, 'trust-rollup' as any);

eventRouter.subscribe('bonus.updated', (evt: TiltCheckEvent<'bonus.updated'>) => {
  const { casinoName, newAmount, oldAmount } = (evt.data as BonusUpdateEvent) || {};
  if (!casinoName) return;
  const delta = typeof newAmount === 'number' && typeof oldAmount === 'number' ? newAmount - oldAmount : undefined;
  if (!CASINO_WINDOWS.has(casinoName)) CASINO_WINDOWS.set(casinoName, []);
  CASINO_WINDOWS.get(casinoName)!.push({ ts: Date.now(), type: 'bonus-update', delta });
  recomputeSnapshot(casinoName);
  broadcastSnapshots();
}, 'trust-rollup' as any);

eventRouter.subscribe('bonus.nerf.detected', (evt: TiltCheckEvent<'bonus.nerf.detected'>) => {
  const { casinoName, percentDrop } = (evt.data as BonusNerfDetectedEventData) || {};
  if (!casinoName || typeof percentDrop !== 'number') return;
  if (!CASINO_WINDOWS.has(casinoName)) CASINO_WINDOWS.set(casinoName, []);
  CASINO_WINDOWS.get(casinoName)!.push({ ts: Date.now(), type: 'bonus-nerf', percentChange: percentDrop });
  recomputeSnapshot(casinoName);
  broadcastSnapshots();
}, 'trust-rollup' as any);

// -----------------------------------------------------------------------
// RTP Report Subscriber
//
// This is the Event Router bridge for the Chrome Extension.
// When the extension scrapes "The theoretical RTP of this game is XX.XX%"
// from a game info panel, it publishes rtp.report.submitted. This handler:
//   1. Ingests the report into PROVIDER_PLATFORM_RTP keyed by platformUrl
//   2. Resolves casinoName from platformUrl (best-effort via CASINO_SNAPSHOTS)
//   3. Pushes an rtp-report event into that casino's CASINO_WINDOWS
//   4. Calls recomputeSnapshot with platformUrl so computeWeightedRtpDelta
//      can differentiate "Pragmatic Play on stake.com" vs "Pragmatic Play on roobet.com"
// -----------------------------------------------------------------------
eventRouter.subscribe('rtp.report.submitted', (evt: TiltCheckEvent<'rtp.report.submitted'>) => {
  const report = evt.data as RtpReportSubmittedEvent;
  const { platformUrl, platformName, providerName, gameTitle, reportedRtp, reportedAt } = report;

  // Normalise game slug for map key
  const gameSlug = toGameSlug(gameTitle);
  const providerKey = `${providerName}:${gameSlug}`;

  // Ensure platform entry exists in PROVIDER_PLATFORM_RTP
  if (!PROVIDER_PLATFORM_RTP.has(platformUrl)) {
    PROVIDER_PLATFORM_RTP.set(platformUrl, new Map());
  }
  const providerMap = PROVIDER_PLATFORM_RTP.get(platformUrl)!;

  if (!providerMap.has(providerKey)) {
    providerMap.set(providerKey, {
      providerName,
      gameSlug,
      gameTitle,
      // First report seeds the entry; providerMaxRtp is null until set externally
      // (e.g. via CollectClock.registerRtpProfile or a known-good report).
      providerMaxRtp: null,
      reports: [],
    });
  }
  const entry = providerMap.get(providerKey)!;
  entry.reports.push({ reportedRtp, reportedAt, source: report.source });

  // If this is the first ever report and no max is known, bootstrap it.
  // Subsequent higher reports will update the max (assumes first reporter may see nerfed version).
  if (entry.providerMaxRtp === null || reportedRtp > entry.providerMaxRtp) {
    entry.providerMaxRtp = reportedRtp;
  }

  // Push into the per-casino real-time window so volatility includes RTP signal
  // Resolve casinoName: prefer explicit platformName, fall back to hostname-derived name
  const casinoName = platformName || platformUrl.replace(/^www\./, '').split('.')[0];
  if (!CASINO_WINDOWS.has(casinoName)) CASINO_WINDOWS.set(casinoName, []);
  CASINO_WINDOWS.get(casinoName)!.push({
    ts: Date.now(),
    type: 'rtp-report',
    reportedRtp,
    providerName,
    gameSlug,
    providerMaxRtp: entry.providerMaxRtp,
  });

  // Recompute snapshot — pass platformUrl so computeWeightedRtpDelta can run
  recomputeSnapshot(casinoName, undefined, undefined, undefined, platformUrl);
  broadcastSnapshots();

  console.log(`[TrustRollup] RTP report ingested: ${providerName} "${gameTitle}" on ${platformUrl} = ${reportedRtp}%`);
}, 'trust-rollup' as any);

interface AggregatedEntry {
  totalDelta: number;
  events: number;
  lastSeverity?: number;
  lastScore?: number;
}

// removed unused interface DomainRollupPayload
// removed unused interface CasinoRollupPayload

const HOUR_MS = 60 * 60 * 1000;

let windowStart = Date.now();
let domainAgg: Record<string, AggregatedEntry> = {};
let casinoAgg: Record<string, AggregatedEntry> = {};

function resetWindow() {
  windowStart = Date.now();
  domainAgg = {};
  casinoAgg = {};
}

function addEntry(store: Record<string, AggregatedEntry>, key: string, delta: number, severity?: number, score?: number) {
  if (!store[key]) {
    store[key] = { totalDelta: 0, events: 0 };
  }
  const entry = store[key];
  entry.totalDelta += delta || 0;
  entry.events += 1;
  if (severity !== undefined) entry.lastSeverity = severity;
  if (score !== undefined) entry.lastScore = score;
}

function publishRollups() {
  // windowEnd check removed as it was unused

  const domainRollupData: Record<string, DomainRollupData> = {};
  for (const key in domainAgg) {
    domainRollupData[key] = {
      totalDelta: domainAgg[key].totalDelta,
      events: domainAgg[key].events,
      lastSeverity: domainAgg[key].lastSeverity,
    };
  }
  const domainPayload: TrustDomainRollupEventData = { domains: domainRollupData };

  const casinoRollupData: Record<string, CasinoRollupData> = {};
  for (const key in casinoAgg) {
    casinoRollupData[key] = {
      totalDelta: casinoAgg[key].totalDelta,
      events: casinoAgg[key].events,
    };
  }
  const casinoPayload: TrustCasinoRollupEventData = { casinos: casinoRollupData, source: 'trust-rollup' };

  eventRouter.publish('trust.domain.rollup', 'trust-engine-casino', domainPayload).catch(console.error);
  eventRouter.publish('trust.casino.rollup', 'trust-engine-casino', casinoPayload).catch(console.error);
  persistSnapshots(domainPayload, casinoPayload);
  resetWindow();
}

// Subscribe to trust events
eventRouter.subscribe('trust.domain.updated', (evt: TiltCheckEvent<'trust.domain.updated'>) => {
  const d = evt.data;
  addEntry(domainAgg, d.domain, d.delta || 0, d.severity, d.newScore);
  maybeFlush();
}, 'trust-rollup' as any);

eventRouter.subscribe('trust.casino.updated', (evt: TiltCheckEvent<'trust.casino.updated'>) => {
  const c = evt.data;
  addEntry(casinoAgg, c.casinoName, c.delta || 0, c.severity, c.newScore);
  maybeFlush();
}, 'trust-rollup' as any);

function maybeFlush() {
  const now = Date.now();
  if (now - windowStart >= HOUR_MS) {
    publishRollups();
  }
}

// Manual flush API (for tests / immediate consumption)
export function flushTrustRollups() {
  publishRollups();
}

// Service sets ready immediately after subscriptions
const ready = true;
console.log('[TrustRollup] Service initialized');

// Write ready marker for health checks
try {
  fs.writeFileSync('/tmp/rollup-ready', 'ready');
  console.log('[TrustRollup] Ready marker written');
} catch (e) {
  console.error('[TrustRollup] Failed to write ready marker:', e);
}

// Start external casino verification scheduler
if (process.env.ENABLE_CASINO_VERIFICATION !== 'false') {
  startCasinoVerificationScheduler();
  console.log('[TrustRollup] Casino verification scheduler enabled');
} else {
  console.log('[TrustRollup] Casino verification scheduler disabled');
}

// Lightweight health server
const HEALTH_PORT = process.env.PORT || process.env.TRUST_ROLLUP_HEALTH_PORT || '8082';
http.createServer((req, res) => {
  if (req.url === '/health') {
    const body = JSON.stringify({ service: 'trust-rollup', ready, windowStart, domainKeys: Object.keys(domainAgg).length, casinoKeys: Object.keys(casinoAgg).length });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(body);
    return;
  }
  if (req.url === '/api/trust/casinos') {
    const snapshots = getCasinoSnapshots();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: snapshots, updatedAt: Date.now() }));
    return;
  }
  // GET /api/trust/providers[?platform=stake.com&provider=Pragmatic+Play]
  // Returns per-provider RTP performance data across all tracked platforms.
  // This is the "Private Math" ledger: shows weighted_rtp_delta per platform
  // and makes the Pragmatic Play on Stake vs Roobet comparison queryable.
  if (req.url?.startsWith('/api/trust/providers')) {
    const urlObj = new URL(req.url, `http://localhost:${HEALTH_PORT}`);
    const filterPlatform = urlObj.searchParams.get('platform') || undefined;
    const filterProvider = urlObj.searchParams.get('provider') || undefined;

    const result: {
      platformUrl: string;
      weightedRtpDelta: number | null;
      providers: { providerName: string; gameSlug: string; gameTitle: string; latestReportedRtp: number; providerMaxRtp: number | null; delta: number | null; reportCount: number }[];
    }[] = [];

    for (const [platformUrl, providerMap] of PROVIDER_PLATFORM_RTP.entries()) {
      if (filterPlatform && platformUrl !== filterPlatform) continue;
      const providers: typeof result[0]['providers'] = [];

      for (const entry of providerMap.values()) {
        if (filterProvider && entry.providerName !== filterProvider) continue;
        if (entry.reports.length === 0) continue;
        const latestRtp = entry.reports[entry.reports.length - 1].reportedRtp;
        const delta = entry.providerMaxRtp !== null ? entry.providerMaxRtp - latestRtp : null;
        providers.push({
          providerName: entry.providerName,
          gameSlug: entry.gameSlug,
          gameTitle: entry.gameTitle,
          latestReportedRtp: latestRtp,
          providerMaxRtp: entry.providerMaxRtp,
          delta,
          reportCount: entry.reports.length,
        });
      }

      if (providers.length === 0) continue;
      const rtpSummary = computeWeightedRtpDelta(platformUrl);
      result.push({ platformUrl, weightedRtpDelta: rtpSummary?.weightedRtpDelta ?? null, providers });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: result, updatedAt: Date.now() }));
    return;
  }
  // GET /api/trust/providers/leaderboard
  // Ranks providers by how consistently their games are nerfed across platforms.
  // S = hardest to nerf (players want these), F = systematically nerfed (avoid).
  if (req.url?.startsWith('/api/trust/providers/leaderboard')) {
    const providerTotals: Map<string, { deltas: number[]; nerfed: number; total: number }> = new Map();

    for (const providerMap of PROVIDER_PLATFORM_RTP.values()) {
      for (const entry of providerMap.values()) {
        if (!entry.providerMaxRtp || entry.reports.length === 0) continue;
        const latest = entry.reports[entry.reports.length - 1].reportedRtp;
        const delta = entry.providerMaxRtp - latest;
        if (!providerTotals.has(entry.providerName)) {
          providerTotals.set(entry.providerName, { deltas: [], nerfed: 0, total: 0 });
        }
        const p = providerTotals.get(entry.providerName)!;
        p.deltas.push(delta);
        p.total++;
        if (delta > 0.5) p.nerfed++;
      }
    }

    const leaderboard: ProviderFairnessScore[] = [];
    for (const [providerName, data] of providerTotals.entries()) {
      const meanNerfDelta = data.deltas.reduce((a, b) => a + b, 0) / data.deltas.length;
      const nerfFrequency = data.total > 0 ? data.nerfed / data.total : 0;
      leaderboard.push({
        providerName,
        platformCount: data.total,
        gameCount: data.total,
        meanNerfDelta,
        nerfFrequency,
        fairnessGrade: computeProviderFairnessGrade(meanNerfDelta, nerfFrequency),
        updatedAt: Date.now(),
      });
    }

    leaderboard.sort((a, b) => a.meanNerfDelta - b.meanNerfDelta); // Best (S) first

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: leaderboard, updatedAt: Date.now() }));
    return;
  }
  if (req.url?.startsWith('/api/trust/stream')) {
    // SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write(': connected\n\n');
    sseClients.add(res);
    // Initial push
    res.write(`data: ${JSON.stringify(getCasinoSnapshots())}\n\n`);
    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }
  res.writeHead(404); res.end();
}).listen(parseInt(HEALTH_PORT, 10), () => {
  console.log(`[TrustRollup] Health server listening on ${HEALTH_PORT}`);
});

// Persist snapshots to shared /app/data volume (works in Docker & local)
const SNAPSHOT_DIR = process.env.TRUST_ROLLUP_SNAPSHOT_DIR || path.join('/app', 'data');
const ROLLUP_FILE = path.join(SNAPSHOT_DIR, 'trust-rollups.json');

function persistSnapshots(domainPayload: TrustDomainRollupEventData, casinoPayload: TrustCasinoRollupEventData) {
  try {
    if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    const existingRaw = fs.existsSync(ROLLUP_FILE) ? JSON.parse(fs.readFileSync(ROLLUP_FILE, 'utf-8')) : { batches: [] };
    if (!validateRollupSnapshotFile(existingRaw)) {
      console.warn('[TrustRollup] Existing snapshot invalid, resetting');
      existingRaw.batches = [];
    }
    const existing = existingRaw as { batches: any[] };
    existing.batches.push({ generatedAt: new Date().toISOString(), domain: domainPayload, casino: casinoPayload });
    // Keep last 24 batches (24 hours) for lightweight retention
    if (existing.batches.length > 24) {
      existing.batches = existing.batches.slice(-24);
    }
    fs.writeFileSync(ROLLUP_FILE, JSON.stringify(existing, null, 2));
  } catch (err) {
    console.error('[TrustRollup] Failed to persist rollup snapshot', err);
  }
}

export const TRUST_ROLLUP_SNAPSHOT_PATH = ROLLUP_FILE;

// Read API
export function getCurrentAggregates() {
  return { domainAgg, casinoAgg, windowStart };
}

// Throttled event-based read responder
let lastSnapshotRespondTs = 0;
const SNAPSHOT_MIN_INTERVAL_MS = 5_000; // 5s throttle
eventRouter.subscribe('trust.state.requested', async (evt: any) => {
  const now = Date.now();
  if (now - lastSnapshotRespondTs < SNAPSHOT_MIN_INTERVAL_MS) {
    console.log('[TrustRollup] Snapshot request throttled');
    return;
  }
  lastSnapshotRespondTs = now;
  const scope = evt.data?.scope || 'both';
  const payload: any = { windowStart };
  if (scope === 'domain' || scope === 'both') payload.domainAgg = domainAgg;
  if (scope === 'casino' || scope === 'both') payload.casinoAgg = casinoAgg;
  await eventRouter.publish('trust.state.snapshot', 'trust-engine-casino', payload, evt.userId);
}, 'trust-rollup' as any);
