/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */

import { Command } from 'commander';
import {
  findCasinos,
  loadCasinos,
  type RawCasinoRecord,
} from '../lib/data-loader.js';

export interface OperatorTrustReport {
  operatorName: string;
  matchedName: string;
  category: string;
  grade: string;
  risk: string;
  audited: boolean;
  license?: string;
  vaultSupport?: string;
  playthrough?: string;
  evidence: string[];
  isScam: boolean;
  otherMatches?: string[];
}

/**
 * Builds an offline trust inspection report for an operator.
 */
export function buildOperatorTrustReport(
  operatorQuery: string,
  casinos: RawCasinoRecord[]
): OperatorTrustReport {
  if (!operatorQuery || !operatorQuery.trim()) {
    throw new Error('Operator query is required. Provide a casino name (e.g. Stake, Roobet, Planet 7).');
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

  const isScam =
    casino.category.toLowerCase().includes('scam') ||
    casino.grade.toUpperCase() === 'F' ||
    casino.risk.toLowerCase().includes('critical');

  return {
    operatorName: operatorQuery,
    matchedName: casino.name,
    category: casino.category,
    grade: casino.grade,
    risk: casino.risk,
    audited: Boolean(casino.audited),
    license: casino.license,
    vaultSupport: casino.vaultSupport,
    playthrough: casino.playthrough,
    evidence: casino.evidence ?? [],
    isScam,
    otherMatches,
  };
}

export function formatOperatorTrustText(report: OperatorTrustReport): string {
  const lines = [
    '======================================================================',
    'TILTCHECK OPERATOR TRUST DOSSIER',
    `Operator: ${report.matchedName}`,
    `Category: ${report.category}`,
    `Trust Grade: ${report.grade} | Risk Level: ${report.risk} | Audited: ${report.audited ? 'YES' : 'NO'}`,
    '======================================================================',
  ];

  if (report.isScam) {
    lines.push('');
    lines.push('CRITICAL SCAM WARNING:');
    lines.push('  This operator is classified as a predatory or scam casino.');
    lines.push('  Rogue terms, delayed withdrawals, or non-payment are documented.');
    lines.push('  DO NOT DEPOSIT.');
  }

  lines.push('');
  lines.push('LICENSING & REGULATORY JURISDICTION:');
  lines.push(`  ${report.license ?? 'No active licensed jurisdiction published or registered.'}`);

  lines.push('');
  lines.push('BANKROLL DEFENSE CONTROLS:');
  lines.push(`  Vault Support: ${report.vaultSupport ?? 'None (TiltCheck DOM auto-vault fallback only)'}`);
  lines.push(`  Playthrough:   ${report.playthrough ?? 'Standard 1x deposit turnover required before cashout'}`);

  lines.push('');
  lines.push('AUDITED EVIDENCE & RISK FACTORS:');
  if (report.evidence.length > 0) {
    report.evidence.forEach((item, index) => {
      lines.push(`  [${index + 1}] ${item}`);
    });
  } else {
    lines.push('  No audited risk receipts recorded for this entry.');
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
  lines.push('NON-CUSTODIAL NOTICE:');
  lines.push('  TiltCheck does not custody player funds or guarantee casino solvency.');
  lines.push('  Trust grades reflect community reports, licensing filings, and terms-of-service audits.');
  lines.push('======================================================================');
  lines.push('Made for Degens. By Degens.');

  return lines.join('\n');
}

export const trustCommand = new Command('trust')
  .description('Offline inspection of casino licenses, trust grades, risk levels, and audited evidence')
  .argument('<operator>', 'Casino name or slug (e.g. Stake, Roobet, BC.Game, Planet 7)')
  .option('-j, --json', 'Output trust dossier as raw JSON')
  .option('--root <dir>', 'Optional monorepo root directory override')
  .action((operator: string, options: { json?: boolean; root?: string }) => {
    try {
      const casinos = loadCasinos(options.root);
      if (casinos.length === 0) {
        throw new Error('No casino data available. Ensure apps/web/src/data/casinos.json exists.');
      }

      const report = buildOperatorTrustReport(operator, casinos);

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(formatOperatorTrustText(report));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (options.json) {
        console.error(JSON.stringify({ error: msg, status: 'failed' }, null, 2));
      } else {
        console.error(`[tiltcheck trust error] ${msg}`);
      }
      process.exit(1);
    }
  });
