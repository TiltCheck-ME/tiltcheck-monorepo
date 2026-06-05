/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import type { CasinoSummary, DataSource, ListFilters } from '@tiltcheck/intel-tools';
import type { IntelBlock } from './types.js';

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
