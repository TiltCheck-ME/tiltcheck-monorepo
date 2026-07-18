#!/usr/bin/env node
/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMatrix, gapsFromMatrix, proposedTasksFromGaps, scorePage } from './lib/research-matrix.mjs';
import { formatBriefMarkdown, formatSidecarJson } from './lib/research-brief-format.mjs';

const DEFAULT_CONFIG = 'docs/ops/research-competitors.json';
const DEFAULT_OUT_DIR = 'docs/research';
const DEFAULT_SLUG = 'competitor-matrix';
const DEFAULT_FETCH_TIMEOUT_MS = 15000;
const USER_AGENT = 'TiltCheckResearchBot/1.0';
const LLM_SYSTEM_PROMPT =
  'You may only assign yes, no, or partial when the provided HTML excerpt contains evidence. Otherwise unknown. Return JSON only.';

/**
 * @typedef {'yes'|'no'|'partial'|'unknown'} CellValue
 * @typedef {{ url: string, ok: boolean, status: number, html: string, error?: string }} FetchMeta
 * @typedef {{ slug: string, date: string, config: string, outDir: string, help: boolean }} CliArgs
 * @typedef {{ axes: string[], axisHints: Record<string, string[] | { positive?: string[], negative?: string[] }>, competitors: Array<{ id: string, name: string, aliases?: string[], urls: string[] }> }} ResearchConfig
 */

/**
 * @param {string[]} argv
 * @returns {CliArgs}
 */
export function parseArgs(argv) {
  const args = {
    slug: DEFAULT_SLUG,
    date: new Date().toISOString().slice(0, 10),
    config: DEFAULT_CONFIG,
    outDir: DEFAULT_OUT_DIR,
    help: false,
  };

  for (let i = 0; i < argv.length; ) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
      i += 1;
      continue;
    }

    if (arg === '--slug' || arg.startsWith('--slug=')) {
      args.slug = readArgValue(argv, i, '--slug');
      i += arg.includes('=') ? 1 : 2;
      continue;
    }

    if (arg === '--date' || arg.startsWith('--date=')) {
      args.date = readArgValue(argv, i, '--date');
      i += arg.includes('=') ? 1 : 2;
      continue;
    }

    if (arg === '--config' || arg.startsWith('--config=')) {
      args.config = readArgValue(argv, i, '--config');
      i += arg.includes('=') ? 1 : 2;
      continue;
    }

    if (arg === '--out-dir' || arg.startsWith('--out-dir=')) {
      args.outDir = readArgValue(argv, i, '--out-dir');
      i += arg.includes('=') ? 1 : 2;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new Error(`Expected --date in YYYY-MM-DD format, got "${args.date}"`);
  }
  const slug = args.slug.trim();
  if (!slug) {
    throw new Error('Expected non-empty --slug');
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) {
    throw new Error(`Invalid --slug "${slug}". Use letters, numbers, and hyphens only.`);
  }
  args.slug = slug.toLowerCase();

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
  node scripts/ops/research-brief.mjs [--slug competitor-matrix] [--date YYYY-MM-DD] [--config docs/ops/research-competitors.json] [--out-dir docs/research]

Behavior:
  - Fetches allowlisted competitor URLs with User-Agent ${USER_AGENT}
  - Writes docs/research/YYYY-MM-DD-<slug>.md
  - Writes docs/research/YYYY-MM-DD-<slug>.tasks.json
  - Uses heuristic scoring by default
  - Optionally uses an OpenAI-compatible LLM when RESEARCH_LLM_API_KEY is set
  - Still exits 0 and writes output when some fetches fail

