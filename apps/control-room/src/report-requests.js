/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WATCHER_DIR = path.resolve(__dirname, '../../../tools/channel-watcher');
const WATCHER_LOG_FILE = path.join(WATCHER_DIR, 'messages.jsonl');
const WATCHER_ENV_FILE = path.join(WATCHER_DIR, '.env');
const WATCHER_SESSION_FILE = path.join(WATCHER_DIR, '.session.json');
const DATA_DIR = process.env.CONTROL_ROOM_DATA_DIR
  ? path.resolve(process.env.CONTROL_ROOM_DATA_DIR)
  : path.join(os.tmpdir(), 'tiltcheck-control-room');
const JOBS_FILE = path.join(DATA_DIR, 'report-requests.json');
const MAX_MATCHES = 250;
const MAX_DISCORD_FETCH = 250;

let workerActive = false;
let workerTimer = null;

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function stripAtPrefix(value) {
  return String(value || '').trim().replace(/^@+/, '');
}

function normalizeText(value) {
  return stripAtPrefix(value).toLowerCase();
}

function loadJobsState() {
  if (!fs.existsSync(JOBS_FILE)) {
    return { jobs: [] };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
    if (parsed && Array.isArray(parsed.jobs)) {
      return parsed;
    }
  } catch (error) {
    console.error('[control-room][reports] Failed to read jobs state:', error);
  }

  return { jobs: [] };
}

function saveJobsState(state) {
  ensureDataDir();
  fs.writeFileSync(JOBS_FILE, JSON.stringify(state, null, 2));
}

