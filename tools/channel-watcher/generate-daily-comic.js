import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), override: false });

const LOG_FILE = path.join(__dirname, 'messages.jsonl');
const OUTPUT_FILE = path.join(__dirname, '..', '..', 'apps', 'web', 'daily-degen-comic.json');
const ARCHIVE_FILE = path.join(__dirname, '..', '..', 'apps', 'web', 'daily-degen-comic-archive.json');
const TIMEZONE = process.env.COMIC_TIMEZONE || 'UTC';
const MAX_QUOTES = 3;
const ARCHIVE_LIMIT = parseInt(process.env.COMIC_ARCHIVE_LIMIT || '180', 10);
const COMIC_USE_AI = process.env.COMIC_USE_AI !== 'false';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/v1';
const COMIC_MODEL = process.env.COMIC_MODEL || process.env.AI_MODEL || 'llama3.2';
const COMIC_CREATOR = process.env.COMIC_CREATOR || 'jmenichole';
const VISUAL_ARTIST = process.env.COMIC_VISUAL_ARTIST || 'samoxic';
const VISUAL_INSPIRATION_URL = 'https://pheverdream.github.io/The-Book-of-SealStats/';

function clip(text, max = 160) {
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

function loadMessages() {
  if (!existsSync(LOG_FILE)) {
    return [];
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
        messageId: String(msg.messageId || ''),
        timestamp: String(msg.timestamp),
        author: clip(msg.author || 'anon', 40),
        content: clip(msg.content, 220),
      });
    } catch {
      // Skip malformed lines.
    }
  }
  return rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function selectTargetDay(messages) {
  if (messages.length === 0) return null;
  const latest = messages[messages.length - 1].timestamp;
  return dayKey(latest, TIMEZONE);
}

function pickHighlight(messages, mode) {
  if (messages.length === 0) return null;

  if (mode === 'first') return messages[0];
  if (mode === 'last') return messages[messages.length - 1];

  const weighted = [...messages].sort((a, b) => {
    const scoreA = (a.content.length || 0) + (/\b(lose|lost|rage|tilt|scam|payout|bonus|weekly)\b/i.test(a.content) ? 120 : 0);
    const scoreB = (b.content.length || 0) + (/\b(lose|lost|rage|tilt|scam|payout|bonus|weekly)\b/i.test(b.content) ? 120 : 0);
    return scoreB - scoreA;
  });
  return weighted[0];
}

function summarizeMood(messages) {
  const joined = messages.map((m) => m.content.toLowerCase()).join(' ');
  const buckets = [
    { label: 'Tilted but coping', terms: ['tilt', 'lost', 'assassinated', 'fucking', 'pain', 'broke'] },
    { label: 'Chaotic hype', terms: ['wooo', 'gg', 'drop', 'code', 'bonus', 'weekly'] },
    { label: 'Stable grind', terms: ['today', 'thanks', 'break', 'cool', 'felt'] },
  ];

  let best = { label: 'Degen weather: volatile', score: 0 };
  for (const bucket of buckets) {
    const score = bucket.terms.reduce((sum, term) => {
      const re = new RegExp(`\\b${term}\\b`, 'gi');
      return sum + ((joined.match(re) || []).length);
    }, 0);
    if (score > best.score) best = { label: bucket.label, score };
  }
  return best.label;
}

function topSpeakers(messages) {
  const counts = new Map();
  for (const m of messages) {
    counts.set(m.author, (counts.get(m.author) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([author, count]) => ({ author, count }));
}

function loadArchive() {
  if (!existsSync(ARCHIVE_FILE)) return [];
  try {
    const parsed = JSON.parse(readFileSync(ARCHIVE_FILE, 'utf-8'));
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.items)) return parsed.items;
    return [];
  } catch {
    return [];
  }
}

function toArchiveEntry(payload) {
  return {
    date: payload.date,
    generatedAt: payload.generatedAt,
    title: clip(payload.title, 90),
    subtitle: clip(payload.subtitle, 160),
    mood: clip(payload.mood, 80),
    oneLiner: clip(payload.oneLiner || '', 140),
    panels: Array.isArray(payload.panels) ? payload.panels.slice(0, 3).map((panel) => ({
      title: clip(panel?.title || '', 60),
      caption: clip(panel?.caption || '', 180),
      quote: clip(panel?.quote || '', 220),
    })) : [],
    credits: payload.credits || {},
  };
}

function saveArchive(payload) {
  if (!payload?.date || payload?.stats?.messageCount === 0) {
    return loadArchive();
  }
  const current = toArchiveEntry(payload);
  const archive = loadArchive();
  const key = current.date || current.generatedAt;
  const filtered = archive.filter((item) => (item.date || item.generatedAt) !== key);
  const merged = [current, ...filtered]
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
    .slice(0, Math.max(10, ARCHIVE_LIMIT));
  writeFileSync(ARCHIVE_FILE, `${JSON.stringify({ items: merged }, null, 2)}\n`);
  return merged;
}

function sanitizeAiPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const panels = Array.isArray(payload.panels) ? payload.panels.slice(0, 3) : [];
  if (panels.length === 0) return null;
  return {
    title: clip(payload.title || 'TiltCheck Daily Degen Comic', 90),
    subtitle: clip(payload.subtitle || 'Daily server lore from the channel logs.', 140),
    mood: clip(payload.mood || 'Chaotic', 60),
    oneLiner: clip(payload.oneLiner || '', 120),
    panels: panels.map((panel, idx) => ({
      title: clip(panel?.title || `Panel ${idx + 1}`, 50),
      caption: clip(panel?.caption || 'Degen energy detected.', 130),
      quote: clip(panel?.quote || '', 200),
    })),
  };
}

