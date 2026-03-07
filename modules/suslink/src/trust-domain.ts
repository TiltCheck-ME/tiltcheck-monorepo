// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Domain Trust Emission Helper (SusLink)
 *
 * Converts a LinkScanResult into a trust.domain.updated event with severity mapping.
 * Maintains an in-memory score cache (0-100) per domain.
 *
 * Score philosophy:
 * - Start all domains at 50 (neutral baseline)
 * - Positive reinforcement small & capped
 * - Negative deltas larger for higher risk levels
 * - Floor at 0, ceiling at 100
 * - Skip emission if delta = 0
 */

import { eventRouter } from '@tiltcheck/event-router';
import type { LinkScanResult, DomainRiskCategory, TrustDomainUpdateEvent } from '@tiltcheck/types';
import { computeSeverity } from '@tiltcheck/config';
import fs from 'fs';
import path from 'path';
import { validateDomainTrustSnapshot } from './domain-trust-schema.js';

// In-memory domain score cache
const domainScores: Map<string, number> = new Map();
let lastSnapshotWrite = 0;
const SNAPSHOT_INTERVAL_MS = 30_000; // throttle writes
const SNAPSHOT_DIR = path.join(process.cwd(), 'data');
const DOMAIN_SCORES_FILE = path.join(SNAPSHOT_DIR, 'domain-trust-scores.json');

// RiskLevel (scanner) → DomainRiskCategory mapping
const RISK_CATEGORY_MAP: Record<string, DomainRiskCategory> = {
  safe: 'safe',
  suspicious: 'suspicious',
  high: 'unsafe',
  critical: 'malicious',
};

// Category → signed delta magnitude
// Positive points for safe reinforcement are intentionally tiny (anti-farming)
const CATEGORY_DELTAS: Record<DomainRiskCategory, number> = {
  safe: +2,
  unknown: 0,
  suspicious: -10,
  unsafe: -25,
  malicious: -40,
};

function normalizeDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase();
  } catch {
    // Fallback: treat whole input as domain-like string
    return url.toLowerCase();
  }
}

export async function emitDomainTrustFromScan(scan: LinkScanResult, userId?: string) {
  const domain = normalizeDomain(scan.url);
  const category = RISK_CATEGORY_MAP[scan.riskLevel] || 'unknown';

  // Initialize baseline
  const previousScore = domainScores.get(domain) ?? 50;
  const rawDelta = CATEGORY_DELTAS[category] ?? 0;

  // If category is unknown or rawDelta zero, only emit if reason indicates change (skip passive noise)
  if (rawDelta === 0 && category === 'unknown') {
    return; // no meaningful change
  }

  // Apply delta with bounds
  const newScore = Math.max(0, Math.min(100, previousScore + rawDelta));
  const delta = newScore - previousScore;

  if (delta === 0) return; // score unchanged

  domainScores.set(domain, newScore);

  const severity = computeSeverity(Math.abs(delta));

  const event: TrustDomainUpdateEvent = {
    domain,
    previousScore,
    newScore,
    delta,
    severity,
    category,
    reason: `risk:${category}`,
    source: 'suslink',
    metadata: {
      scanReason: scan.reason,
      rawRiskLevel: scan.riskLevel,
      url: scan.url,
    },
  };

  await eventRouter.publish('trust.domain.updated', 'suslink', event, userId);
  maybeWriteSnapshot();
}

// Utility for external modules (e.g., monitoring) to inspect current domain trust state
export function getDomainTrustSnapshot() {
  return Array.from(domainScores.entries()).map(([domain, score]) => ({ domain, score }));
}

// Manual override (e.g., admin safe/unsafe classification)
export async function overrideDomainTrust(domain: string, classification: 'safe' | 'unsafe', actor: string) {
  const norm = domain.toLowerCase();
  const prev = domainScores.get(norm) ?? 50;
  const target = classification === 'safe' ? Math.max(prev, 60) : Math.min(prev, 20); // push toward band
  const delta = target - prev;
  if (delta === 0) return;
  domainScores.set(norm, target);
  const severity = computeSeverity(Math.abs(delta));
  const event: TrustDomainUpdateEvent = {
    domain: norm,
    previousScore: prev,
    newScore: target,
    delta,
    severity,
    category: classification === 'safe' ? 'safe' : 'malicious',
    reason: `override:${classification}`,
    source: 'suslink',
    metadata: { actor },
  };
  await eventRouter.publish('trust.domain.updated', 'suslink', event);
  maybeWriteSnapshot(true);
}

function maybeWriteSnapshot(force = false) {
  const now = Date.now();
  if (!force && now - lastSnapshotWrite < SNAPSHOT_INTERVAL_MS) return;
  lastSnapshotWrite = now;
  try {
    if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    const snapshot = {
      generatedAt: new Date().toISOString(),
      domains: Array.from(domainScores.entries()).map(([d, s]) => ({ domain: d, score: s }))
    };
    if (!validateDomainTrustSnapshot(snapshot)) {
      throw new Error('Invalid domain trust snapshot structure');
    }
    fs.writeFileSync(DOMAIN_SCORES_FILE, JSON.stringify(snapshot, null, 2));
  } catch (err) {
    console.error('[SusLink] Failed to write domain trust snapshot', err);
  }
}

// Expose snapshot path for external tooling
export const DOMAIN_TRUST_SNAPSHOT_PATH = DOMAIN_SCORES_FILE;