Optional environment variables:
  RESEARCH_LLM_API_KEY
  RESEARCH_LLM_BASE_URL
  RESEARCH_LLM_MODEL`);
}

/**
 * @param {string} value
 * @returns {CellValue}
 */
function normalizeCellValue(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'yes' || normalized === 'no' || normalized === 'partial' || normalized === 'unknown'
    ? normalized
    : 'unknown';
}

/**
 * @param {CellValue | string} candidate
 * @param {string} html
 * @param {string[] | { positive?: string[], negative?: string[] }} axisHints
 * @returns {CellValue}
 */
export function validateModelCellValue(candidate, html, axisHints) {
  const normalizedCandidate = normalizeCellValue(candidate);
  if (normalizedCandidate === 'unknown') {
    return 'unknown';
  }

  const heuristic = scorePage(html, axisHints);
  if (heuristic === 'unknown') {
    return 'unknown';
  }

  return heuristic === normalizedCandidate ? normalizedCandidate : 'unknown';
}

/**
 * @param {string} url
 * @param {{ timeoutMs?: number, fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<FetchMeta>}
 */
export async function fetchText(url, options = {}) {
  const timeoutMs = Number(options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS);
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return {
        url,
        ok: false,
        status: 0,
        html: '',
        error: `Unsupported URL protocol: ${parsed.protocol}`,
      };
    }

    const response = await fetchImpl(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
      },
    });
    const html = await response.text();

    return {
      url,
      ok: response.ok,
      status: response.status,
      html: response.ok ? html : '',
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: 0,
      html: '',
      error: String(error instanceof Error ? error.message : error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @param {string} configPath
 * @returns {Promise<ResearchConfig>}
 */
async function loadConfig(configPath) {
  const raw = await readFile(configPath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.axes) || parsed.axes.some((axis) => !String(axis).trim())) {
    throw new Error(`Expected non-empty "axes" array in ${configPath}`);
  }
  if (!parsed.axisHints || typeof parsed.axisHints !== 'object') {
    throw new Error(`Expected "axisHints" object in ${configPath}`);
  }
  if (!Array.isArray(parsed.competitors) || parsed.competitors.length === 0) {
    throw new Error(`Expected non-empty "competitors" array in ${configPath}`);
  }

  return parsed;
}

/**
 * @param {ResearchConfig} config
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} options
 * @returns {Promise<{ rows: Array<{ name: string, url: string|null, ok: boolean, html: string }>, fetches: FetchMeta[] }>}
 */
async function fetchCompetitorPages(config, options = {}) {
  const rows = [];
  const fetches = [];

  for (const competitor of config.competitors) {
    const urlList = Array.isArray(competitor.urls) ? competitor.urls.filter(Boolean) : [];
    const successful = [];

    for (const url of urlList) {
      const fetchMeta = await fetchText(url, options);
      fetches.push(fetchMeta);
      if (fetchMeta.ok && fetchMeta.html) {
        successful.push(fetchMeta);
      }
    }

    rows.push({
      name: competitor.name,
      url: successful[0]?.url ?? urlList[0] ?? null,
      ok: successful.length > 0,
      html: successful.map((entry) => entry.html).join('\n\n'),
    });
  }

  return { rows, fetches };
}

/**
 * @param {string} value
 * @returns {string}
 */
function extractJsonObject(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    throw new Error('LLM returned empty content');
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

/**
 * @param {Array<{ name: string, html: string, url: string|null }>} rows
 * @param {string[]} axes
 * @param {Record<string, string[] | { positive?: string[], negative?: string[] }>} axisHints
 * @param {{ apiKey: string, baseUrl?: string, model?: string, fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<{ mode: 'llm', cells: Record<string, Record<string, CellValue>> }>}
 */
async function requestLlmMatrix(rows, axes, axisHints, options = {}) {
  const apiKey = String(options.apiKey || '').trim();
  if (!apiKey) {
    throw new Error('Missing LLM API key');
  }

  const baseUrl = String(options.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = String(options.model || 'gpt-4o-mini');
  const fetchImpl = options.fetchImpl ?? fetch;
  const payload = {
    model,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: LLM_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: JSON.stringify({
          axes,
          axisHints,
          competitors: rows.map((row) => ({
            name: row.name,
            url: row.url,
            excerpt: row.html.slice(0, 12000),
          })),
          outputSchema: {
            cells: {
              '<competitor-name>': {
                '<axis-name>': 'yes|no|partial|unknown',
              },
            },
          },
        }),
      },
    ],
  };

  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  const parsed = JSON.parse(extractJsonObject(content));
  const cells = parsed?.cells;

  if (!cells || typeof cells !== 'object') {
    throw new Error('LLM response missing cells object');
  }

  /** @type {Record<string, Record<string, CellValue>>} */
  const normalized = {};

  for (const [competitor, values] of Object.entries(cells)) {
    if (!values || typeof values !== 'object') {
      continue;
    }

    normalized[competitor] = {};
    for (const axis of axes) {
      normalized[competitor][axis] = normalizeCellValue(values[axis]);
    }
  }

  return { mode: 'llm', cells: normalized };
}

/**
 * @param {{ rows: Array<{ name: string, url: string|null, ok: boolean, html: string }>, axes: string[], axisHints: Record<string, string[] | { positive?: string[], negative?: string[] }>, heuristicMatrix: Record<string, Record<string, { value: CellValue, url: string|null }>>, llmApiKey?: string, llmBaseUrl?: string, llmModel?: string, llmClient?: Function, fetchImpl?: typeof fetch }} options
 * @returns {Promise<{ mode: 'heuristic' | 'llm', matrix: Record<string, Record<string, { value: CellValue, url: string|null }>> }>}
 */
async function maybeApplyLlmMatrix(options) {
  const {
    rows,
    axes,
    axisHints,
    heuristicMatrix,
    llmApiKey,
    llmBaseUrl,
    llmModel,
    llmClient,
    fetchImpl,
  } = options;

  if (!String(llmApiKey || '').trim()) {
    return { mode: 'heuristic', matrix: heuristicMatrix };
  }

  const client =
    llmClient ??
    ((clientArgs) =>
      requestLlmMatrix(clientArgs.rows, clientArgs.axes, clientArgs.axisHints, {
        apiKey: llmApiKey,
        baseUrl: llmBaseUrl,
        model: llmModel,
        fetchImpl,
      }));

  try {
    const llmResult = await client({ rows, axes, axisHints });
    /** @type {Record<string, Record<string, { value: CellValue, url: string|null }>>} */
    const merged = JSON.parse(JSON.stringify(heuristicMatrix));

    for (const row of rows) {
      for (const axis of axes) {
        const candidate = llmResult?.cells?.[row.name]?.[axis];
        if (!candidate) {
          continue;
        }

        const validated = validateModelCellValue(candidate, row.html, axisHints?.[axis] ?? []);
        merged[row.name][axis] = {
          value: candidate === 'unknown' ? 'unknown' : validated,
          url: row.url ?? null,
        };
      }
    }

    return { mode: 'llm', matrix: merged };
  } catch (error) {
    console.warn(`[research-brief] LLM path failed, falling back to heuristic: ${error instanceof Error ? error.message : String(error)}`);
    return { mode: 'heuristic', matrix: heuristicMatrix };
  }
}

/**
 * @param {{ slug?: string, date?: string, configPath?: string, outDir?: string, fetchImpl?: typeof fetch, timeoutMs?: number, llmApiKey?: string, llmBaseUrl?: string, llmModel?: string, llmClient?: Function }} [options]
 * @returns {Promise<{ mode: 'heuristic' | 'llm', markdownPath: string, sidecarPath: string, fetches: FetchMeta[], matrix: Record<string, Record<string, { value: CellValue, url: string|null }>>, gaps: Array<{ competitor: string, axis: string, url: string|null }>, proposedTasks: Array<{ key: string, title: string, description: string, priority: number, labels: string[] }> }>}
 */
export async function runResearchBrief(options = {}) {
  const slug = String(options.slug || DEFAULT_SLUG).trim();
  const date = String(options.date || new Date().toISOString().slice(0, 10)).trim();
  const configPath = path.resolve(process.cwd(), options.configPath || DEFAULT_CONFIG);
  const outDir = path.resolve(process.cwd(), options.outDir || DEFAULT_OUT_DIR);
  const config = await loadConfig(configPath);
  const { rows, fetches } = await fetchCompetitorPages(config, {
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
  });

  const heuristicMatrix = buildMatrix(rows, config.axes, config.axisHints);
  const llmResult = await maybeApplyLlmMatrix({
    rows,
    axes: config.axes,
    axisHints: config.axisHints,
    heuristicMatrix,
    llmApiKey: options.llmApiKey ?? process.env.RESEARCH_LLM_API_KEY,
    llmBaseUrl: options.llmBaseUrl ?? process.env.RESEARCH_LLM_BASE_URL,
    llmModel: options.llmModel ?? process.env.RESEARCH_LLM_MODEL,
    llmClient: options.llmClient,
    fetchImpl: options.fetchImpl,
  });
  const matrix = llmResult.matrix;
  const gaps = gapsFromMatrix(matrix);
  const proposedTasks = proposedTasksFromGaps(gaps, date, 5);
  const markdown = formatBriefMarkdown({
    date,
    slug,
    fetches,
    matrix,
    gaps,
    proposedTasks,
    mode: llmResult.mode,
  });
  const sidecar = formatSidecarJson({
    date,
    slug,
    proposedTasks,
  });

  await mkdir(outDir, { recursive: true });
  const markdownPath = path.join(outDir, `${date}-${slug}.md`);
  const sidecarPath = path.join(outDir, `${date}-${slug}.tasks.json`);
  await writeFile(markdownPath, markdown, 'utf8');
  await writeFile(sidecarPath, `${JSON.stringify(sidecar, null, 2)}\n`, 'utf8');

  return {
    mode: llmResult.mode,
    markdownPath,
    sidecarPath,
    fetches,
    matrix,
    gaps,
    proposedTasks,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  const result = await runResearchBrief({
    slug: args.slug,
    date: args.date,
    configPath: args.config,
    outDir: args.outDir,
  });

  console.log(`[research-brief] Wrote ${path.relative(process.cwd(), result.markdownPath)}`);
  console.log(`[research-brief] Wrote ${path.relative(process.cwd(), result.sidecarPath)}`);

  const failedFetches = result.fetches.filter((entry) => !entry.ok).length;
  if (failedFetches > 0) {
    console.warn(`[research-brief] ${failedFetches} fetches failed; unknown cells were preserved where evidence was missing.`);
  }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (entryPath === modulePath) {
  main().catch((error) => {
    console.error(`[research-brief] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
