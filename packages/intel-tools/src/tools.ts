/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import { applyListFilters, findCasinoByName } from './filters.js';
import type {
  CasinoRecord,
  CasinoSummary,
  DomainScanResult,
  IntelToolsConfig,
  ListFilters,
  LiveTrustScore,
} from './types.js';

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function matchLiveScore(casino: CasinoRecord, liveScores: LiveTrustScore[]): LiveTrustScore | null {
  const normalizedName = casino.name.toLowerCase();
  return (
    liveScores.find((entry) => entry.casinoName.toLowerCase() === normalizedName) ??
    liveScores.find((entry) => normalizedName.includes(entry.casinoName.toLowerCase())) ??
    null
  );
}

export function toCasinoSummary(
  casino: CasinoRecord,
  live: LiveTrustScore | null,
): CasinoSummary {
  const dataSource = live ? 'live' : 'snapshot';
  return {
    ...casino,
    liveScore: live?.currentScore,
    liveRisk: live?.riskLevel,
    liveUpdatedAt: live?.updatedAt,
    dataSource,
    auditHref: `/casinos/${casino.slug}`,
    domainHref: casino.slug ? `/tools/domain-verifier?domain=${encodeURIComponent(casino.slug)}` : undefined,
  };
}

export class IntelTools {
  private readonly apiBase: string;
  private readonly casinos: CasinoRecord[];

  constructor(config: IntelToolsConfig) {
    this.apiBase = config.apiBase.replace(/\/$/, '');
    this.casinos = config.casinos;
  }

  async fetchLiveScores(): Promise<{ scores: LiveTrustScore[]; source: string }> {
    const payload = await fetchJson<{ casinos?: LiveTrustScore[]; source?: string }>(
      `${this.apiBase}/rgaas/casino-scores`,
    );

    return {
      scores: Array.isArray(payload?.casinos) ? payload.casinos : [],
      source: payload?.source ?? 'snapshot',
    };
  }

  async lookupCasino(name: string): Promise<{ matches: CasinoSummary[]; source: string }> {
    const found = findCasinoByName(this.casinos, name);
    const { scores, source } = await this.fetchLiveScores();

    return {
      matches: found.map((casino) => toCasinoSummary(casino, matchLiveScore(casino, scores))),
      source,
    };
  }

  async listCasinos(filters: ListFilters): Promise<{ casinos: CasinoSummary[]; source: string }> {
    const filtered = applyListFilters(this.casinos, filters);
    const { scores, source } = await this.fetchLiveScores();

    return {
      casinos: filtered.map((casino) => toCasinoSummary(casino, matchLiveScore(casino, scores))),
      source,
    };
  }

  async checkDomain(domain: string): Promise<DomainScanResult> {
    const normalized = domain.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];

    const [domainPayload, licensePayload] = await Promise.all([
      fetchJson<Record<string, unknown>>(`${this.apiBase}/rgaas/domain-check?domain=${encodeURIComponent(normalized)}`),
      fetchJson<Record<string, unknown>>(`${this.apiBase}/rgaas/license-check?domain=${encodeURIComponent(normalized)}`),
    ]);

    const threatLevel = String(
      (domainPayload as { threatLevel?: string; risk?: string })?.threatLevel ??
      (domainPayload as { risk?: string })?.risk ??
      'unknown',
    );

    const licenseStatus = String(
      (licensePayload as { status?: string; licenseStatus?: string })?.status ??
      (licensePayload as { licenseStatus?: string })?.licenseStatus ??
      'unknown',
    );

    return {
      domain: normalized,
      threatLevel,
      licenseStatus,
      raw: { domainScan: domainPayload ?? undefined, licenseCheck: licensePayload ?? undefined },
    };
  }

  async getScamDomains(): Promise<string[]> {
    const payload = await fetchJson<{ domains?: string[]; scamDomains?: string[] }>(
      `${this.apiBase}/rgaas/scam-domains`,
    );

    if (Array.isArray(payload?.domains)) {
      return payload.domains;
    }
    if (Array.isArray(payload?.scamDomains)) {
      return payload.scamDomains;
    }

    return this.casinos.filter((casino) => casino.category === 'Scam').map((casino) => casino.name);
  }

  async getShadowBans(): Promise<unknown[]> {
    const payload = await fetchJson<{ flags?: unknown[]; shadowBans?: unknown[] }>(
      `${this.apiBase}/rgaas/shadow-bans`,
    );

    if (Array.isArray(payload?.flags)) {
      return payload.flags;
    }
    if (Array.isArray(payload?.shadowBans)) {
      return payload.shadowBans;
    }

    return [];
  }
}

export function createIntelTools(config: IntelToolsConfig): IntelTools {
  return new IntelTools(config);
}
