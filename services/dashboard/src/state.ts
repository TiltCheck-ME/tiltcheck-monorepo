import type { TiltCheckEvent, TrustCasinoUpdateEvent } from '@tiltcheck/types';
// TrustDomainUpdateEvent / TrustDegenUpdateEvent not exported; define lightweight local shapes
interface TrustDomainUpdateEvent { domain: string; delta?: number; severity?: number; reason?: string }
interface TrustDegenUpdateEvent { userId: string; delta?: number; severity?: number; reason?: string }

export interface DashboardEventEntry {
  ts: number;
  type: string;
  source: string;
  entity?: string;
  delta?: number;
  severity?: number;
  reason?: string;
}

export interface DashboardState {
  events: DashboardEventEntry[];
  severityBuckets: Record<number, number>; // 1..5
  lastSnapshotTs?: number;
  throttledCount: number;
  windowStart?: number; // from rollups snapshot
  riskAlerts: RiskAlert[];
  entityHistories: Record<string, number[]>; // domain:<name> / casino:<name> -> recent deltas
}

export const dashboardState: DashboardState = {
  events: [],
  severityBuckets: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  throttledCount: 0,
  riskAlerts: [],
  entityHistories: {},
};

// Domain anomaly stats (simple rolling mean/std of |delta|) placed before pushEvent to avoid TDZ.
interface DomainStats { count: number; sumAbs: number; sumSqAbs: number; }
const domainStats: Record<string, DomainStats> = {};

function updateDomainStats(domain: string, delta: number) {
  const abs = Math.abs(delta);
  if (!domainStats[domain]) domainStats[domain] = { count: 0, sumAbs: 0, sumSqAbs: 0 };
  const s = domainStats[domain];
  s.count += 1; s.sumAbs += abs; s.sumSqAbs += abs * abs;
  if (s.count > 1000) { // decay to bound memory
    s.count = Math.floor(s.count / 2);
    s.sumAbs /= 2; s.sumSqAbs /= 2;
  }
  return s;
}

function maybeFlagDomainAnomaly(domain: string, delta: number, severity?: number) {
  if (delta >= 0) return undefined; // focus on negative swings
  const stats = domainStats[domain];
  if (!stats || stats.count < 5) return undefined; // need baseline
  const mean = stats.sumAbs / stats.count;
  const variance = Math.max(0, (stats.sumSqAbs / stats.count) - mean * mean);
  const std = Math.sqrt(variance) || 1;
  const absDelta = Math.abs(delta);
  if (severity !== undefined && severity >= 3 && absDelta > mean + 2 * std) {
    const alert = { kind: 'domain-anomaly' as const, entity: domain, totalDelta: delta, severity, firstSeenTs: Date.now() };
    addRiskAlert(alert);
    return alert;
  }
  return undefined;
}

export function pushEvent(e: TiltCheckEvent<any>) {
  let entity: string | undefined;
  let delta: number | undefined;
  let severity: number | undefined;
  let reason: string | undefined;
  const payload: any = e.data;
  switch (e.type as any) {
    case 'trust.domain.updated': {
      const d = payload as TrustDomainUpdateEvent;
      entity = d.domain; delta = d.delta; severity = d.severity; reason = d.reason; break;
    }
    case 'trust.casino.updated': {
      const c = payload as TrustCasinoUpdateEvent;
      entity = c.casinoName; delta = c.delta; severity = c.severity; reason = c.reason; break;
    }
    case 'trust.degen.updated': {
      const u = payload as TrustDegenUpdateEvent;
      entity = u.userId; delta = u.delta; severity = u.severity; reason = u.reason; break;
    }
    default: break;
  }
  if (severity) {
    dashboardState.severityBuckets[severity] = (dashboardState.severityBuckets[severity] || 0) + 1;
  }
  if (entity) {
    dashboardState.events.push({ ts: e.timestamp, type: e.type, source: e.source, entity, delta, severity, reason });
    if (dashboardState.events.length > 500) dashboardState.events.shift();
    if ((e.type as any) === 'trust.domain.updated' || (e.type as any) === 'trust.casino.updated') {
      const key = ((e.type as any) === 'trust.domain.updated' ? 'domain:' : 'casino:') + entity;
      if (!dashboardState.entityHistories[key]) dashboardState.entityHistories[key] = [];
      dashboardState.entityHistories[key].push(delta || 0);
      const maxPoints = 48;
      if (dashboardState.entityHistories[key].length > maxPoints) {
        dashboardState.entityHistories[key] = dashboardState.entityHistories[key].slice(-maxPoints);
      }
    }
    // Anomaly evaluation for domains after recording event
    if ((e.type as any) === 'trust.domain.updated' && typeof delta === 'number') {
      updateDomainStats(entity, delta);
      const anomalyAlert = maybeFlagDomainAnomaly(entity, delta, severity);
      if (anomalyAlert && typeof (globalThis as any).__discordNotifier !== 'undefined') {
        (globalThis as any).__discordNotifier.sendAlert(anomalyAlert).catch(console.error);
      }
    }
  }
}

export interface RiskAlert {
  kind: 'domain-delta' | 'casino-delta' | 'critical-severity' | 'domain-anomaly';
  entity: string;
  totalDelta?: number;
  severity?: number;
  firstSeenTs: number;
}

// Add a risk alert (avoid duplicates by entity+kind)
export function addRiskAlert(alert: RiskAlert) {
  const exists = dashboardState.riskAlerts.find(a => a.entity === alert.entity && a.kind === alert.kind);
  if (exists) return;
  dashboardState.riskAlerts.push(alert);
  // keep list bounded
  if (dashboardState.riskAlerts.length > 100) dashboardState.riskAlerts.shift();
}

export function getSparklineData(limit = 5) {
  const domainEntries = Object.entries(dashboardState.entityHistories)
    .filter(([k]) => k.startsWith('domain:'))
    .map(([k,v]) => ({ entity: k.slice(7), deltas: v }))
    .sort((a,b) => b.deltas.length - a.deltas.length)
    .slice(0, limit);
  const casinoEntries = Object.entries(dashboardState.entityHistories)
    .filter(([k]) => k.startsWith('casino:'))
    .map(([k,v]) => ({ entity: k.slice(7), deltas: v }))
    .sort((a,b) => b.deltas.length - a.deltas.length)
    .slice(0, limit);
  return { domains: domainEntries, casinos: casinoEntries };
}

// (anomaly helpers moved above pushEvent)
