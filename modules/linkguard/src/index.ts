import { computeSeverity, DEFAULT_SEVERITY_SCALE } from '@tiltcheck/config';
import { eventRouter } from '@tiltcheck/event-router';
import type { TrustDomainUpdateEvent } from '@tiltcheck/types';

// Category mapping aligned with design doc
const BASE_DELTAS: Record<string, number> = {
  safe: +2, // gentle reinforcement
  unknown: 0, // neutral (skip emission if no change)
  suspicious: -10,
  unsafe: -25,
  malicious: -40,
};

const DEFAULT_START_SCORE = 50;
const domainScores = new Map<string, number>();

export interface LinkGuardScanInput {
  domain: string; // raw domain (already parsed)
  category: 'safe' | 'unknown' | 'suspicious' | 'unsafe' | 'malicious';
  actor?: string; // who triggered the scan (user/admin/system)
  context?: Record<string, any>; // extra info (channel id, message id, etc.)
  reason?: string; // optional override description
}

function clamp(v: number, min: number, max: number) { return v < min ? min : v > max ? max : v; }

export async function emitDomainTrustFromLinkGuard(scan: LinkGuardScanInput) {
  const domain = scan.domain.toLowerCase();
  const previousScore = domainScores.get(domain) ?? DEFAULT_START_SCORE;
  const rawDelta = BASE_DELTAS[scan.category] ?? 0;
  // Skip unknown with zero delta (noise)
  if (scan.category === 'unknown' && rawDelta === 0) return;
  const newScore = clamp(previousScore + rawDelta, 0, 100);
  const delta = newScore - previousScore;
  if (delta === 0) return; // no-op
  domainScores.set(domain, newScore);
  const severity = computeSeverity(Math.abs(delta), DEFAULT_SEVERITY_SCALE);
  const event: TrustDomainUpdateEvent = {
    domain,
    previousScore,
    newScore,
    delta,
    severity,
    category: scan.category,
    reason: scan.reason || `risk:${scan.category}`,
    source: 'linkguard',
    metadata: {
      actor: scan.actor,
      context: scan.context,
    }
  };
  await eventRouter.publish('trust.domain.updated', 'linkguard', event, scan.actor);
}

export function getLinkGuardDomainScore(domain: string) {
  return domainScores.get(domain.toLowerCase()) ?? DEFAULT_START_SCORE;
}

// Manual override API for admin interventions
export async function overrideLinkGuardDomain(domain: string, classification: 'safe' | 'unsafe', actor: string, note?: string) {
  const norm = domain.toLowerCase();
  const prev = domainScores.get(norm) ?? DEFAULT_START_SCORE;
  // push toward band edges with controlled delta
  const target = classification === 'safe' ? Math.max(prev, 65) : Math.min(prev, 15);
  const delta = target - prev;
  if (delta === 0) return;
  domainScores.set(norm, target);
  const severity = computeSeverity(Math.abs(delta), DEFAULT_SEVERITY_SCALE);
  const event: TrustDomainUpdateEvent = {
    domain: norm,
    previousScore: prev,
    newScore: target,
    delta,
    severity,
    category: classification === 'safe' ? 'safe' : 'malicious',
    reason: `override:${classification}`,
    source: 'linkguard',
    metadata: { actor, note }
  };
  await eventRouter.publish('trust.domain.updated', 'linkguard', event, actor);
}

export function snapshotLinkGuardScores() {
  return Array.from(domainScores.entries()).map(([domain, score]) => ({ domain, score }));
}