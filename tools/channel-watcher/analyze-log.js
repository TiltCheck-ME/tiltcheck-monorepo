// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { buildTiltCheckDailyDegenSummary } from './report-summary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), override: false });

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : __dirname;
const LOG_FILE = path.join(DATA_DIR, 'messages.jsonl');
const REPORT_FILE_BUSINESS = path.join(DATA_DIR, 'reports_business.md');
const REPORT_FILE_LORE = path.join(DATA_DIR, 'reports_lore.md');
const TICKER_LOG_FILE = path.join(__dirname, '..', '..', 'apps', 'api', 'data', 'web_signals.json');
const CITATIONS_FILE = path.join(DATA_DIR, 'citations.md');
const ANALYSIS_MANIFEST_FILE = path.join(DATA_DIR, '.analysis-manifest.json');
const GPT_MAX_MESSAGES = 150;
const PROVIDER = (process.env.PROVIDER || 'groq').toLowerCase();

const argv = process.argv.slice(2);
const LORE_MODE = argv.includes('--lore');
const BACKFILL_MODE = argv.includes('--backfill');
const DRY_RUN = argv.includes('--dry-run');
const FROM_CHUNK = parseInt(argv.find((arg) => arg.startsWith('--from-chunk='))?.split('=')[1] || '1', 10);
const FROM_TIMESTAMP = parseOptionalDateArg('from');
const TO_TIMESTAMP = parseOptionalDateArg('to');
const RUN_LABEL = getArgValue('label') || null;
const GAP_SPLIT_MS = 6 * 60 * 60 * 1000;

const PROVIDERS = {
  ollama: {
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434/v1',
    apiKey: 'ollama',
    model: process.env.OLLAMA_MODEL || process.env.AI_MODEL || 'llama3.2:1b',
    label: 'Ollama (local)',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || process.env.AI_MODEL || 'llama-3.3-70b-versatile',
    label: 'Groq (free cloud)',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-2.0-flash',
    label: 'Google Gemini (free tier)',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'google/gemini-2.5-flash',
    label: 'OpenRouter (Gemini)',
  },
};

let currentAi = PROVIDERS[PROVIDER] || PROVIDERS.ollama;

const BUSINESS_PROMPT = `You are a community intelligence analyst for TiltCheck, a responsible gambling platform.
Analyze this batch of Discord messages. Write a structured report with these sections:

## Pain Points
Frustrations, casino issues, bad experiences, losses.

## Friction Moments
Confusion, broken processes, unanswered questions.

## Scam & Safety Signals
Predatory links, suspicious offers, unsafe behavior.

## Emotional State
Overall mood of this batch (tilted, hopeful, burned out, etc).

## TiltCheck Opportunities
3-5 specific things TiltCheck could build or do based on this data.

Be direct and actionable. Write for the founder reading over morning coffee.`;

const SIGNAL_PROMPT = `As the TiltCheck Fact-Checker & Signal Extractor:
Analyze this batch of Discord messages and extract 3-5 "Verified Casino Signals" for our website's live ticker.
IMPORTANT: ONLY EXTRATC RELEVANT CASINO ACTIVITY (Stake, Roobet, BC.Game, etc). Discard all general crypto or unrelated chat.
We only want high-signal gambling events for the public feed.
Types of signals:
- [tilt] Casino Tilt detected (emotional/desperation on a specific site)
- [sec] Casino Phishing blocked (fake bonus links/scams)
- [trust] Casino Anomaly found (fairness/payout issues)
- [vault] Control win (user moved winnings to vault)

Format: JSON array of items like {"text": "...", "type": "..."}.
Output ONLY the JSON. No other text.`;

const LORE_PROMPT = `You are a comedy writer studying a Discord server full of gambling degenerates.
Analyze these messages and write raw material for a comic strip.
Highlight tragic losses, chaotic energy, funny interactions, and potential character arcs.
Be brutally honest and funny. These degenerates are chronically online and would laugh at themselves.`;

