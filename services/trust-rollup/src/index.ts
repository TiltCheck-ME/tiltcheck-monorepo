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
import type { TiltCheckEvent, TrustCasinoUpdateEvent, TrustDomainUpdateEvent } from '@tiltcheck/types';

/**
 * Casino Trust Aggregator (real-time snapshot + volatility/risk classification)
 * Extends hourly rollup logic with a rolling 24h window per casino.
 */

interface CasinoRealTimeWindowEvent {
  ts: number;
  type: 'trust' | 'bonus-update' | 'bonus-nerf';
  delta?: number; // trust delta or bonus change
  percentChange?: number; // bonus nerf percent drop
  severity?: number;
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
  // New analytics metrics
  payoutDrift?: number; // 0-1 normalized absolute mean trust delta indicating directional bias
  volatilityShift?: number; // 0-1 magnitude of recent variance change (captures regime shift)
}

const CASINO_WINDOWS: Map<string, CasinoRealTimeWindowEvent[]> = new Map();
const CASINO_SNAPSHOTS: Map<string, CasinoTrustSnapshot> = new Map();
const REASONS: Map<string, string[]> = new Map();
const SOURCES: Map<string, Set<string>> = new Map();
const WINDOW_MS = 24 * 60 * 60 * 1000;

function pruneWindow(arr: CasinoRealTimeWindowEvent[]) {
  const cutoff = Date.now() - WINDOW_MS;
  while (arr.length && arr[0].ts < cutoff) arr.shift();
}

