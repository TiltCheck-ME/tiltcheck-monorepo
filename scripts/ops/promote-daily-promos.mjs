#!/usr/bin/env node
/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18
 *
 * Promote or reject daily promo proposals into the live store.
 *
 * Usage:
 *   node scripts/ops/promote-daily-promos.mjs --list
 *   node scripts/ops/promote-daily-promos.mjs --accept <id>
 *   node scripts/ops/promote-daily-promos.mjs --reject <id>
 */

import {
  DEFAULT_LIVE_PATH,
  DEFAULT_PROPOSALS_PATH,
  readPromoFile,
  writePromoFile,
  upsertPromo,
} from './lib/daily-promos.mjs';

function parseArgs(argv) {
  const out = { action: null, id: '', help: false };
  for (let i = 0; i < argv.length; ) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      i += 1;
      continue;
    }
    if (arg === '--list') {
      out.action = 'list';
      i += 1;
      continue;
    }
    if (arg === '--accept' || arg.startsWith('--accept=')) {
      out.action = 'accept';
      out.id = arg.includes('=') ? arg.split('=').slice(1).join('=') : argv[i + 1] || '';
      i += arg.includes('=') ? 1 : 2;
      continue;
    }
    if (arg === '--reject' || arg.startsWith('--reject=')) {
      out.action = 'reject';
      out.id = arg.includes('=') ? arg.split('=').slice(1).join('=') : argv[i + 1] || '';
      i += arg.includes('=') ? 1 : 2;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!out.help && !out.action) {
    throw new Error('Expected one of --list, --accept <id>, or --reject <id>');
  }
  if ((out.action === 'accept' || out.action === 'reject') && !out.id.trim()) {
    throw new Error(`Expected id for --${out.action}`);
  }
  return out;
}

function printHelp() {
  console.log(`Daily promo promote CLI

  --list              List proposals
  --accept <id>       Move proposal to live (status=live)
  --reject <id>       Mark proposal rejected
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const proposalsPath = process.env.DAILY_PROMOS_PROPOSALS_PATH || DEFAULT_PROPOSALS_PATH;
  const livePath = process.env.DAILY_PROMOS_LIVE_PATH || DEFAULT_LIVE_PATH;
  const proposalsDoc = readPromoFile(proposalsPath);
  const liveDoc = readPromoFile(livePath);

  if (args.action === 'list') {
    const open = proposalsDoc.promos.filter((p) => p.status === 'proposed' || !p.status || p.status === 'live');
    // proposals file should only contain proposed; show all non-rejected
    const rows = proposalsDoc.promos.filter((p) => p.status !== 'rejected');
    if (!rows.length) {
      console.log('No open proposals.');
      return;
    }
    for (const p of rows) {
      console.log(`${p.id}\t${p.status || 'proposed'}\t${p.brand}\t${p.bonusType}\t${p.bonus}`);
    }
    console.log(`Total: ${rows.length}`);
    return;
  }

  const idx = proposalsDoc.promos.findIndex((p) => p.id === args.id);
  if (idx === -1) {
    throw new Error(`Proposal not found: ${args.id}`);
  }
  const proposal = proposalsDoc.promos[idx];

  if (args.action === 'reject') {
    proposalsDoc.promos[idx] = { ...proposal, status: 'rejected', asOf: new Date().toISOString() };
    writePromoFile(proposalsPath, proposalsDoc);
    console.log(`Rejected ${args.id}`);
    return;
  }

  // accept
  const liveRec = {
    ...proposal,
    status: 'live',
    source: proposal.source || 'public-page',
    asOf: new Date().toISOString(),
    verified: new Date().toISOString().slice(0, 10),
  };
  const { promos, record } = upsertPromo(liveDoc.promos, liveRec);
  liveDoc.promos = promos;
  writePromoFile(livePath, liveDoc);
  proposalsDoc.promos.splice(idx, 1);
  writePromoFile(proposalsPath, proposalsDoc);
  console.log(`Accepted ${record.id} → live (${record.brand})`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
