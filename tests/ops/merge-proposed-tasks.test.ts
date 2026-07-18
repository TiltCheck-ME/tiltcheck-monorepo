/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  dueRecurring,
  mergeTasks,
  runMergeTaskFiles,
} from '../../scripts/ops/merge-proposed-tasks.mjs';

const tempDirs: string[] = [];

async function makeTempDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'merge-proposed-tasks-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('mergeTasks', () => {
  it('dedupes by key, prefers proposed first, and caps at 5', () => {
    const existing = [{ key: 'RES-OLD', title: 'x', description: 'd', priority: 3 }];
    const proposed = Array.from({ length: 4 }, (_, i) => ({
      key: `RES-NEW-${i}`,
      title: `t${i}`,
      description: 'd',
      priority: 3,
      labels: ['RESEARCH'],
    }));
    const recurringDue = [
      {
        key: 'REC-ONE',
        title: 'r1',
        description: 'd',
        priority: 3,
        labels: ['RECURRING', 'RESEARCH'],
      },
      {
        key: 'REC-TWO',
        title: 'r2',
        description: 'd',
        priority: 3,
        labels: ['RECURRING', 'FEATURE'],
      },
    ];

    const { tasks, added, stateUpdates } = mergeTasks({
      existingTasks: existing,
      proposed,
      recurringDue,
      maxNew: 5,
      queuedAt: '2026-07-18T00:00:00.000Z',
    });

    expect(added.map((task) => task.key)).toEqual([
      'RES-NEW-0',
      'RES-NEW-1',
      'RES-NEW-2',
      'RES-NEW-3',
      'REC-ONE',
    ]);
    expect(tasks).toHaveLength(6);
    expect(stateUpdates).toEqual({
      'REC-ONE': { lastQueuedAt: '2026-07-18T00:00:00.000Z' },
    });
  });

  it('skips keys already present and duplicates inside the candidate set', () => {
    const { added } = mergeTasks({
      existingTasks: [{ key: 'RES-1', title: 'x', description: 'd', priority: 3 }],
      proposed: [
        { key: 'RES-1', title: 'dup', description: 'd', priority: 3, labels: ['RESEARCH'] },
        { key: 'RES-2', title: 'keep', description: 'd', priority: 3, labels: ['RESEARCH'] },
      ],
      recurringDue: [
        { key: 'RES-2', title: 'dup2', description: 'd', priority: 3, labels: ['RECURRING'] },
      ],
      maxNew: 5,
      queuedAt: '2026-07-18T00:00:00.000Z',
    });

    expect(added.map((task) => task.key)).toEqual(['RES-2']);
  });
});

describe('dueRecurring', () => {
  it('returns due items when never queued or lastQueuedAt is older than cadence', () => {
    const templates = [
      {
        key: 'REC-COMPETITOR-MATRIX',
        title: 'Refresh competitor feature matrix',
        description: 'Run research brief and fill gaps.',
        priority: 3,
        labels: ['RECURRING', 'RESEARCH'],
        cadenceDays: 7,
      },
      {
        key: 'REC-DISCORD-MAP',
        title: 'Map 5 early-adopter degen Discord communities',
        description: 'Find community leads.',
        priority: 3,
        labels: ['RECURRING', 'RESEARCH'],
        cadenceDays: 7,
      },
      {
        key: 'REC-NOT-DUE',
        title: 'Leave this alone',
        description: 'Too fresh.',
        priority: 3,
        labels: ['RECURRING'],
        cadenceDays: 7,
      },
    ];
    const state = {
      'REC-COMPETITOR-MATRIX': { lastQueuedAt: '2026-07-01T00:00:00.000Z' },
      'REC-NOT-DUE': { lastQueuedAt: '2026-07-15T00:00:00.000Z' },
    };

    const due = dueRecurring(templates, state, new Date('2026-07-18T00:00:00.000Z'));

    expect(due.map((task) => task.key)).toEqual([
      'REC-COMPETITOR-MATRIX',
      'REC-DISCORD-MAP',
    ]);
  });
});

