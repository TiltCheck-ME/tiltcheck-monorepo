#!/usr/bin/env node
/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PROPOSALS_PATH = 'data/trust-engine/operator-facts.proposals.json';
const DEFAULT_LIVE_PATH = 'data/trust-engine/operator-facts.live.json';

/**
 * @typedef {Record<string, unknown> & { slug?: string, status?: string }} OperatorFactRecord
 * @typedef {{ copyright?: string, operators?: OperatorFactRecord[] }} OperatorFactsFile
 */

/**
 * @param {string[]} argv
 * @returns {{ action: 'list' | 'promote' | 'reject', slug: string, help: boolean }}
 */
export function parseArgs(argv) {
  const args = {
    action: /** @type {'list' | 'promote' | 'reject' | null} */ (null),
    slug: '',
    help: false,
  };

  for (let i = 0; i < argv.length; ) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
      i += 1;
      continue;
    }

    if (arg === '--list') {
      args.action = 'list';
      i += 1;
      continue;
    }

    if (arg === '--promote' || arg.startsWith('--promote=')) {
      args.action = 'promote';
      args.slug = readArgValue(argv, i, '--promote');
      i += arg.includes('=') ? 1 : 2;
      continue;
    }

    if (arg === '--reject' || arg.startsWith('--reject=')) {
      args.action = 'reject';
      args.slug = readArgValue(argv, i, '--reject');
      i += arg.includes('=') ? 1 : 2;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.help && !args.action) {
    throw new Error('Expected one of --list, --promote <slug>, or --reject <slug>');
  }

  if ((args.action === 'promote' || args.action === 'reject') && !args.slug.trim()) {
    throw new Error(`Expected slug for --${args.action}`);
  }

  return args;
}

/**
 * @param {string[]} argv
 * @param {number} index
 * @param {string} flagName
 * @returns {string}
 */
function readArgValue(argv, index, flagName) {
  const arg = argv[index];
  if (arg.includes('=')) {
    const value = arg.slice(arg.indexOf('=') + 1).trim();
    if (!value) {
      throw new Error(`Missing value for ${flagName}`);
    }
    return value;
  }

  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flagName}`);
  }
  return value.trim();
}

export function printHelp() {
  console.log(`Usage:
  node scripts/ops/promote-operator-facts.mjs --list
  node scripts/ops/promote-operator-facts.mjs --promote <slug>
  node scripts/ops/promote-operator-facts.mjs --reject <slug>

