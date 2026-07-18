/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  listProposalSlugs,
  promoteOperator,
  rejectOperator,
  runPromoteOperatorFacts,
} from '../../scripts/ops/promote-operator-facts.mjs';

const tempDirs: string[] = [];

async function makeTempDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'promote-operator-facts-test-'));
  tempDirs.push(dir);
  return dir;
}

async function snapshotFile(filePath: string) {
  const [content, stats] = await Promise.all([readFile(filePath, 'utf8'), stat(filePath)]);
  return {
    content,
    mtimeMs: stats.mtimeMs,
  };
}

const sampleProposal = {
  slug: 'metawin',
  name: 'MetaWin',
  aliases: ['metawin.us'],
  status: 'stale' as const,
  proposedAt: '2026-07-10T00:00:00.000Z',
  vipCurrencyRules: [
    {
      currencyName: 'Gold Coins',
      canLevel: false,
      notes: 'Gold Coins do not count toward VIP level.',
      sourceUrl: 'https://example.com/vip',
      asOf: '2026-07-01',
    },
  ],
  lastVerifiedAt: '2026-07-01',
  verifiedBy: 'scraper-fixture',
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('listProposalSlugs', () => {
  it('returns slugs from proposals operators array', () => {
    expect(
      listProposalSlugs([
        { slug: 'metawin', name: 'MetaWin', status: 'stale', lastVerifiedAt: '2026-07-01' },
        { slug: 'crown-coins', name: 'Crown Coins', status: 'stale', lastVerifiedAt: '2026-07-01' },
      ]),
    ).toEqual(['metawin', 'crown-coins']);
  });
});

describe('promoteOperator', () => {
  it('copies proposal into live with status live and removes from proposals', () => {
    const proposals = [structuredClone(sampleProposal)];
    const live = [
      {
        slug: 'other-op',
        name: 'Other',
        status: 'live' as const,
        lastVerifiedAt: '2026-06-01',
      },
    ];

    const result = promoteOperator(proposals, live, 'metawin');

    expect(result.found).toBe(true);
    expect(result.proposals).toHaveLength(0);
    expect(result.live).toHaveLength(2);
    expect(result.live.find((record) => record.slug === 'metawin')).toEqual({
      ...sampleProposal,
      status: 'live',
    });
    expect(result.live.find((record) => record.slug === 'other-op')).toBeTruthy();
  });

  it('replaces an existing live record with the same slug', () => {
    const proposals = [structuredClone(sampleProposal)];
    const live = [
      {
        slug: 'metawin',
        name: 'MetaWin Old',
        status: 'live' as const,
        lastVerifiedAt: '2026-01-01',
      },
    ];

    const result = promoteOperator(proposals, live, 'metawin');

    expect(result.live.filter((record) => record.slug === 'metawin')).toHaveLength(1);
    expect(result.live.find((record) => record.slug === 'metawin')?.name).toBe('MetaWin');
    expect(result.live.find((record) => record.slug === 'metawin')?.status).toBe('live');
  });

  it('does not invent fields beyond setting status live', () => {
    const proposals = [structuredClone(sampleProposal)];
    const result = promoteOperator(proposals, [], 'metawin');
    const promoted = result.live[0];

    expect(Object.keys(promoted ?? {})).toEqual(Object.keys({ ...sampleProposal, status: 'live' }));
    expect(promoted?.proposedAt).toBe('2026-07-10T00:00:00.000Z');
    expect(promoted?.verifiedBy).toBe('scraper-fixture');
  });

  it('returns found false when slug is missing', () => {
    const result = promoteOperator([structuredClone(sampleProposal)], [], 'missing-slug');
    expect(result.found).toBe(false);
    expect(result.proposals).toHaveLength(1);
    expect(result.live).toHaveLength(0);
  });
});

describe('rejectOperator', () => {
  it('removes the proposal without touching live records', () => {
    const proposals = [structuredClone(sampleProposal)];
    const live = [
      {
        slug: 'metawin',
        name: 'MetaWin',
        status: 'live' as const,
        lastVerifiedAt: '2026-06-01',
      },
    ];

    const result = rejectOperator(proposals, 'metawin');

    expect(result.found).toBe(true);
    expect(result.proposals).toHaveLength(0);
    expect(live).toHaveLength(1);
  });

  it('returns found false when slug is missing', () => {
    const result = rejectOperator([structuredClone(sampleProposal)], 'missing-slug');
    expect(result.found).toBe(false);
    expect(result.proposals).toHaveLength(1);
  });
});

describe('runPromoteOperatorFacts', () => {
  it('preserves copyright fields when promoting and rejecting', async () => {
    const root = await makeTempDir();
    const dataDir = path.join(root, 'data', 'trust-engine');
    await mkdir(dataDir, { recursive: true });

    const proposalsPath = path.join(dataDir, 'operator-facts.proposals.json');
    const livePath = path.join(dataDir, 'operator-facts.live.json');

    await writeFile(
      proposalsPath,
      `${JSON.stringify(
        {
          copyright: 'KEEP-PROPOSALS-COPYRIGHT',
          operators: [sampleProposal],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    await writeFile(
      livePath,
      `${JSON.stringify(
        {
          copyright: 'KEEP-LIVE-COPYRIGHT',
          operators: [],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const promoteResult = await runPromoteOperatorFacts({
      proposalsPath,
      livePath,
      action: 'promote',
      slug: 'metawin',
    });

    expect(promoteResult.found).toBe(true);

    const liveAfterPromote = JSON.parse(await readFile(livePath, 'utf8'));
    const proposalsAfterPromote = JSON.parse(await readFile(proposalsPath, 'utf8'));

    expect(liveAfterPromote.copyright).toBe('KEEP-LIVE-COPYRIGHT');
    expect(liveAfterPromote.operators).toHaveLength(1);
    expect(liveAfterPromote.operators[0].status).toBe('live');
    expect(proposalsAfterPromote.copyright).toBe('KEEP-PROPOSALS-COPYRIGHT');
    expect(proposalsAfterPromote.operators).toHaveLength(0);

    await writeFile(
      proposalsPath,
      `${JSON.stringify(
        {
          copyright: 'KEEP-PROPOSALS-COPYRIGHT',
          operators: [{ ...sampleProposal, slug: 'crown-coins', name: 'Crown Coins' }],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const rejectResult = await runPromoteOperatorFacts({
      proposalsPath,
      livePath,
      action: 'reject',
      slug: 'crown-coins',
    });

    expect(rejectResult.found).toBe(true);

    const proposalsAfterReject = JSON.parse(await readFile(proposalsPath, 'utf8'));
    const liveAfterReject = JSON.parse(await readFile(livePath, 'utf8'));

    expect(proposalsAfterReject.operators).toHaveLength(0);
    expect(liveAfterReject.operators).toHaveLength(1);
    expect(liveAfterReject.operators[0].slug).toBe('metawin');
  });

  it('lists proposal slugs without mutating files', async () => {
    const root = await makeTempDir();
    const dataDir = path.join(root, 'data', 'trust-engine');
    await mkdir(dataDir, { recursive: true });

    const proposalsPath = path.join(dataDir, 'operator-facts.proposals.json');
    const livePath = path.join(dataDir, 'operator-facts.live.json');

    await writeFile(
      proposalsPath,
      `${JSON.stringify(
        {
          copyright: 'KEEP-PROPOSALS-COPYRIGHT',
          operators: [
            sampleProposal,
            { ...sampleProposal, slug: 'crown-coins', name: 'Crown Coins' },
          ],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    await writeFile(
      livePath,
      `${JSON.stringify({ copyright: 'KEEP-LIVE-COPYRIGHT', operators: [] }, null, 2)}\n`,
      'utf8',
    );

    const listResult = await runPromoteOperatorFacts({
      proposalsPath,
      livePath,
      action: 'list',
    });

    expect(listResult.slugs).toEqual(['metawin', 'crown-coins']);

    const proposalsAfterList = JSON.parse(await readFile(proposalsPath, 'utf8'));
    expect(proposalsAfterList.operators).toHaveLength(2);
  });

  it('does not rewrite proposals or live files when promote or reject misses', async () => {
    const root = await makeTempDir();
    const dataDir = path.join(root, 'data', 'trust-engine');
    await mkdir(dataDir, { recursive: true });

    const proposalsPath = path.join(dataDir, 'operator-facts.proposals.json');
    const livePath = path.join(dataDir, 'operator-facts.live.json');

    await writeFile(
      proposalsPath,
      `${JSON.stringify(
        {
          copyright: 'KEEP-PROPOSALS-COPYRIGHT',
          operators: [sampleProposal],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await writeFile(
      livePath,
      `${JSON.stringify(
        {
          copyright: 'KEEP-LIVE-COPYRIGHT',
          operators: [{ slug: 'existing-live', name: 'Existing Live', status: 'live', lastVerifiedAt: '2026-07-01' }],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const beforePromote = {
      proposals: await snapshotFile(proposalsPath),
      live: await snapshotFile(livePath),
    };

    await new Promise((resolve) => setTimeout(resolve, 25));

    const promoteResult = await runPromoteOperatorFacts({
      proposalsPath,
      livePath,
      action: 'promote',
      slug: 'missing-slug',
    });

    const afterPromote = {
      proposals: await snapshotFile(proposalsPath),
      live: await snapshotFile(livePath),
    };

    expect(promoteResult.found).toBe(false);
    expect(afterPromote).toEqual(beforePromote);

    await new Promise((resolve) => setTimeout(resolve, 25));

    const rejectResult = await runPromoteOperatorFacts({
      proposalsPath,
      livePath,
      action: 'reject',
      slug: 'missing-slug',
    });

    const afterReject = {
      proposals: await snapshotFile(proposalsPath),
      live: await snapshotFile(livePath),
    };

    expect(rejectResult.found).toBe(false);
    expect(afterReject).toEqual(afterPromote);
  });
});
