/**
 * Trust Rollup Service
 * Aggregates trust.casino.updated and trust.domain.updated events hourly and publishes rollups.
 * Lightweight in-memory implementation.
 */

import { eventRouter } from '@tiltcheck/event-router';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { validateRollupSnapshotFile } from './rollup-schema.js';
import type { TiltCheckEvent, TrustCasinoUpdateEvent, TrustDomainUpdateEvent } from '@tiltcheck/types';

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

let ready = true; // Service sets ready immediately after subscriptions
console.log('[TrustRollup] Service initialized');

// Lightweight health server
const HEALTH_PORT = process.env.TRUST_ROLLUP_HEALTH_PORT || '8082';
http.createServer((req, res) => {
  if (req.url === '/health') {
    const body = JSON.stringify({ service: 'trust-rollup', ready, windowStart, domainKeys: Object.keys(domainAgg).length, casinoKeys: Object.keys(casinoAgg).length });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(body);
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
eventRouter.subscribe('trust.state.requested', async (evt) => {
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
