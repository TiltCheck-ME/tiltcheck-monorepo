#!/usr/bin/env node
/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_LINEAR_TASKS_PATH = 'docs/ops/linear-tasks.json';
const DEFAULT_RECURRING_TASKS_PATH = 'docs/ops/recurring-tasks.json';
const DEFAULT_RECURRING_STATE_PATH = 'docs/ops/recurring-state.json';
const MAX_NEW_KEYS_PER_RUN = 5;

/**
 * @typedef {{ key: string, title: string, description?: string, priority?: number, labels?: string[] }} Task
 * @typedef {{ key: string, title: string, description?: string, priority?: number, labels?: string[], cadenceDays?: number }} RecurringTemplate
 * @typedef {{ lastQueuedAt?: string }} RecurringStateEntry
 * @typedef {Record<string, RecurringStateEntry>} RecurringStateMap
 */

/**
 * @param {string[]} argv
 * @returns {{ sidecar: string, writeAdded: string, help: boolean }}
 */
export function parseArgs(argv) {
  const args = {
    sidecar: '',
    writeAdded: 'docs/ops/linear-tasks-last-run.json',
    help: false,
  };

  for (let i = 0; i < argv.length; ) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
      i += 1;
      continue;
    }

    if (arg === '--sidecar' || arg.startsWith('--sidecar=')) {
      args.sidecar = readArgValue(argv, i, '--sidecar');
      i += arg.includes('=') ? 1 : 2;
      continue;
    }

    if (arg === '--write-added' || arg.startsWith('--write-added=')) {
      args.writeAdded = readArgValue(argv, i, '--write-added');
      i += arg.includes('=') ? 1 : 2;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.help && !args.sidecar.trim()) {
    throw new Error('Expected --sidecar path to a .tasks.json file');
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
  return value;
}

export function printHelp() {
  console.log(`Usage:
  node scripts/ops/merge-proposed-tasks.mjs --sidecar docs/research/YYYY-MM-DD-competitor-matrix.tasks.json

Behavior:
  - Loads proposedTasks from the sidecar JSON file
  - Loads docs/ops/recurring-tasks.json and docs/ops/recurring-state.json
  - Merges research gaps first, then due recurring templates
  - Caps new keys at 5 per run
  - Skips keys already present in docs/ops/linear-tasks.json
  - Updates lastQueuedAt only for recurring items that were actually queued
  - Writes only the newly added tasks to --write-added (default docs/ops/linear-tasks-last-run.json) for Linear sync`);
}

/**
 * @param {unknown} value
 * @returns {Task[]}
 */
function normalizeTaskList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      key: String(entry.key ?? '').trim(),
      title: String(entry.title ?? '').trim(),
      description: String(entry.description ?? '').trim(),
      priority: Number.isFinite(Number(entry.priority)) ? Number(entry.priority) : 0,
      ...(Array.isArray(entry.labels) ? { labels: entry.labels.map((label) => String(label).trim()).filter(Boolean) } : {}),
    }))
    .filter((entry) => entry.key && entry.title);
}

/**
 * @param {unknown} value
 * @returns {RecurringTemplate[]}
 */
function normalizeRecurringTemplates(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      key: String(entry.key ?? '').trim(),
      title: String(entry.title ?? '').trim(),
      description: String(entry.description ?? '').trim(),
      priority: Number.isFinite(Number(entry.priority)) ? Number(entry.priority) : 0,
      cadenceDays: Math.max(0, Number(entry.cadenceDays) || 0),
      ...(Array.isArray(entry.labels) ? { labels: entry.labels.map((label) => String(label).trim()).filter(Boolean) } : {}),
    }))
    .filter((entry) => entry.key && entry.title);
}

/**
 * @param {RecurringTemplate[]} templates
 * @param {RecurringStateMap} state
 * @param {Date} [now]
 * @returns {Task[]}
 */
export function dueRecurring(templates, state, now = new Date()) {
  const nowValue = now instanceof Date && !Number.isNaN(now.valueOf()) ? now : new Date();
  const stateMap = state && typeof state === 'object' ? state : {};

  return normalizeRecurringTemplates(templates).filter((template) => {
    const cadenceDays = template.cadenceDays ?? 0;
    if (cadenceDays === 0) {
      return true;
    }

    const lastQueuedAt = stateMap?.[template.key]?.lastQueuedAt;
    if (!lastQueuedAt) {
      return true;
    }

    const lastQueued = new Date(lastQueuedAt);
    if (Number.isNaN(lastQueued.valueOf())) {
      return true;
    }

    const cadenceMs = cadenceDays * 24 * 60 * 60 * 1000;
    return nowValue.valueOf() - lastQueued.valueOf() >= cadenceMs;
  }).map((template) => ({
    key: template.key,
    title: template.title,
    description: template.description ?? '',
    priority: template.priority ?? 0,
    ...(Array.isArray(template.labels) ? { labels: template.labels } : {}),
  }));
}

/**
 * @param {{ existingTasks?: Task[], proposed?: Task[], recurringDue?: Task[], maxNew?: number, queuedAt?: string }} options
 * @returns {{ tasks: Task[], added: Task[], stateUpdates: Record<string, { lastQueuedAt: string }> }}
 */
