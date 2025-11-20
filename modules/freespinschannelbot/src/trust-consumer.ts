import { eventRouter } from '@tiltcheck/event-router';
import type { TrustDomainUpdateEvent, TrustCasinoUpdateEvent, TrustDegenUpdateEvent } from '@tiltcheck/types';

interface FormatterResult {
  line: string;
  severityEmoji: string;
}

function severityBadge(severity: number): string {
  if (severity >= 4) return '🔴';
  if (severity === 3) return '🟠';
  if (severity === 2) return '🟡';
  return '🟢';
}

function formatDelta(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}`;
}

function formatDomainTrust(evt: TrustDomainUpdateEvent): FormatterResult {
  return {
    line: `[domain] ${evt.domain} ${formatDelta(evt.delta ?? 0)} (score ${evt.newScore}) cat=${evt.category} src=${evt.source}`,
    severityEmoji: severityBadge(evt.severity ?? 0)
  };
}

function formatCasinoTrust(evt: TrustCasinoUpdateEvent): FormatterResult {
  return {
    line: `[casino] ${evt.casinoName} ${formatDelta(evt.delta ?? 0)} (score ${evt.newScore}) reason=${evt.reason}`,
    severityEmoji: severityBadge(evt.severity ?? 0)
  };
}

function formatDegenTrust(evt: TrustDegenUpdateEvent): FormatterResult {
  return {
    line: `[degen] ${evt.userId} ${formatDelta(evt.delta ?? 0)} (score ${evt.newScore}) reason=${evt.reason}`,
    severityEmoji: severityBadge(evt.severity ?? 0)
  };
}

export function initFreeSpinsChannelBotTrustLogging() {
  eventRouter.subscribe('trust.domain.updated' as any, (evt) => {
    const f = formatDomainTrust(evt.data as TrustDomainUpdateEvent);
    console.log(`[FreeSpinsChannelBot] ${f.severityEmoji} ${f.line}`);
  }, 'freespinschannelbot' as any);
  eventRouter.subscribe('trust.casino.updated' as any, (evt) => {
    const f = formatCasinoTrust(evt.data as TrustCasinoUpdateEvent);
    console.log(`[FreeSpinsChannelBot] ${f.severityEmoji} ${f.line}`);
  }, 'freespinschannelbot' as any);
  eventRouter.subscribe('trust.degen.updated' as any, (evt) => {
    const f = formatDegenTrust(evt.data as TrustDegenUpdateEvent);
    console.log(`[FreeSpinsChannelBot] ${f.severityEmoji} ${f.line}`);
  }, 'freespinschannelbot' as any);
  eventRouter.subscribe('trust.state.snapshot' as any, (evt) => {
    const summary = formatSnapshotSummary(evt.data as SnapshotPayload);
    console.log(`[FreeSpinsChannelBot] 📊 Trust Snapshot\n${summary}`);
  }, 'freespinschannelbot' as any);
}

// Optional helper to request snapshot (if trust state API present)
export function requestTrustStateSnapshot() {
  // This publishes a request; assuming another service responds with trust.state.snapshot
  eventRouter.publish('trust.state.requested' as any, 'freespinschannelbot' as any, { reason: 'manual-trigger', ts: Date.now() });
}

interface SnapshotPayload {
  windowStart?: number;
  domainAgg?: Record<string, { totalDelta: number; events: number; lastSeverity?: number; lastScore?: number }>;
  casinoAgg?: Record<string, { totalDelta: number; events: number; lastSeverity?: number; lastScore?: number }>;
}

export function formatSnapshotSummary(payload: SnapshotPayload): string {
  const lines: string[] = [];
  const start = payload.windowStart ? new Date(payload.windowStart).toISOString() : 'n/a';
  lines.push(`windowStart: ${start}`);
  if (payload.domainAgg) {
    const domainArray = Object.entries(payload.domainAgg);
    const worst = domainArray.sort((a,b) => a[1].totalDelta - b[1].totalDelta).slice(0,3);
    lines.push('worstDomains: ' + (worst.length ? worst.map(([d,v]) => `${d}(${v.totalDelta})`).join(', ') : 'none'));
  }
  if (payload.casinoAgg) {
    const casinoArray = Object.entries(payload.casinoAgg);
    const best = casinoArray.sort((a,b) => b[1].totalDelta - a[1].totalDelta).slice(0,3);
    lines.push('topCasinos: ' + (best.length ? best.map(([c,v]) => `${c}(+${v.totalDelta})`).join(', ') : 'none'));
  }
  return lines.join('\n');
}