function parseTerms(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  }

  return String(value)
    .split(/\r?\n|[,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toIsoDate(value, label) {
  if (!value) {
    throw new Error(`${label} is required`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date`);
  }

  return date.toISOString();
}

function validateRequest(payload) {
  const authorQuery = String(payload?.authorQuery || '').trim();
  const authorId = String(payload?.authorId || '').trim();
  const terms = parseTerms(payload?.terms);
  const from = toIsoDate(payload?.from, 'from');
  const to = toIsoDate(payload?.to, 'to');
  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (fromDate > toDate) {
    throw new Error('from must be before to');
  }

  if (!authorQuery && !authorId && terms.length === 0) {
    throw new Error('Add at least one author or term filter');
  }

  return {
    authorQuery,
    authorId,
    terms,
    from,
    to,
    maxResults: Math.min(Math.max(Number(payload?.maxResults || 100), 1), MAX_MATCHES),
    createdBy: String(payload?.createdBy || 'operator').trim() || 'operator',
  };
}

function summarizeJob(job) {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt || null,
    completedAt: job.completedAt || null,
    failedAt: job.failedAt || null,
    request: job.request,
    resultMeta: job.result
      ? {
          totalMatches: job.result.totalMatches,
          sources: job.result.sources,
          reportPreview: job.result.reportMarkdown.slice(0, 280),
        }
      : null,
    error: job.error || null,
  };
}

function getJobList() {
  const state = loadJobsState();
  return state.jobs
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .map(summarizeJob);
}

function getJobById(jobId) {
  const state = loadJobsState();
  return state.jobs.find((job) => job.id === jobId) || null;
}

function createJob(payload) {
  const request = validateRequest(payload);
  const state = loadJobsState();
  const job = {
    id: crypto.randomUUID(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    request,
    result: null,
    error: null,
  };

  state.jobs.push(job);
  saveJobsState(state);
  scheduleWorker();
  return summarizeJob(job);
}

function updateJob(jobId, updater) {
  const state = loadJobsState();
  const index = state.jobs.findIndex((job) => job.id === jobId);
  if (index === -1) {
    throw new Error(`Job ${jobId} not found`);
  }

  const nextJob = updater({ ...state.jobs[index] });
  state.jobs[index] = nextJob;
  saveJobsState(state);
  return nextJob;
}

function loadWatcherEnv() {
  const env = {};
  if (!fs.existsSync(WATCHER_ENV_FILE)) {
    return env;
  }

  const raw = fs.readFileSync(WATCHER_ENV_FILE, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    env[key] = value;
  }

  return env;
}

function getWatcherAuth() {
  const watcherEnv = loadWatcherEnv();
  let token = watcherEnv.DISCORD_TOKEN || process.env.DISCORD_TOKEN || '';

  if (!token && fs.existsSync(WATCHER_SESSION_FILE)) {
    try {
      const session = JSON.parse(fs.readFileSync(WATCHER_SESSION_FILE, 'utf8'));
      const origin = session.origins?.find((entry) => String(entry.origin || '').includes('discord.com'));
      const stored = origin?.localStorage?.find((entry) => entry.name === 'token')?.value;
      if (stored) {
        token = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[control-room][reports] Failed to parse watcher session:', error);
    }
  }

  const channelUrl = watcherEnv.WATCH_CHANNEL_URL || process.env.WATCH_CHANNEL_URL || '';
  const match = channelUrl.match(/channels\/(\d+)\/(\d+)/);

  return {
    token,
    guildId: match?.[1] || '',
    channelId: match?.[2] || '',
  };
}

function loadWatcherMessages() {
  if (!fs.existsSync(WATCHER_LOG_FILE)) {
    return [];
  }

  const lines = fs.readFileSync(WATCHER_LOG_FILE, 'utf8').split(/\r?\n/).filter(Boolean);
  const messages = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      messages.push({
        messageId: String(parsed.messageId || ''),
        timestamp: parsed.timestamp ? new Date(parsed.timestamp).toISOString() : null,
        author: String(parsed.author || '').trim(),
        authorId: parsed.authorId ? String(parsed.authorId) : null,
        content: String(parsed.content || ''),
        source: 'channel-watcher-log',
      });
    } catch (error) {
      console.error('[control-room][reports] Failed to parse watcher message line:', error);
    }
  }

  return messages;
}

function matchesRequest(message, request) {
  if (!message.timestamp) return false;

  const messageTime = new Date(message.timestamp).getTime();
  const fromTime = new Date(request.from).getTime();
  const toTime = new Date(request.to).getTime();

  if (messageTime < fromTime || messageTime > toTime) {
    return false;
  }

  if (request.authorId && String(message.authorId || '') !== request.authorId) {
    return false;
  }

  if (request.authorQuery) {
    const normalizedAuthor = normalizeText(message.author);
    const normalizedQuery = normalizeText(request.authorQuery);
    if (normalizedAuthor !== normalizedQuery && !normalizedAuthor.includes(normalizedQuery)) {
      return false;
    }
  }

  if (request.terms.length > 0) {
    const haystack = String(message.content || '').toLowerCase();
    for (const term of request.terms) {
      if (!haystack.includes(term.toLowerCase())) {
        return false;
      }
    }
  }

  return true;
}

function dedupeMessages(messages) {
  const seen = new Set();
  return messages.filter((message) => {
    const key = message.messageId || `${message.timestamp}:${message.author}:${message.content}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchDiscordApi(request) {
  const auth = getWatcherAuth();
  if (!auth.token || !auth.guildId || !auth.channelId || !request.authorId) {
    return [];
  }

  const collected = [];
  let offset = 0;
  let totalResults = 1;

  while (offset < totalResults && collected.length < MAX_DISCORD_FETCH) {
    const params = new URLSearchParams({
      author_id: request.authorId,
      channel_id: auth.channelId,
      include_nsfw: 'true',
      offset: String(offset),
    });

    if (request.terms.length === 1) {
      params.set('content', request.terms[0]);
    }

    const response = await fetch(
      `https://discord.com/api/v9/guilds/${auth.guildId}/messages/search?${params.toString()}`,
      {
        headers: {
          authorization: auth.token,
          'user-agent': 'Mozilla/5.0',
          'x-super-properties': 'e30=',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Discord search failed with ${response.status}`);
    }

    const payload = await response.json();
    const groups = Array.isArray(payload.messages) ? payload.messages : [];
    totalResults = Number(payload.total_results || groups.length);

    if (groups.length === 0) {
      break;
    }

    for (const group of groups) {
      const hit = Array.isArray(group) ? group.find((entry) => entry.hit) || group[0] : null;
      if (!hit) continue;
      collected.push({
        messageId: String(hit.id || ''),
        timestamp: hit.timestamp ? new Date(hit.timestamp).toISOString() : null,
        author: String(hit.author?.global_name || hit.author?.username || '').trim(),
        authorId: hit.author?.id ? String(hit.author.id) : null,
        content: String(hit.content || ''),
        source: 'discord-search',
      });
      if (collected.length >= MAX_DISCORD_FETCH) break;
    }

    offset += groups.length;
  }

  return dedupeMessages(collected).filter((message) => matchesRequest(message, request));
}

function buildReportMarkdown(request, matches, notes) {
  const lines = [
    '# Channel report',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Timeframe: ${request.from} -> ${request.to}`,
    `- Author filter: ${request.authorQuery || 'none'}`,
    `- Author ID filter: ${request.authorId || 'none'}`,
    `- Terms: ${request.terms.length ? request.terms.join(', ') : 'none'}`,
    `- Matches: ${matches.length}`,
    `- Sources: ${Array.from(new Set(matches.map((entry) => entry.source))).join(', ') || 'none'}`,
    '',
  ];

  if (notes.length > 0) {
    lines.push('## Notes', '');
    for (const note of notes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  lines.push('## Findings', '');

  if (matches.length === 0) {
    lines.push('No matching messages found for the selected filters.');
    return lines.join('\n');
  }

  for (const message of matches) {
    lines.push(
      `- [${message.timestamp}] ${message.author || 'unknown'} (${message.source}): ${message.content.replace(/\s+/g, ' ').trim()}`,
    );
  }

  return lines.join('\n');
}

async function runReportRequest(job) {
  const notes = [];
  const request = job.request;
  const localMatches = dedupeMessages(loadWatcherMessages()).filter((message) => matchesRequest(message, request));

  let combinedMatches = localMatches;
  if (request.authorId) {
    try {
      const apiMatches = await searchDiscordApi(request);
      combinedMatches = dedupeMessages([...localMatches, ...apiMatches]);
      if (apiMatches.length === 0) {
        notes.push('Discord search did not add any extra matches for the provided author ID.');
      }
    } catch (error) {
      console.error('[control-room][reports] Discord search failed:', error);
      notes.push(`Discord live search unavailable: ${error.message}`);
    }
  } else {
    notes.push('Report searched the local channel-watcher log only. Add an author ID later if you want live Discord search support.');
  }

  combinedMatches = combinedMatches
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
    .slice(0, request.maxResults);

  return {
    totalMatches: combinedMatches.length,
    sources: Array.from(new Set(combinedMatches.map((entry) => entry.source))),
    matches: combinedMatches,
    reportMarkdown: buildReportMarkdown(request, combinedMatches, notes),
    notes,
  };
}

async function processNextJob() {
  if (workerActive) return;

  const state = loadJobsState();
  const nextJob = state.jobs.find((job) => job.status === 'pending');
  if (!nextJob) return;

  workerActive = true;
  updateJob(nextJob.id, (job) => ({
    ...job,
    status: 'running',
    startedAt: new Date().toISOString(),
    error: null,
  }));

  try {
    const result = await runReportRequest(nextJob);
    updateJob(nextJob.id, (job) => ({
      ...job,
      status: 'completed',
      completedAt: new Date().toISOString(),
      result,
      error: null,
    }));
  } catch (error) {
    console.error('[control-room][reports] Report job failed:', error);
    updateJob(nextJob.id, (job) => ({
      ...job,
      status: 'failed',
      failedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
  } finally {
    workerActive = false;
  }
}

function scheduleWorker() {
  if (workerTimer) return;
  workerTimer = setInterval(() => {
    void processNextJob();
  }, 1500);
  if (typeof workerTimer.unref === 'function') {
    workerTimer.unref();
  }
  void processNextJob();
}

function startReportWorker() {
  scheduleWorker();
}

function getReportConfig() {
  const auth = getWatcherAuth();
  return {
    watcherLogAvailable: fs.existsSync(WATCHER_LOG_FILE),
    watcherAuthAvailable: Boolean(auth.token && auth.guildId && auth.channelId),
    watcherDirectory: WATCHER_DIR,
  };
}

export {
  createJob,
  getJobById,
  getJobList,
  getReportConfig,
  startReportWorker,
};