async function callProvider(provider, text, count, systemPrompt = BUSINESS_PROMPT, modelOverride = null) {
  const model = modelOverride || provider.model;
  console.log(chalk.cyan(`  → ${provider.label} (${model})...`));
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze these ${count} messages:\n\n${text}` },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text();
      console.error(chalk.red(`  ✗ API Error (${res.status}):`), errBody);
      return { success: false, status: res.status, error: errBody };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || null;
    if (content) {
      console.log(chalk.green(`  ✓ Analysis received (${content.length} chars)`));
    }
    return { success: true, content, status: 200, modelUsed: model };
  } catch (err) {
    console.error(chalk.red('  ✗ Fetch Error:'), err.message);
    return { success: false, status: 500, error: err.message };
  }
}

async function saveWebSignals(signals) {
  if (!signals || !Array.isArray(signals)) return;
  try {
    const existing = existsSync(TICKER_LOG_FILE) ? JSON.parse(readFileSync(TICKER_LOG_FILE, 'utf-8')) : [];
    const combined = [...signals, ...existing].slice(0, 15);
    writeFileSync(TICKER_LOG_FILE, JSON.stringify(combined, null, 2));
    console.log(chalk.green(`  ✓ ${signals.length} Web Signals synced to API.`));
  } catch (err) {
    console.error(chalk.red('  ✗ Signal Sync Error:'), err.message);
  }
}

function getArgValue(name) {
  return argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=')?.trim() || '';
}

function parseOptionalDateArg(name) {
  const raw = getArgValue(name);
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    console.error(chalk.red(`❌ Invalid --${name} value: ${raw}`));
    process.exit(1);
  }

  return parsed;
}

function loadMessages() {
  if (!existsSync(LOG_FILE)) {
    console.error(chalk.red('❌ messages.jsonl not found. Run the scraper first.'));
    process.exit(1);
  }

  const raw = readFileSync(LOG_FILE, 'utf-8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((message) => message?.timestamp)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function loadAnalysisManifest() {
  if (!existsSync(ANALYSIS_MANIFEST_FILE)) {
    return {
      version: 1,
      updatedAt: null,
      runs: [],
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(ANALYSIS_MANIFEST_FILE, 'utf-8'));
    return {
      version: 1,
      updatedAt: parsed.updatedAt || null,
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
    };
  } catch (err) {
    console.error(chalk.red('❌ Failed to read .analysis-manifest.json:'), err.message);
    process.exit(1);
  }
}

function saveAnalysisManifest(manifest) {
  writeFileSync(ANALYSIS_MANIFEST_FILE, JSON.stringify({
    ...manifest,
    updatedAt: new Date().toISOString(),
  }, null, 2));
}

function isCoveredByRecordedRun(timestamp, manifestRuns) {
  const value = new Date(timestamp).getTime();
  return manifestRuns.some((run) => {
    const from = new Date(run.fromTimestamp || 0).getTime();
    const to = new Date(run.toTimestamp || 0).getTime();
    return Number.isFinite(from) && Number.isFinite(to) && value >= from && value <= to;
  });
}

function filterMessagesForRun(messages, manifest) {
  let filtered = messages;

  if (FROM_TIMESTAMP) {
    filtered = filtered.filter((message) => new Date(message.timestamp).getTime() >= FROM_TIMESTAMP.getTime());
  }

  if (TO_TIMESTAMP) {
    filtered = filtered.filter((message) => new Date(message.timestamp).getTime() <= TO_TIMESTAMP.getTime());
  }

  if (BACKFILL_MODE) {
    filtered = filtered.filter((message) => !isCoveredByRecordedRun(message.timestamp, manifest.runs));
  }

  return filtered;
}

function buildTimeRanges(messages) {
  if (messages.length === 0) {
    return [];
  }

  const ranges = [];
  let currentStart = messages[0];
  let previous = messages[0];

  for (let index = 1; index < messages.length; index += 1) {
    const next = messages[index];
    const gap = new Date(next.timestamp).getTime() - new Date(previous.timestamp).getTime();

    if (gap > GAP_SPLIT_MS) {
      ranges.push({
        fromTimestamp: currentStart.timestamp,
        toTimestamp: previous.timestamp,
        messageCount: messages.slice(ranges.reduce((sum, range) => sum + range.messageCount, 0), index).length,
      });
      currentStart = next;
    }

    previous = next;
  }

  const accountedFor = ranges.reduce((sum, range) => sum + range.messageCount, 0);
  ranges.push({
    fromTimestamp: currentStart.timestamp,
    toTimestamp: previous.timestamp,
    messageCount: messages.length - accountedFor,
  });

  return ranges;
}

function printSelectionSummary(allMessages, selectedMessages, manifest) {
  console.log(chalk.white(`Found ${allMessages.length} messages in log.`));
  console.log(chalk.white(`Recorded analysis runs: ${manifest.runs.length}`));

  if (selectedMessages.length === 0) {
    console.log(chalk.yellow('No messages match this selection.'));
    return;
  }

  const first = selectedMessages[0];
  const last = selectedMessages[selectedMessages.length - 1];
  console.log(chalk.white(`Selected ${selectedMessages.length} messages from ${new Date(first.timestamp).toLocaleString()} to ${new Date(last.timestamp).toLocaleString()}.`));

  if (BACKFILL_MODE) {
    const uncoveredRanges = buildTimeRanges(selectedMessages);
    console.log(chalk.cyan(`Uncovered ranges: ${uncoveredRanges.length}`));
    uncoveredRanges.forEach((range, index) => {
      console.log(chalk.gray(`  ${index + 1}. ${new Date(range.fromTimestamp).toLocaleString()} -> ${new Date(range.toTimestamp).toLocaleString()} (${range.messageCount} messages)`));
    });
  }
}

function appendSessionBanner({ messageCount, chunkCount }) {
  const sessionTime = new Date();
  const sessionLabel = sessionTime.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const sessionISO = sessionTime.toISOString();
  const runMode = BACKFILL_MODE ? 'manual backfill' : (FROM_TIMESTAMP || TO_TIMESTAMP ? 'manual range' : 'full analysis');
  const rangeLabel = [
    FROM_TIMESTAMP ? `from ${FROM_TIMESTAMP.toISOString()}` : null,
    TO_TIMESTAMP ? `to ${TO_TIMESTAMP.toISOString()}` : null,
  ].filter(Boolean).join(' ');
  const labelSuffix = RUN_LABEL ? ` · Label: ${RUN_LABEL}` : '';
  const scopeSuffix = rangeLabel ? ` · Scope: ${rangeLabel}` : '';

  const sessionBanner = `\n\n${'═'.repeat(72)}\n# 📊 Analysis Session — ${sessionLabel}\n> ISO: ${sessionISO}  \n> Provider: ${currentAi.label} · Model: ${currentAi.model}  \n> Mode: ${runMode}${scopeSuffix}${labelSuffix}  \n> Messages: ${messageCount} across ${chunkCount} chunks\n${'═'.repeat(72)}\n`;
  appendFileSync(REPORT_FILE_BUSINESS, sessionBanner);
  appendFileSync(CITATIONS_FILE, sessionBanner);
  if (LORE_MODE) {
    appendFileSync(REPORT_FILE_LORE, sessionBanner);
  }
}

