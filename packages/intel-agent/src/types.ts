/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */

import type { CasinoSummary, DataSource, ListFilters } from '@tiltcheck/intel-tools';

export type { ListFilters };

export interface Citation {
  label: string;
  href?: string;
  source: 'live' | 'snapshot';
}

export type IntelBlock =
  | { type: 'text'; content: string; citations?: Citation[] }
  | { type: 'casino_card'; casino: CasinoSummary }
  | { type: 'casino_list'; title: string; filters: ListFilters; casinos: CasinoSummary[] }
  | { type: 'domain_scan'; domain: string; threatLevel: string; licenseStatus: string }
  | { type: 'cta'; label: string; href: string }
  | { type: 'login_prompt'; reason: string; handoff?: string };

export interface IntelChatResponse {
  blocks: IntelBlock[];
  dataSource: DataSource;
  shareEligible: boolean;
}

export interface IntelAgentContext {
  discordId?: string | null;
  isAuthenticated: boolean;
}

export type RoutedIntent =
  | { kind: 'lookup'; name: string; checkScam?: boolean }
  | { kind: 'list'; filters: ListFilters; title: string }
  | { kind: 'domain'; domain: string }
  | { kind: 'methodology' }
  | { kind: 'personal'; topic: 'bonus' | 'session' | 'vault' }
  | { kind: 'operator_vip_fact'; name: string; currencyHint?: string }
  | { kind: 'operator_redemption_fact'; name: string }
  | { kind: 'operator_welcome_bonus_fact'; name: string; geoTag?: string }
  | { kind: 'operator_fact_lookup'; name: string }
  | { kind: 'unknown' };

export interface ProcessIntelMessageInput {
  message: string;
  context: IntelAgentContext;
}
