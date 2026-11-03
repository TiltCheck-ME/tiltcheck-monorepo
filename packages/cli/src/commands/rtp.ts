/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */

import { Command } from 'commander';
import {
  findCasinos,
  loadCasinos,
  loadMasterRtp,
  type MasterProvider,
  type RawCasinoRecord,
} from '../lib/data-loader.js';

export interface RtpDowngradeAlert {
  tier: number;
  houseEdge: number;
  houseEdgeIncreaseVsDefaultPercent: number;
  impactDescription: string;
}

export interface OperatorRtpReport {
  operatorName: string;
  matchedName: string;
  category: string;
  grade: string;
  risk: string;
  audited: boolean;
  rtpSummary?: string;
  rtpOriginals?: string;
  rtpSlots?: string;
  downgradeWarnings: string[];
  referenceProviders: MasterProvider[];
  otherMatches?: string[];
}

/**
 * Calculates house edge bleed percentage comparison.
 */
export function calculateBleedIncrease(defaultRtp: number, deployedRtp: number): number {
  const defaultEdge = 100 - defaultRtp;
  const deployedEdge = 100 - deployedRtp;
  if (defaultEdge <= 0) return 0;
  return Math.round(((deployedEdge - defaultEdge) / defaultEdge) * 100);
}

/**
 * Builds an RTP inspection report for an operator.
 */
export function buildOperatorRtpReport(
  operatorQuery: string,
  casinos: RawCasinoRecord[],
  masterProviders: MasterProvider[]
): OperatorRtpReport {
  if (!operatorQuery || !operatorQuery.trim()) {
    throw new Error('Operator query is required. Provide a casino name (e.g. Stake, Roobet, BC.Game).');
  }

  const { matches, exact } = findCasinos(casinos, operatorQuery);

  if (matches.length === 0) {
    throw new Error(
      `Operator "${operatorQuery}" not found in casino dataset. Check spelling or try a broader search term.`
    );
  }

  const casino = exact ?? matches[0];
  const otherMatches = matches.length > 1
    ? matches.filter((m) => m.name !== casino.name).map((m) => m.name)
    : undefined;

  const downgradeWarnings: string[] = [];

  if (casino.rtpSlots) {
    downgradeWarnings.push(
      `DEPLOYED SLOTS CONFIGURATION: ${casino.rtpSlots}`
    );
  }

  // Standard downgrade impact alerts based on industry standards
  const p94Bleed = calculateBleedIncrease(96.50, 94.50);
  const p92Bleed = calculateBleedIncrease(96.50, 92.00);
  const p91Bleed = calculateBleedIncrease(96.50, 91.20);

  downgradeWarnings.push(
    `DOWNGRADE MATH: 96.50% -> 94.50% increases house edge from 3.50% to 5.50% (+${p94Bleed}% faster bankroll bleed).`
  );
  downgradeWarnings.push(
    `DOWNGRADE MATH: 96.50% -> 92.00% increases house edge from 3.50% to 8.00% (+${p92Bleed}% faster bankroll bleed).`
  );
  downgradeWarnings.push(
    `DOWNGRADE MATH: 96.50% -> 91.20% increases house edge from 3.50% to 8.80% (+${p91Bleed}% faster bankroll bleed).`
  );

  if (!casino.audited) {
    downgradeWarnings.push(
      'WARNING: This operator has not undergone independent third-party RTP verification. Deployed return-to-player rates cannot be verified from published files.'
    );
  }

  return {
    operatorName: operatorQuery,
    matchedName: casino.name,
    category: casino.category,
    grade: casino.grade,
    risk: casino.risk,
    audited: Boolean(casino.audited),
    rtpSummary: casino.rtpSummary,
    rtpOriginals: casino.rtpOriginals,
    rtpSlots: casino.rtpSlots,
    downgradeWarnings,
    referenceProviders: masterProviders,
    otherMatches,
  };
}

