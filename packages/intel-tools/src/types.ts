/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */

import type { OperatorFactRecord } from './operator-facts-types.js';

export interface CasinoRecord {
  name: string;
  grade: string;
  risk: string;
  category: string;
  slug: string;
  score: number;
}

export interface LiveTrustScore {
  casinoName: string;
  currentScore: number;
  riskLevel: string;
  events24h?: number;
  updatedAt?: string;
}

export interface CasinoSummary extends CasinoRecord {
  liveScore?: number;
  liveRisk?: string;
  liveUpdatedAt?: string;
  dataSource: 'live' | 'snapshot';
  auditHref: string;
  domainHref?: string;
}

export interface ListFilters {
  category?: string;
  geo?: 'us-sweeps' | 'us-crypto' | 'all';
  query?: string;
}

export interface DomainScanResult {
  domain: string;
  threatLevel: string;
  licenseStatus: string;
  raw?: Record<string, unknown>;
}

export interface IntelToolsConfig {
  apiBase: string;
  casinos: CasinoRecord[];
  operatorFacts?: OperatorFactRecord[];
}

export type DataSource = 'live' | 'snapshot' | 'mixed';