Behavior:
  - Reads data/trust-engine/operator-facts.proposals.json and operator-facts.live.json
  - Promote copies the proposal record as-is, sets status to live, upserts by slug, removes proposal
  - Reject removes the proposal only
  - Never invents fields`);
}

/**
 * @param {unknown} value
 * @returns {OperatorFactRecord[]}
 */
function normalizeOperators(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry) => entry && typeof entry === 'object');
}

/**
 * @param {OperatorFactRecord[]} operators
 * @returns {string[]}
 */
export function listProposalSlugs(operators) {
  return normalizeOperators(operators)
    .map((record) => String(record.slug ?? '').trim())
    .filter(Boolean);
}

/**
 * @param {OperatorFactRecord[]} proposals
 * @param {OperatorFactRecord[]} live
 * @param {string} slug
 * @returns {{ proposals: OperatorFactRecord[], live: OperatorFactRecord[], found: boolean }}
 */
export function promoteOperator(proposals, live, slug) {
  const targetSlug = String(slug ?? '').trim();
  const proposalIndex = normalizeOperators(proposals).findIndex(
    (record) => String(record.slug ?? '').trim() === targetSlug,
  );

  if (proposalIndex < 0) {
    return {
      proposals: normalizeOperators(proposals),
      live: normalizeOperators(live),
      found: false,
    };
  }

  const proposal = normalizeOperators(proposals)[proposalIndex];
  const nextProposals = normalizeOperators(proposals).filter((_, index) => index !== proposalIndex);
  const promotedRecord = {
    ...proposal,
    status: 'live',
  };

  const nextLive = normalizeOperators(live).filter(
    (record) => String(record.slug ?? '').trim() !== targetSlug,
  );
  nextLive.push(promotedRecord);

  return {
    proposals: nextProposals,
    live: nextLive,
    found: true,
  };
}

/**
 * @param {OperatorFactRecord[]} proposals
 * @param {string} slug
 * @returns {{ proposals: OperatorFactRecord[], found: boolean }}
 */
export function rejectOperator(proposals, slug) {
  const targetSlug = String(slug ?? '').trim();
  const nextProposals = normalizeOperators(proposals).filter(
    (record) => String(record.slug ?? '').trim() !== targetSlug,
  );

  return {
    proposals: nextProposals,
    found: nextProposals.length !== normalizeOperators(proposals).length,
  };
}

/**
 * @param {string} filePath
 * @returns {Promise<OperatorFactsFile>}
 */
async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

/**
 * @param {string} filePath
 * @param {OperatorFactsFile} value
 * @returns {Promise<void>}
 */
async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/**
 * @param {{
 *   proposalsPath: string,
 *   livePath: string,
 *   action: 'list' | 'promote' | 'reject',
 *   slug?: string,
 * }} options
 * @returns {Promise<{ found?: boolean, slugs?: string[] }>}
 */
export async function runPromoteOperatorFacts(options) {
  const proposalsPath = path.resolve(process.cwd(), options.proposalsPath);
  const livePath = path.resolve(process.cwd(), options.livePath);

  const [proposalsDoc, liveDoc] = await Promise.all([
    readJson(proposalsPath),
    readJson(livePath),
  ]);

  const proposals = normalizeOperators(proposalsDoc?.operators);
  const live = normalizeOperators(liveDoc?.operators);

  if (options.action === 'list') {
    return {
      slugs: listProposalSlugs(proposals),
    };
  }

  if (options.action === 'reject') {
    const result = rejectOperator(proposals, String(options.slug ?? ''));
    if (!result.found) {
      return {
        found: false,
      };
    }
    await writeJson(proposalsPath, {
      copyright: proposalsDoc?.copyright,
      operators: result.proposals,
    });

    return {
      found: result.found,
    };
  }

  const result = promoteOperator(proposals, live, String(options.slug ?? ''));
  if (!result.found) {
    return {
      found: false,
    };
  }

  await Promise.all([
    writeJson(proposalsPath, {
      copyright: proposalsDoc?.copyright,
      operators: result.proposals,
    }),
    writeJson(livePath, {
      copyright: liveDoc?.copyright,
      operators: result.live,
    }),
  ]);

  return {
    found: result.found,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  const result = await runPromoteOperatorFacts({
    proposalsPath: DEFAULT_PROPOSALS_PATH,
    livePath: DEFAULT_LIVE_PATH,
    action: args.action,
    slug: args.slug,
  });

  if (args.action === 'list') {
    const slugs = result.slugs ?? [];
    if (slugs.length === 0) {
      console.log('[promote-operator-facts] No proposals queued.');
      return;
    }

    console.log('[promote-operator-facts] Proposed operator facts:');
    for (const slug of slugs) {
      console.log(`  - ${slug}`);
    }
    return;
  }

  if (!result.found) {
    throw new Error(`No proposal found for slug "${args.slug}"`);
  }

  if (args.action === 'promote') {
    console.log(`[promote-operator-facts] Promoted "${args.slug}" to live.`);
    console.log(`[promote-operator-facts] Updated ${DEFAULT_LIVE_PATH}`);
    console.log(`[promote-operator-facts] Updated ${DEFAULT_PROPOSALS_PATH}`);
    return;
  }

  console.log(`[promote-operator-facts] Rejected proposal "${args.slug}".`);
  console.log(`[promote-operator-facts] Updated ${DEFAULT_PROPOSALS_PATH}`);
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (entryPath === modulePath) {
  main().catch((error) => {
    console.error(`[promote-operator-facts] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