export function formatOperatorRtpText(report: OperatorRtpReport): string {
  const lines = [
    '======================================================================',
    'TILTCHECK RTP & DOWNGRADE INSPECTION',
    `Operator: ${report.matchedName} (${report.category})`,
    `Trust Grade: ${report.grade} | Risk Level: ${report.risk} | Audited: ${report.audited ? 'YES' : 'NO'}`,
    '======================================================================',
    '',
    'REPORTED OPERATOR RTP:',
    `  Summary:   ${report.rtpSummary ?? 'Undisclosed / Unverified by operator'}`,
    `  Originals: ${report.rtpOriginals ?? 'No proprietary originals RTP published'}`,
    `  Slots:     ${report.rtpSlots ?? 'Manufacturer variable tiers deployed without live in-frame display'}`,
    '',
    'DEPLOYED DOWNGRADE RISKS:',
  ];

  for (const warning of report.downgradeWarnings) {
    lines.push(`  - ${warning}`);
  }

  if (report.referenceProviders.length > 0) {
    lines.push('');
    lines.push('CERTIFIED PROVIDER MASTER TIERS (GLI / eCOGRA Read-Only Anchors):');
    for (const provider of report.referenceProviders.slice(0, 3)) {
      lines.push(`  Provider: ${provider.providerName}`);
      for (const game of provider.games.slice(0, 3)) {
        lines.push(
          `    * ${game.gameTitle}: Certified Tiers [${game.certifiedTiers.map((t) => `${t.toFixed(2)}%`).join(', ')}] (Certified by ${game.certifiedBy})`
        );
      }
    }
  }

  if (report.otherMatches && report.otherMatches.length > 0) {
    lines.push('');
    if (report.otherMatches.length <= 5) {
      lines.push(`Related operators matching query: ${report.otherMatches.join(', ')}`);
    } else {
      const sample = report.otherMatches.slice(0, 5).join(', ');
      lines.push(`Related operators matching query: ${sample} (+${report.otherMatches.length - 5} more)`);
    }
  }

  lines.push('');
  lines.push('HARM REDUCTION NOTICE:');
  lines.push('  Provably fair verifies single-bet seed hashing only.');
  lines.push('  Slot games run on provider servers where casinos select the RTP tier at setup.');
  lines.push('  Always inspect the slot game rules iframe to confirm whether 96%, 94%, or 92% is active.');
  lines.push('======================================================================');
  lines.push('Made for Degens. By Degens.');

  return lines.join('\n');
}

export const rtpCommand = new Command('rtp')
  .description('Offline terminal inspection of casino RTP tiers, Originals edge, and slot downgrades')
  .argument('<operator>', 'Casino name or slug (e.g. Stake, Roobet, BC.Game, Chumba)')
  .option('-j, --json', 'Output RTP dossier as raw JSON')
  .option('-p, --provider <name>', 'Filter certified provider tiers by name (e.g. Pragmatic, Hacksaw)')
  .option('--root <dir>', 'Optional monorepo root directory override')
  .action((operator: string, options: { json?: boolean; provider?: string; root?: string }) => {
    try {
      const casinos = loadCasinos(options.root);
      if (casinos.length === 0) {
        throw new Error('No casino data available. Ensure apps/web/src/data/casinos.json exists.');
      }

      const master = loadMasterRtp(options.root);
      let providers = master?.providers ?? [];

      if (options.provider) {
        const filter = options.provider.toLowerCase();
        providers = providers.filter((p) => p.providerName.toLowerCase().includes(filter));
      }

      const report = buildOperatorRtpReport(operator, casinos, providers);

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(formatOperatorRtpText(report));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (options.json) {
        console.error(JSON.stringify({ error: msg, status: 'failed' }, null, 2));
      } else {
        console.error(`[tiltcheck rtp error] ${msg}`);
      }
      process.exit(1);
    }
  });