async function generateAiNarrative(dayMessages) {
  if (!COMIC_USE_AI || dayMessages.length === 0) return null;
  if (OLLAMA_URL.includes('<') || OLLAMA_URL.includes('>')) {
    console.warn('AI comic generation unavailable: OLLAMA_URL contains placeholder text. Set a real VM URL in .env.');
    return null;
  }
  const sample = dayMessages.slice(-120).map((m) =>
    `[${new Date(m.timestamp).toLocaleString('en-US', { timeZone: TIMEZONE })}] ${m.author}: ${m.content}`
  ).join('\n');

  const systemPrompt =
    'You write short funny but empathetic Discord community comic scripts for TiltCheck. Use real chat context. Never invent casinos or users not in input.';
  const userPrompt = `Create a 3-panel "Daily Degen Comic" from this chat sample.
Return strict JSON with this shape:
{
  "title": "string",
  "subtitle": "string",
  "mood": "string",
  "oneLiner": "string",
  "panels": [
    {"title":"string","caption":"string","quote":"short exact or near-exact quote from sample"},
    {"title":"string","caption":"string","quote":"short exact or near-exact quote from sample"},
    {"title":"string","caption":"string","quote":"short exact or near-exact quote from sample"}
  ]
}
Tone: degen humor, no hate, no slurs, concise.
Chat sample:
${sample}`;

  try {
    const response = await fetch(`${OLLAMA_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ollama',
      },
      body: JSON.stringify({
        model: COMIC_MODEL,
        temperature: 0.75,
        max_tokens: 900,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn(`AI comic generation failed (${response.status}): ${body.slice(0, 220)}`);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return null;
    const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
    return sanitizeAiPayload(parsed);
  } catch (err) {
    console.warn(`AI comic generation unavailable: ${err.message}. OLLAMA_URL=${OLLAMA_URL}`);
    return null;
  }
}

async function buildComicPayload(messages) {
  if (messages.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      timezone: TIMEZONE,
      date: null,
      title: 'Daily Degen Comic',
      subtitle: 'Waiting for channel-watcher logs.',
      mood: 'No data yet',
      stats: { messageCount: 0, uniqueAuthors: 0, topSpeakers: [] },
      panels: [],
      quotes: [],
      visualPrompt: 'Discord home base glow, neon gradients, and storybook framing inspired by SealStats render.',
      credits: {
        creator: COMIC_CREATOR,
        visualInspiration: VISUAL_ARTIST,
        visualInspirationUrl: VISUAL_INSPIRATION_URL,
      },
      source: {
        logFile: 'tools/channel-watcher/messages.jsonl',
        generatedBy: 'tools/channel-watcher/generate-daily-comic.js',
      },
    };
  }

  const targetDay = selectTargetDay(messages);
  const dayMessages = messages.filter((m) => dayKey(m.timestamp, TIMEZONE) === targetDay);
  const uniqueAuthors = new Set(dayMessages.map((m) => m.author)).size;
  const opening = pickHighlight(dayMessages, 'first');
  const chaos = pickHighlight(dayMessages, 'peak');
  const closing = pickHighlight(dayMessages, 'last');
  const aiNarrative = await generateAiNarrative(dayMessages);

  return {
    generatedAt: new Date().toISOString(),
    timezone: TIMEZONE,
    date: targetDay,
    title: aiNarrative?.title || 'TiltCheck Daily Degen Comic',
    subtitle: aiNarrative?.subtitle || 'Auto-built from today\'s channel-watcher chat log.',
    mood: aiNarrative?.mood || summarizeMood(dayMessages),
    oneLiner: aiNarrative?.oneLiner || '',
    stats: {
      messageCount: dayMessages.length,
      uniqueAuthors,
      topSpeakers: topSpeakers(dayMessages),
    },
    panels: aiNarrative?.panels || [
      {
        title: 'Opening Bell',
        caption: opening ? `${opening.author} lights the fuse.` : 'The room loads in.',
        quote: opening ? opening.content : '',
      },
      {
        title: 'Midday Chaos',
        caption: chaos ? `${chaos.author} posts the main character energy.` : 'Someone yells about bonus codes.',
        quote: chaos ? chaos.content : '',
      },
      {
        title: 'Aftershock',
        caption: closing ? `${closing.author} drops the closing line.` : 'Everyone pretends they are chill.',
        quote: closing ? closing.content : '',
      },
    ],
    quotes: dayMessages.slice(-MAX_QUOTES).map((m) => ({
      author: m.author,
      text: m.content,
      timestamp: m.timestamp,
    })),
    visualPrompt:
      'SealStats-inspired Discord home vibe: deep navy gradients, neon cyan accents, cinematic glow, and storybook panel framing.',
    inspirationUrl: VISUAL_INSPIRATION_URL,
    credits: {
      creator: COMIC_CREATOR,
      visualInspiration: VISUAL_ARTIST,
      visualInspirationUrl: VISUAL_INSPIRATION_URL,
    },
    source: {
      logFile: 'tools/channel-watcher/messages.jsonl',
      generatedBy: 'tools/channel-watcher/generate-daily-comic.js',
    },
  };
}

async function main() {
  const messages = loadMessages();
  const payload = await buildComicPayload(messages);
  const archiveItems = saveArchive(payload);
  payload.archiveRecent = archiveItems.slice(0, 12);
  writeFileSync(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  const dayLabel = payload.date || 'none';
  console.log(`Daily comic generated for ${dayLabel} (${payload.stats.messageCount} messages).`);
  if (payload.oneLiner) {
    console.log(`Hook: ${payload.oneLiner}`);
  }
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log(`Archive: ${ARCHIVE_FILE} (${archiveItems.length} strips)`);
}

main();