function chunkMessages(messages) {
  const chunks = [];
  for (let index = 0; index < messages.length; index += GPT_MAX_MESSAGES) {
    chunks.push(messages.slice(index, index + GPT_MAX_MESSAGES));
  }
  return chunks;
}

function flattenProcessedMessages(chunks) {
  return chunks.reduce((acc, chunk) => acc.concat(chunk), []);
}

function recordAnalysisRun(manifest, processedMessages, chunkCount) {
  if (processedMessages.length === 0) {
    return;
  }

  const first = processedMessages[0];
  const last = processedMessages[processedMessages.length - 1];
  manifest.runs.push({
    id: `analysis-${Date.now()}`,
    recordedAt: new Date().toISOString(),
    mode: BACKFILL_MODE ? 'backfill' : (FROM_TIMESTAMP || TO_TIMESTAMP ? 'range' : 'full'),
    label: RUN_LABEL,
    loreMode: LORE_MODE,
    fromChunk: FROM_CHUNK,
    fromTimestamp: first.timestamp,
    toTimestamp: last.timestamp,
    messageCount: processedMessages.length,
    chunkCount,
    logFile: 'messages.jsonl',
    reportFileBusiness: path.basename(REPORT_FILE_BUSINESS),
    reportFileLore: LORE_MODE ? path.basename(REPORT_FILE_LORE) : null,
    citationsFile: path.basename(CITATIONS_FILE),
  });

  saveAnalysisManifest(manifest);
  console.log(chalk.gray(`Recorded run window in ${path.basename(ANALYSIS_MANIFEST_FILE)}.`));
}

