// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-25

import path from 'node:path';

import { tarotBaselineProfile } from '../tools/rgs-pattern-comparator/baseline-tarot.js';
import { compareProfiles, formatComparisonReport, loadProfileFromFile } from '../tools/rgs-pattern-comparator/core.js';
import { scrapePublicRgsProfile } from '../tools/rgs-pattern-comparator/scraper.js';
import type { RgsFingerprintProfile } from '../tools/rgs-pattern-comparator/types.js';

interface CliArgs {
  url?: string;
  baseline?: string;
  baselineFile?: string;
  timeoutMs?: number;
  settleMs?: number;
  json?: boolean;
  help?: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    switch (current) {
      case '--url':
        args.url = next;
        index += 1;
        break;
      case '--baseline':
        args.baseline = next;
        index += 1;
        break;
      case '--baseline-file':
        args.baselineFile = next;
        index += 1;
        break;
      case '--timeout-ms':
        args.timeoutMs = Number(next);
        index += 1;
        break;
      case '--settle-ms':
        args.settleMs = Number(next);
        index += 1;
        break;
      case '--json':
        args.json = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        break;
    }
  }

  return args;
}

function printUsage(): void {
  console.log([
    'Usage:',
    '  pnpm exec tsx scripts/rgs-pattern-compare.ts --url <public-game-url> [--baseline tarot] [--json]',
    '  pnpm exec tsx scripts/rgs-pattern-compare.ts --url <public-game-url> --baseline-file <baseline.json>',
    '',
    'Flags:',
    '  --url            Public game URL to inspect',
    '  --baseline       Built-in baseline id. Defaults to tarot',
    '  --baseline-file  External JSON profile path',
    '  --timeout-ms     Page load timeout in milliseconds',
    '  --settle-ms      Extra network settle time in milliseconds',
    '  --json           Emit raw comparison JSON instead of text',
  ].join('\n'));
}

async function resolveBaseline(args: CliArgs): Promise<RgsFingerprintProfile> {
  if (args.baselineFile) {
    const baselinePath = path.resolve(process.cwd(), args.baselineFile);
    return loadProfileFromFile(baselinePath);
  }

  if (!args.baseline || args.baseline === 'tarot') {
    return tarotBaselineProfile;
  }

  throw new Error(`Unknown baseline: ${args.baseline}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.url) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const baselineProfile = await resolveBaseline(args);
  const targetProfile = await scrapePublicRgsProfile({
    url: args.url,
    timeoutMs: args.timeoutMs,
    settleMs: args.settleMs,
  });
  const report = compareProfiles(baselineProfile, targetProfile);

  if (args.json) {
    console.log(JSON.stringify({
      baselineProfile,
      targetProfile,
      report,
    }, null, 2));
    return;
  }

  console.log(formatComparisonReport(report));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`RGS comparison failed: ${message}`);
  process.exit(1);
});
