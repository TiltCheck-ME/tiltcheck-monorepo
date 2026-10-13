/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */

import type { CasinoSummary, DataSource, ListFilters, OperatorFactRecord, OperatorFactType } from '@tiltcheck/intel-tools';
import type { IntelBlock } from './types.js';

const OPERATOR_FACT_REFUSE_TEXT =
  'No sourced record for that. Not guessing VIP/bonus/redemption terms. Check their ToS — or open the proof page when we have one.';

function buildProofPageCta(slug?: string): IntelBlock[] {
  if (!slug) {
    return [];
  }

  return [
    {
      type: 'cta',
      label: 'Open proof page',
      href: `/casinos/${slug}`,
    },
  ];
}

function formatFactTypeLabel(type: OperatorFactType): string {
  if (type === 'vip') {
    return 'VIP terms';
  }
  if (type === 'redemption') {
    return 'redemption timing';
  }
  return 'welcome bonus';
}

export interface OperatorFactHitBlockEntry {
  content: string;
  sourceUrl: string;
  asOf: string;
}

export function summarizeCasinoVerdict(casino: CasinoSummary, checkScam: boolean): string {
  const gradeLine = `Grade ${casino.grade} (${casino.risk} risk). Data source: ${casino.dataSource}.`;

  if (casino.category === 'Scam') {
    return `${casino.name} is in our Scam category with grade ${casino.grade}. Documented flags and watchdog reports back that call — not a court ruling, but the audit read is ugly. ${gradeLine}`;
  }

  if (checkScam) {
    if (casino.grade === 'F' || casino.risk.toLowerCase().includes('critical') || casino.risk === 'High') {
      return `${casino.name} is not clean. High documented friction and weak trust signals. Treat deposits as voluntary donations until you read the full audit. ${gradeLine}`;
    }
    return `${casino.name} is tracked and not in the Scam category. That does not mean risk-free — read violations and license basis before you deposit. ${gradeLine}`;
  }

  return `${casino.name} trust read: ${gradeLine} Open the full audit for license, domain scan, and pillar breakdown.`;
}

export function buildLookupBlocks(
  matches: CasinoSummary[],
  checkScam: boolean,
  domainScan?: { domain: string; threatLevel: string; licenseStatus: string },
): IntelBlock[] {
  if (matches.length === 0) {
    return [
      {
        type: 'text',
        content: 'No curated match in the trust directory. Run a domain check or paste the exact hostname.',
      },
      {
        type: 'cta',
        label: 'Open domain verifier',
        href: '/tools/domain-verifier',
      },
    ];
  }

  const primary = matches[0]!;
  const blocks: IntelBlock[] = [
    { type: 'text', content: summarizeCasinoVerdict(primary, checkScam) },
    { type: 'casino_card', casino: primary },
    {
      type: 'cta',
      label: 'Open full audit',
      href: primary.auditHref,
    },
  ];

  if (domainScan) {
    blocks.splice(2, 0, {
      type: 'domain_scan',
      domain: domainScan.domain,
      threatLevel: domainScan.threatLevel,
      licenseStatus: domainScan.licenseStatus,
    });
  }

  if (matches.length > 1) {
    blocks.push({
      type: 'text',
      content: `Also matched: ${matches.slice(1, 4).map((casino) => casino.name).join(', ')}.`,
    });
  }

  return blocks;
}

export function buildOperatorFactHitBlocks(
  entries: OperatorFactHitBlockEntry[],
  slug?: string,
  stale = false,
): IntelBlock[] {
  const blocks: IntelBlock[] = [];

  for (const entry of entries) {
    blocks.push({ type: 'text', content: entry.content });
    blocks.push({
      type: 'text',
      content: `Source: ${entry.sourceUrl} · As of ${entry.asOf}`,
      citations: [{ label: 'Source', href: entry.sourceUrl, source: 'snapshot' }],
    });
  }

  if (stale) {
    blocks.push({ type: 'text', content: 'Stale — verify on source' });
  }

  return [...blocks, ...buildProofPageCta(slug)];
}

export function buildOperatorFactMissBlocks(_name: string, slug?: string): IntelBlock[] {
  return [{ type: 'text', content: OPERATOR_FACT_REFUSE_TEXT }, ...buildProofPageCta(slug)];
}

export function buildOperatorFactAmbiguousBlocks(matches: OperatorFactRecord[]): IntelBlock[] {
  return [
    {
      type: 'text',
      content: `Multiple sourced matches: ${matches.map((match) => match.name).join(', ')}. Use the exact operator name or domain.`,
    },
  ];
}

export function buildOperatorFactNoneBlocks(_query: string): IntelBlock[] {
  return [{ type: 'text', content: OPERATOR_FACT_REFUSE_TEXT }];
}

export function buildOperatorFactTypeBlocks(
  name: string,
  types: OperatorFactType[],
  slug?: string,
  stale = false,
): IntelBlock[] {
  const blocks: IntelBlock[] = [
    {
      type: 'text',
      content: `Available sourced facts for ${name}: ${types.map(formatFactTypeLabel).join(', ')}.`,
    },
  ];

  if (stale) {
    blocks.push({ type: 'text', content: 'Stale — verify on source' });
  }

  return [...blocks, ...buildProofPageCta(slug)];
}

export function buildListBlocks(
  title: string,
  filters: ListFilters,
  casinos: CasinoSummary[],
): IntelBlock[] {
  if (casinos.length === 0) {
    return [
      {
        type: 'text',
        content: 'No casinos matched that filter. Try sweeps, crypto, or a shorter search term.',
      },
    ];
  }

  return [
    {
      type: 'text',
      content: `${casinos.length} operator${casinos.length === 1 ? '' : 's'} matched. Sorted by trust score. Not financial advice.`,
    },
    {
      type: 'casino_list',
      title,
      filters,
      casinos: casinos.slice(0, 24),
    },
    {
      type: 'cta',
      label: 'Browse all casinos',
      href: '/casinos',
    },
  ];
}

export function resolveDataSource(casinos: CasinoSummary[]): DataSource {
  const hasLive = casinos.some((casino) => casino.dataSource === 'live');
  const hasSnapshot = casinos.some((casino) => casino.dataSource === 'snapshot');
  if (hasLive && hasSnapshot) {
    return 'mixed';
  }
  if (hasLive) {
    return 'live';
  }
  return 'snapshot';
}