async function run() {
  const allMessages = loadMessages();
  const manifest = loadAnalysisManifest();
  const selectedMessages = filterMessagesForRun(allMessages, manifest);

  console.log(chalk.bold.green('\n📊 TiltCheck Log Analyzer\n'));
  printSelectionSummary(allMessages, selectedMessages, manifest);

  if (DRY_RUN) {
    console.log(chalk.cyan('\nDry run only. No provider calls or report files will be updated.'));
    return;
  }

  if (selectedMessages.length === 0) {
    return;
  }

  const chunks = chunkMessages(selectedMessages);
  if (FROM_CHUNK < 1 || FROM_CHUNK > chunks.length) {
    console.error(chalk.red(`❌ --from-chunk must be between 1 and ${chunks.length}.`));
    process.exit(1);
  }

  const chunksToProcess = chunks.slice(FROM_CHUNK - 1);
  const processedMessages = flattenProcessedMessages(chunksToProcess);

  appendSessionBanner({ messageCount: processedMessages.length, chunkCount: chunksToProcess.length });
  console.log(chalk.cyan(`Processing ${processedMessages.length} messages in ${chunksToProcess.length} chunks starting from chunk ${FROM_CHUNK}...\n`));

  for (let index = 0; index < chunksToProcess.length; index += 1) {
    const chunk = chunksToProcess[index];
    const globalChunkNumber = FROM_CHUNK + index;
    const text = chunk.map((message) => `[${message.timestamp}] ${message.author}: ${message.content}`).join('\n');

    console.log(chalk.yellow(`[Chunk ${globalChunkNumber}/${chunks.length}] Analysing...`));

    let reportContent = null;
    let attempts = 0;
    let finalModel = currentAi.model;

    while (attempts < 3) {
      attempts += 1;
      const modelToUse = attempts === 3 ? 'llama-3.1-8b-instant' : null;
      const result = await callProvider(currentAi, text, chunk.length, BUSINESS_PROMPT, modelToUse);

      if (result.success && result.content) {
        reportContent = result.content;
        finalModel = result.modelUsed;
        break;
      }

      if (result.status === 429 || result.status === 413 || result.status >= 500) {
        console.log(chalk.yellow(`  ⚠️ API Error or network issue (${result.status}) on ${currentAi.label}.`));
        const waitMs = result.status === 429 ? 62000 : 10000 * attempts;
        console.log(chalk.gray(`  Waiting ${waitMs / 1000}s before retrying...`));
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      } else {
        break;
      }
    }

    if (reportContent) {
      const chunkTime = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const dateRange = `${new Date(chunk[0].timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} → ${new Date(chunk[chunk.length - 1].timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      const degenSummary = buildTiltCheckDailyDegenSummary(chunk, {
        fromTimestamp: chunk[0]?.timestamp || null,
        toTimestamp: chunk[chunk.length - 1]?.timestamp || null,
      });
      const outputBusiness = `\n\n---\n## Batch ${globalChunkNumber}/${chunks.length} · Saved at ${chunkTime}\n> **Message date range:** ${dateRange}  \n> ${chunk.length} messages · ${currentAi.label} (${finalModel})\n\n${degenSummary}\n\n${reportContent}`;
      appendFileSync(REPORT_FILE_BUSINESS, outputBusiness);

      const citationHeader = `\n\n---\n## 📎 Citations Batch ${globalChunkNumber}/${chunks.length} · Saved at ${chunkTime}\n> **Message date range:** ${dateRange}  \n> Source messages analysed in this batch\n\n`;
      const citationRows = chunk.map((message, rowIndex) => `**[${rowIndex + 1}]** \`${new Date(message.timestamp).toLocaleString()}\` **${message.author}**: ${message.content}`).join('\n\n');
      appendFileSync(CITATIONS_FILE, citationHeader + citationRows + '\n');

      console.log(chalk.green(`  ✓ Chunk ${globalChunkNumber} saved (${dateRange}).`));

      console.log(chalk.blue('  🚥 Extracting Web Signals (Fact-Check Pass)...'));
      const signalResult = await callProvider(currentAi, text, chunk.length, SIGNAL_PROMPT);
      if (signalResult.success && signalResult.content) {
        try {
          const parsed = JSON.parse(signalResult.content.replace(/```json/g, '').replace(/```/g, '').trim());
          await saveWebSignals(parsed.map((signal) => ({ ...signal, time: 'Just now' })));
        } catch {
          console.log(chalk.gray('  ⚠️ Signal parse failed. Skipping chunk signals.'));
        }
      }
    }

    if (LORE_MODE) {
      console.log(chalk.magenta(`  📖 Running lore pass for chunk ${globalChunkNumber}...`));
      await new Promise((resolve) => setTimeout(resolve, 15000));
      const loreResult = await callProvider(currentAi, text, chunk.length, LORE_PROMPT);
      if (loreResult.success && loreResult.content) {
        const outputLore = `\n\n---\n## Degen Lore Batch ${globalChunkNumber}\n_${chunk.length} messages · ${currentAi.label}_\n\n${loreResult.content}`;
        appendFileSync(REPORT_FILE_LORE, outputLore);
        console.log(chalk.green(`  ✓ Chunk ${globalChunkNumber} lore saved.`));
      }
    }

    if (index < chunksToProcess.length - 1) {
      console.log(chalk.gray('  Waiting 45s to stay under Groq TPM limit...'));
      await new Promise((resolve) => setTimeout(resolve, 45000));
    }
  }

  recordAnalysisRun(manifest, processedMessages, chunksToProcess.length);

  const saved = LORE_MODE
    ? 'reports_business.md and reports_lore.md'
    : 'reports_business.md (run with --lore to also generate comic lore)';
  console.log(chalk.bold.green(`\n✅ Analysis complete. Check ${saved}`));
}

run();
