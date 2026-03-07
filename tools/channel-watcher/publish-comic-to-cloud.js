import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), override: false });

const LOG_FILE = path.join(__dirname, 'messages.jsonl');
const API_URL = process.env.COMIC_API_URL || '';
const COMMUNITY_ID = process.env.COMIC_COMMUNITY_ID || 'tiltcheck-discord';
const TIMEZONE = process.env.COMIC_TIMEZONE || 'UTC';
const INGEST_KEY = process.env.COMIC_API_INGEST_KEY || '';
const MAX_MESSAGES = parseInt(process.env.COMIC_MAX_MESSAGES || '180', 10);

function clip(text, max = 240) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trim()}...`;
}

function dayKey(isoDate, timezone) {
  const dt = new Date(isoDate);
  if (Number.isNaN(dt.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(dt);
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function loadDailyMessages() {
  if (!existsSync(LOG_FILE)) {
    throw new Error('messages.jsonl not found');
  }
  const raw = readFileSync(LOG_FILE, 'utf-8').trim();
  if (!raw) return [];

  const seen = new Set();
  const rows = [];
  for (const line of raw.split('\n')) {
    try {
      const msg = JSON.parse(line);
      if (!msg?.timestamp || !msg?.content) continue;
      if (seen.has(msg.messageId)) continue;
      seen.add(msg.messageId);
      rows.push({
        author: clip(msg.author || 'anon', 64),
        timestamp: msg.timestamp,
        content: clip(msg.content, 300),
      });
    } catch {
      // Skip malformed rows.
    }
  }

  rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  if (rows.length === 0) return [];

  const targetDay = dayKey(rows[rows.length - 1].timestamp, TIMEZONE);
  return rows.filter((m) => dayKey(m.timestamp, TIMEZONE) === targetDay).slice(-MAX_MESSAGES);
}

async function publish() {
  if (!API_URL) {
    console.log('COMIC_API_URL is not set. Skipping cloud comic publish.');
    return;
  }

  const messages = loadDailyMessages();
  if (messages.length === 0) {
    console.log('No messages available for cloud comic publish.');
    return;
  }

  const targetDate = dayKey(messages[messages.length - 1].timestamp, TIMEZONE);
  const endpoint = API_URL.replace(/\/$/, '') + '/v1/comic/generate';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(INGEST_KEY ? { 'x-comic-ingest-key': INGEST_KEY } : {}),
    },
    body: JSON.stringify({
      communityId: COMMUNITY_ID,
      date: targetDate,
      timezone: TIMEZONE,
      messages,
      credits: {
        creator: process.env.COMIC_CREATOR || 'jmenichole',
        visualInspiration: process.env.COMIC_VISUAL_ARTIST || 'samoxic',
        visualInspirationUrl: 'https://pheverdream.github.io/The-Book-of-SealStats/',
      },
      source: {
        generatedBy: 'tools/channel-watcher/publish-comic-to-cloud.js',
        logFile: 'tools/channel-watcher/messages.jsonl',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Cloud publish failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const result = await response.json();
  console.log(`Cloud comic publish success for ${result?.comic?.date || targetDate}.`);
  if (result?.comic?.storage?.currentUrl) {
    console.log(`Current URL: ${result.comic.storage.currentUrl}`);
  }
}

publish().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