describe('runMergeTaskFiles', () => {
  it('preserves copyright fields and updates queued recurring state only for queued recurring items', async () => {
    const root = await makeTempDir();
    const docsOpsDir = path.join(root, 'docs', 'ops');
    const docsResearchDir = path.join(root, 'docs', 'research');
    await mkdir(docsOpsDir, { recursive: true });
    await mkdir(docsResearchDir, { recursive: true });

    const sidecarPath = path.join(docsResearchDir, '2026-07-18-competitor-matrix.tasks.json');
    const linearTasksPath = path.join(docsOpsDir, 'linear-tasks.json');
    const recurringTasksPath = path.join(docsOpsDir, 'recurring-tasks.json');
    const recurringStatePath = path.join(docsOpsDir, 'recurring-state.json');

    await writeFile(
      sidecarPath,
      JSON.stringify(
        {
          date: '2026-07-18',
          slug: 'competitor-matrix',
          proposedTasks: [
            {
              key: 'RES-NEW-1',
              title: 'Research gap one',
              description: 'd',
              priority: 3,
              labels: ['RESEARCH'],
            },
            {
              key: 'RES-NEW-2',
              title: 'Research gap two',
              description: 'd',
              priority: 3,
              labels: ['RESEARCH'],
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );

    await writeFile(
      linearTasksPath,
      `${JSON.stringify(
        {
          copyright: 'KEEP-LINEAR-COPYRIGHT',
          tasks: [{ key: 'RES-OLD', title: 'Existing', description: 'd', priority: 3 }],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    await writeFile(
      recurringTasksPath,
      `${JSON.stringify(
        {
          copyright: 'KEEP-RECURRING-TEMPLATES-COPYRIGHT',
          templates: [
            {
              key: 'REC-COMPETITOR-MATRIX',
              title: 'Refresh competitor feature matrix',
              description: 'Run research brief and review Gaps.',
              priority: 3,
              labels: ['RECURRING', 'RESEARCH'],
              cadenceDays: 7,
            },
            {
              key: 'REC-TRUST-TOP20',
              title: 'Refresh trust signals for top 20 Solana casinos',
              description: 'Update trust scoring inputs.',
              priority: 3,
              labels: ['RECURRING', 'FEATURE'],
              cadenceDays: 14,
            },
          ],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    await writeFile(
      recurringStatePath,
      `${JSON.stringify(
        {
          copyright: 'KEEP-STATE-COPYRIGHT',
          queued: {
            'REC-COMPETITOR-MATRIX': { lastQueuedAt: '2026-07-01T00:00:00.000Z' },
            'REC-TRUST-TOP20': { lastQueuedAt: '2026-07-17T00:00:00.000Z' },
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const result = await runMergeTaskFiles({
      sidecarPath,
      linearTasksPath,
      recurringTasksPath,
      recurringStatePath,
      now: new Date('2026-07-18T00:00:00.000Z'),
      maxNew: 3,
    });

    expect(result.added.map((task) => task.key)).toEqual([
      'RES-NEW-1',
      'RES-NEW-2',
      'REC-COMPETITOR-MATRIX',
    ]);

    const linear = JSON.parse(await readFile(linearTasksPath, 'utf8'));
    const recurringState = JSON.parse(await readFile(recurringStatePath, 'utf8'));

    expect(linear.copyright).toBe('KEEP-LINEAR-COPYRIGHT');
    expect(linear.tasks.map((task) => task.key)).toEqual([
      'RES-OLD',
      'RES-NEW-1',
      'RES-NEW-2',
      'REC-COMPETITOR-MATRIX',
    ]);
    expect(recurringState.copyright).toBe('KEEP-STATE-COPYRIGHT');
    expect(recurringState.queued).toEqual({
      'REC-COMPETITOR-MATRIX': { lastQueuedAt: '2026-07-18T00:00:00.000Z' },
      'REC-TRUST-TOP20': { lastQueuedAt: '2026-07-17T00:00:00.000Z' },
    });
  });
});