export function mergeTasks(options) {
  const existingTasks = normalizeTaskList(options?.existingTasks);
  const proposed = normalizeTaskList(options?.proposed);
  const recurringDue = normalizeTaskList(options?.recurringDue);
  const recurringKeys = new Set(recurringDue.map((task) => task.key));
  const seenKeys = new Set(existingTasks.map((task) => task.key));
  const added = [];
  const stateUpdates = {};
  const maxNew = Math.max(0, Math.min(MAX_NEW_KEYS_PER_RUN, Number(options?.maxNew) || MAX_NEW_KEYS_PER_RUN));
  const queuedAt = String(options?.queuedAt || new Date().toISOString());

  for (const task of [...proposed, ...recurringDue]) {
    if (added.length >= maxNew) {
      break;
    }
    if (!task.key || seenKeys.has(task.key)) {
      continue;
    }

    seenKeys.add(task.key);
    added.push(task);

    if (recurringKeys.has(task.key)) {
      stateUpdates[task.key] = { lastQueuedAt: queuedAt };
    }
  }

  return {
    tasks: [...existingTasks, ...added],
    added,
    stateUpdates,
  };
}

/**
 * @param {string} filePath
 * @returns {Promise<any>}
 */
async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

/**
 * @param {string} filePath
 * @param {any} value
 * @returns {Promise<void>}
 */
async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/**
 * @param {{ sidecarPath: string, linearTasksPath?: string, recurringTasksPath?: string, recurringStatePath?: string, maxNew?: number, now?: Date }} options
 * @returns {Promise<{ tasks: Task[], added: Task[], stateUpdates: Record<string, { lastQueuedAt: string }>, linearTasksPath: string, recurringStatePath: string }>}
 */
export async function runMergeTaskFiles(options) {
  const now = options?.now instanceof Date && !Number.isNaN(options.now.valueOf()) ? options.now : new Date();
  const sidecarPath = path.resolve(process.cwd(), options.sidecarPath);
  const linearTasksPath = path.resolve(process.cwd(), options.linearTasksPath || DEFAULT_LINEAR_TASKS_PATH);
  const recurringTasksPath = path.resolve(process.cwd(), options.recurringTasksPath || DEFAULT_RECURRING_TASKS_PATH);
  const recurringStatePath = path.resolve(process.cwd(), options.recurringStatePath || DEFAULT_RECURRING_STATE_PATH);

  const [sidecar, linearTasksDoc, recurringTasksDoc, recurringStateDoc] = await Promise.all([
    readJson(sidecarPath),
    readJson(linearTasksPath),
    readJson(recurringTasksPath),
    readJson(recurringStatePath),
  ]);

  const proposed = normalizeTaskList(sidecar?.proposedTasks);
  const recurringDue = dueRecurring(recurringTasksDoc?.templates ?? [], recurringStateDoc?.queued ?? {}, now);
  const mergeResult = mergeTasks({
    existingTasks: linearTasksDoc?.tasks ?? [],
    proposed,
    recurringDue,
    maxNew: options?.maxNew,
    queuedAt: now.toISOString(),
  });

  const nextLinearTasksDoc = {
    copyright: linearTasksDoc?.copyright,
    tasks: mergeResult.tasks,
  };
  const nextRecurringStateDoc = {
    copyright: recurringStateDoc?.copyright,
    queued: {
      ...(recurringStateDoc?.queued && typeof recurringStateDoc.queued === 'object' ? recurringStateDoc.queued : {}),
      ...mergeResult.stateUpdates,
    },
  };

  const writeAddedPath = options.writeAddedPath
    ? path.resolve(process.cwd(), options.writeAddedPath)
    : null;

  const writes = [
    writeJson(linearTasksPath, nextLinearTasksDoc),
    writeJson(recurringStatePath, nextRecurringStateDoc),
  ];

  if (writeAddedPath) {
    writes.push(
      writeJson(writeAddedPath, {
        copyright: linearTasksDoc?.copyright,
        tasks: mergeResult.added,
      }),
    );
  }

  await Promise.all(writes);

  return {
    tasks: mergeResult.tasks,
    added: mergeResult.added,
    stateUpdates: mergeResult.stateUpdates,
    linearTasksPath,
    recurringStatePath,
    writeAddedPath,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  const result = await runMergeTaskFiles({
    sidecarPath: args.sidecar,
    writeAddedPath: args.writeAdded,
  });

  console.log(`[merge-proposed-tasks] Added ${result.added.length} task(s).`);
  console.log(`[merge-proposed-tasks] Updated ${path.relative(process.cwd(), result.linearTasksPath)}`);
  console.log(`[merge-proposed-tasks] Updated ${path.relative(process.cwd(), result.recurringStatePath)}`);
  if (result.writeAddedPath) {
    console.log(`[merge-proposed-tasks] Wrote run queue ${path.relative(process.cwd(), result.writeAddedPath)}`);
  }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (entryPath === modulePath) {
  main().catch((error) => {
    console.error(`[merge-proposed-tasks] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