function stdDev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((sum, v) => sum + (v - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

function classifyRisk(volatility: number, nerfs24h: number): 'low' | 'watch' | 'elevated' | 'high' | 'critical' {
  if (volatility < 0.15 && nerfs24h === 0) return 'low';
  if (volatility < 0.30 && nerfs24h <= 1) return 'watch';
  if (volatility < 0.50 && nerfs24h <= 2) return 'elevated';
  if (volatility < 0.70 || nerfs24h <= 3) return 'high';
  return 'critical';
}

function recomputeSnapshot(casinoName: string, currentScore?: number, previousScore?: number, severity?: number) {
  const window = CASINO_WINDOWS.get(casinoName) || [];
  pruneWindow(window);
  const events24h = window.length;
  const nerfs24h = window.filter(e => e.type === 'bonus-nerf').length;
  const bonusChanges = window.filter(e => e.type === 'bonus-update' && typeof e.delta === 'number').map(e => e.delta as number);
  const nerfPercents = window.filter(e => e.type === 'bonus-nerf' && typeof e.percentChange === 'number').map(e => e.percentChange as number);
  // Build volatility input: trust deltas + bonus percentage changes (nerfs weighted heavier)
  const volatilityInputs: number[] = [];
  for (const e of window) {
    if (e.type === 'trust' && typeof e.delta === 'number') volatilityInputs.push(e.delta);
    if (e.type === 'bonus-update' && typeof e.delta === 'number') volatilityInputs.push(e.delta);
    if (e.type === 'bonus-nerf' && typeof e.percentChange === 'number') volatilityInputs.push((e.percentChange as number) * 1.5);
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
    riskLevel: classifyRisk(volatility24h, nerfs24h),
    lastReasons: lastReasons.slice(-5),
    sources,
    payoutDrift,
    volatilityShift
  };
  CASINO_SNAPSHOTS.set(casinoName, snapshot);
  // Publish synthetic rollup snapshot for this casino only
  eventRouter.publish('trust.casino.rollup', 'trust-rollup', snapshot).catch(console.error);
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
eventRouter.subscribe('trust.casino.updated', (evt: TiltCheckEvent<TrustCasinoUpdateEvent>) => {
  const { casinoName, previousScore, newScore, delta, severity, reason, source } = evt.data;
  if (!CASINO_WINDOWS.has(casinoName)) CASINO_WINDOWS.set(casinoName, []);
  CASINO_WINDOWS.get(casinoName)!.push({ ts: Date.now(), type: 'trust', delta, severity });
  if (reason) {
    const arr = REASONS.get(casinoName) || [];
    arr.push(reason);
    REASONS.set(casinoName, arr);
  }
  if (source) {
    if (!SOURCES.has(casinoName)) SOURCES.set(casinoName, new Set());
    SOURCES.get(casinoName)!.add(source);
  }
  recomputeSnapshot(casinoName, newScore ?? 0, previousScore, severity);
  broadcastSnapshots();
}, 'trust-rollup' as any);

eventRouter.subscribe('bonus.updated', (evt: TiltCheckEvent<any>) => {
  const { casinoName, newAmount, oldAmount } = evt.data || {};
  if (!casinoName) return;
  const delta = typeof newAmount === 'number' && typeof oldAmount === 'number' ? newAmount - oldAmount : undefined;
  if (!CASINO_WINDOWS.has(casinoName)) CASINO_WINDOWS.set(casinoName, []);
  CASINO_WINDOWS.get(casinoName)!.push({ ts: Date.now(), type: 'bonus-update', delta });
  recomputeSnapshot(casinoName);
  broadcastSnapshots();
}, 'trust-rollup' as any);

eventRouter.subscribe('bonus.nerf.detected', (evt: TiltCheckEvent<any>) => {
  const { casinoName, percentDrop } = evt.data || {};
  if (!casinoName || typeof percentDrop !== 'number') return;
  if (!CASINO_WINDOWS.has(casinoName)) CASINO_WINDOWS.set(casinoName, []);
  CASINO_WINDOWS.get(casinoName)!.push({ ts: Date.now(), type: 'bonus-nerf', percentChange: percentDrop });
  recomputeSnapshot(casinoName);
  broadcastSnapshots();
}, 'trust-rollup' as any);

interface AggregatedEntry {
  totalDelta: number;
  events: number;
  lastSeverity?: number;
  lastScore?: number;
}

interface DomainRollupPayload {
  windowStart: number;
  windowEnd: number;
  domains: Record<string, AggregatedEntry>;
}

interface CasinoRollupPayload {
  windowStart: number;
  windowEnd: number;
  casinos: Record<string, AggregatedEntry>;
}

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
  const windowEnd = Date.now();
  const domainPayload: DomainRollupPayload = { windowStart, windowEnd, domains: domainAgg };
  const casinoPayload: CasinoRollupPayload = { windowStart, windowEnd, casinos: casinoAgg };
  eventRouter.publish('trust.domain.rollup', 'trust-engine-casino', domainPayload).catch(console.error);
  eventRouter.publish('trust.casino.rollup', 'trust-engine-casino', casinoPayload).catch(console.error);
  persistSnapshots(domainPayload, casinoPayload);
  resetWindow();
}

// Subscribe to trust events
eventRouter.subscribe('trust.domain.updated', (evt: TiltCheckEvent<TrustDomainUpdateEvent>) => {
  const d = evt.data;
  addEntry(domainAgg, d.domain, d.delta || 0, d.severity, d.newScore);
  maybeFlush();
}, 'trust-rollup' as any);

eventRouter.subscribe('trust.casino.updated', (evt: TiltCheckEvent<TrustCasinoUpdateEvent>) => {
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

// Start external casino verification scheduler
if (process.env.ENABLE_CASINO_VERIFICATION !== 'false') {
  startCasinoVerificationScheduler();
  console.log('[TrustRollup] Casino verification scheduler enabled');
} else {
  console.log('[TrustRollup] Casino verification scheduler disabled');
}

// Lightweight health server
const HEALTH_PORT = process.env.TRUST_ROLLUP_HEALTH_PORT || '8082';
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

function persistSnapshots(domainPayload: DomainRollupPayload, casinoPayload: CasinoRollupPayload) {
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
