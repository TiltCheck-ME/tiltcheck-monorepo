// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-14
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const cliArgs = process.argv.slice(2);

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(path.join(__dirname, '.env'));
loadEnv(path.join(repoRoot, '.env'));

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : __dirname;
const SESSION_FILE = path.join(DATA_DIR, '.session.json');
const STATE_FILE = path.join(DATA_DIR, '.bonus-sync-state.json');
const BONUS_DROPS_CHANNEL_ID = process.env.BONUS_DROPS_CHANNEL_ID || '1488256038665981982';
const DISCORD_BOT_TOKEN = process.env.TILT_DISCORD_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN || '';
const DRY_RUN = cliArgs.includes('--dry-run');
const WATCH_MODE = cliArgs.includes('--watch') || process.env.BONUS_SYNC_WATCH === 'true';
const HEADLESS = !cliArgs.includes('--headed') && process.env.BONUS_SYNC_HEADLESS !== 'false';
const POLL_INTERVAL_MS = Math.max(
  parseInt(process.env.BONUS_SYNC_INTERVAL_SECONDS || '45', 10) || 45,
  15
) * 1000;
const MAX_SCROLL_PASSES = parseInt(process.env.BONUS_SYNC_SCROLL_PASSES || '18', 10);
const LIVE_SCROLL_PASSES = Math.max(
  parseInt(process.env.BONUS_SYNC_LIVE_SCROLL_PASSES || '3', 10) || 3,
  1
);
const SCROLL_STEP = parseInt(process.env.BONUS_SYNC_SCROLL_STEP || '2200', 10);
const MAX_REDIRECTS = 6;
const BRAND_COLOR = 0x17C3B2;

function parseSourceChannelUrls() {
  const envUrls = [
    ...(process.env.BONUS_SOURCE_CHANNEL_URLS || '').split(','),
    process.env.BONUS_SOURCE_CHANNEL_URL || '',
  ];
  const cliUrls = cliArgs.filter(arg => !arg.startsWith('--'));
  return [...new Set([...envUrls, ...cliUrls].map(normalizeSpace).filter(Boolean))];
}

const SOURCE_CHANNEL_URLS = parseSourceChannelUrls();

function loadSavedDiscordToken() {
  const explicitToken = process.env.DISCORD_TOKEN || process.env.TILT_DISCORD_TOKEN || '';
  if (explicitToken) return explicitToken;
  if (!fs.existsSync(SESSION_FILE)) return '';
  try {
    const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    const origin = session.origins?.find(entry => entry.origin === 'https://discord.com');
    const tokenEntry = origin?.localStorage?.find(entry => entry.name === 'token');
    return tokenEntry ? JSON.parse(tokenEntry.value) : '';
  } catch {
    return '';
  }
}

const DISCORD_USER_TOKEN = loadSavedDiscordToken();

const BRAND_BY_HOST = [
  { match: /wowvegas\.com$/i, brand: 'WOW Vegas', fallbackTitle: 'Claim bonus' },
  { match: /modo\.us$/i, brand: 'Modo Casino', fallbackTitle: 'Click n claim' },
  { match: /chanced\.com$/i, brand: 'Chanced', fallbackTitle: 'Weekly bonus' },
  { match: /punt\.com$/i, brand: 'Punt', fallbackTitle: 'Weekly bonus' },
  { match: /lonestarcasino\.com$/i, brand: 'LoneStar Casino', fallbackTitle: 'Bonus drop' },
  { match: /babacasino\.com$/i, brand: 'Baba Casino', fallbackTitle: 'Bonus drop' },
];

const SKIP_HOSTS = [
  /tenor\.com$/i,
  /media\.tenor\.com$/i,
  /cdn\d*\.wowvegas\.com$/i,
  /manychat\.com$/i,
  /luckparty\.com$/i,
];

const BONUS_LINK_PATTERNS = [
  /claimbonus=/i,
  /weekly-bonus/i,
  /[?&]bndid=/i,
  /[?&]teak_rewardlink_id=/i,
  /[?&]bc_coupon=/i,
  /bonus/i,
];

const BONUS_TEXT_PATTERNS = [
  /\bbonus\b/i,
  /free\s*spin/i,
  /\b\d+\s*fs\b/i,
  /\bfs\b/i,
  /\bspins\b/i,
  /\bclaim\b/i,
  /\bweekly\b/i,
  /\bsc\b/i,
  /\bquarter\b/i,
];

function normalizeSpace(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function truncate(value, maxLength) {
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function parseSourceChannelParts(channelUrl) {
  try {
    const parsed = new URL(channelUrl);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'channels' || parts.length < 3) return null;
    return {
      guildId: parts[1],
      channelId: parts[2],
    };
  } catch {
    return null;
  }
}

function cleanContent(raw, urls) {
  let cleaned = normalizeSpace(raw);
  for (const url of urls) {
    cleaned = cleaned.replaceAll(url, ' ');
  }
  cleaned = cleaned
    .replace(/PERP LINKAPP\s*—\s*[^A-Z]*/gi, ' ')
    .replace(/PERP LINK Chain Final.*$/gi, ' ')
    .replace(/\bPERP LINK\b/gi, ' ')
    .replace(/\bToday at\b.*$/gi, ' ')
    .replace(/\[[^\]]+\]\s*/g, ' ')
    .replace(/\bMonday,\s*April\s+\d{1,2},\s+\d{4}\b/gi, ' ')
    .replace(/\b\d{1,2}:\d{2}\s*(AM|PM)\b/gi, ' ')
    .replace(/\bAdd Reaction\b/gi, ' ');
  const segments = cleaned.split(/PERP LINK/gi).map(segment => normalizeSpace(segment)).filter(Boolean);
  if (segments.length) {
    cleaned = segments[segments.length - 1];
  }
  return normalizeSpace(cleaned);
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { postedUrls: [], postedSourceMessageKeys: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const legacyMessageIds = Array.isArray(parsed.postedSourceMessageIds) ? parsed.postedSourceMessageIds : [];
    return {
      postedUrls: Array.isArray(parsed.postedUrls) ? parsed.postedUrls : [],
      postedSourceMessageKeys: Array.isArray(parsed.postedSourceMessageKeys)
        ? parsed.postedSourceMessageKeys
        : legacyMessageIds,
    };
  } catch {
    return { postedUrls: [], postedSourceMessageKeys: [] };
  }
}

function writeState(state) {
  const trimmed = {
    postedUrls: state.postedUrls.slice(-500),
    postedSourceMessageKeys: state.postedSourceMessageKeys.slice(-500),
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(trimmed, null, 2));
}

function hasBonusSignature(url) {
  return BONUS_LINK_PATTERNS.some(pattern => pattern.test(url));
}

async function resolveRedirects(url) {
  let current = url;
  let best = hasBonusSignature(url) ? url : '';
  for (let i = 0; i < MAX_REDIRECTS; i += 1) {
    const response = await fetch(current, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'user-agent': 'Mozilla/5.0 TiltCheck Bonus Sync' },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) break;
      current = new URL(location, current).toString();
      if (hasBonusSignature(current)) best = current;
      continue;
    }
    return best || current;
  }
  return best || current;
}

function getHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isSkippableUrl(url) {
  if (!/^https?:\/\//i.test(url)) return true;
  if (/\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)) return true;
  const host = getHost(url);
  return SKIP_HOSTS.some(pattern => pattern.test(host));
}

function looksBonusLike(content, url) {
  const source = `${content} ${url}`;
  return BONUS_LINK_PATTERNS.some(pattern => pattern.test(url)) || BONUS_TEXT_PATTERNS.some(pattern => pattern.test(source));
}

function detectBrand(url) {
  const host = getHost(url);
  return BRAND_BY_HOST.find(entry => entry.match.test(host)) || null;
}

function buildTitle(content, brand, fallbackTitle) {
  const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withoutBrand = normalizeSpace(content.replace(new RegExp(escapedBrand, 'ig'), ' '));
  const title = withoutBrand
    .replace(/^[-:.,\s]+/, '')
    .replace(/\bhere ya go lol\b/gi, '')
    .replace(/^as always.*$/i, '')
    .replace(/[.]+$/, '')
    .trim();
  if (!title || /^weekly$/i.test(title)) return fallbackTitle;
  return title;
}

async function createDiscordContext() {
  if (!fs.existsSync(SESSION_FILE)) throw new Error(`Missing Discord session file: ${SESSION_FILE}`);
  if (!DISCORD_USER_TOKEN) {
    throw new Error('No saved Discord user token found. Set DISCORD_TOKEN in .env or recreate tools/channel-watcher/.session.json with npm run session:create once.');
  }

  const browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 50 });
  const context = await browser.newContext({
    storageState: SESSION_FILE,
    viewport: { width: 1440, height: 960 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });
  await context.addInitScript((token) => {
    window.localStorage.setItem('token', JSON.stringify(token));
  }, DISCORD_USER_TOKEN);
  return { browser, context };
}

async function loadSourcePage(page, sourceChannelUrl) {
  await page.goto(sourceChannelUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('ol[data-list-id="chat-messages"]', { timeout: 60000 });
  await page.waitForTimeout(2500);
}

async function scrapeMessagesFromPage(page, scrollPasses) {
  const seen = new Map();
  for (let pass = 0; pass < scrollPasses; pass += 1) {
    const batch = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('ol[data-list-id="chat-messages"] > li[id^="chat-messages-"]'));
        return items.map((item) => {
          const messageId = item.id.replace(/^chat-messages-/, '');
          const author =
            item.querySelector('h3 span[class*="username"], h3 span[class*="headerText"] span')?.textContent ||
            item.querySelector('span[id^="message-username-"]')?.textContent ||
            '';
        const timestamp =
          item.querySelector('time')?.getAttribute('datetime') ||
          item.querySelector('time')?.textContent ||
          '';
        const links = Array.from(item.querySelectorAll('a[href]'))
          .map(anchor => anchor.getAttribute('href') || '')
          .filter(Boolean);
        const content = item.querySelector('[id^="message-content-"]')?.textContent || item.textContent || '';
        return { messageId, author, timestamp, content, links };
      });
    });

    for (const item of batch) {
      if (!seen.has(item.messageId)) {
        seen.set(item.messageId, {
          messageId: item.messageId,
          author: normalizeSpace(item.author),
          timestamp: normalizeSpace(item.timestamp),
          content: normalizeSpace(item.content),
          links: [...new Set(item.links)],
        });
      }
    }

    await page.evaluate((step) => {
      const list = document.querySelector('ol[data-list-id="chat-messages"]');
      if (list) list.scrollTop -= step;
    }, SCROLL_STEP);
    await page.waitForTimeout(1200);
  }

  return Array.from(seen.values()).sort((a, b) => a.messageId.localeCompare(b.messageId));
}

async function scrapeMessages(options = {}) {
  if (!SOURCE_CHANNEL_URLS.length) {
    throw new Error('BONUS_SOURCE_CHANNEL_URL or BONUS_SOURCE_CHANNEL_URLS is required.');
  }

  const { context: existingContext, pages: existingPages, scrollPasses = MAX_SCROLL_PASSES } = options;
  let ownedBrowser = null;
  let context = existingContext;
  const pages = existingPages || new Map();

  if (!context) {
    ownedBrowser = await createDiscordContext();
    context = ownedBrowser.context;
  }

  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const allMessages = [];

      for (const sourceChannelUrl of SOURCE_CHANNEL_URLS) {
        let page = pages.get(sourceChannelUrl);
        if (!page) {
          page = await context.newPage();
          pages.set(sourceChannelUrl, page);
        }

        await loadSourcePage(page, sourceChannelUrl);
        const messages = await scrapeMessagesFromPage(page, scrollPasses);
        allMessages.push(
          ...messages.map(message => ({
            ...message,
            sourceChannelUrl,
          }))
        );
      }

      if (ownedBrowser) {
        await ownedBrowser.browser.close();
      }
      return allMessages;
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  if (ownedBrowser) {
    await ownedBrowser.browser.close();
  }
  throw lastError;
}

async function buildEntries(messages) {
  const entries = [];

  for (const message of messages) {
    const rawUrls = message.links.filter(link => !isSkippableUrl(link));
    if (!rawUrls.length) continue;

    const cleanedContent = cleanContent(message.content, rawUrls);

    for (const rawUrl of rawUrls) {
      if (!looksBonusLike(cleanedContent, rawUrl)) continue;

      const finalUrl = await resolveRedirects(rawUrl);
      if (isSkippableUrl(finalUrl)) continue;

      const brandInfo = detectBrand(finalUrl);
      if (!brandInfo) continue;

      entries.push({
        sourceMessageId: message.messageId,
        sourceMessageKey: `${message.sourceChannelUrl}|${message.messageId}`,
        sourceChannelUrl: message.sourceChannelUrl,
        author: message.author,
        timestamp: message.timestamp,
        brand: brandInfo.brand,
        title: buildTitle(cleanedContent, brandInfo.brand, brandInfo.fallbackTitle),
        finalUrl,
      });
    }
  }

  const unique = new Map();
  for (const entry of entries) {
    const key = `${entry.brand}|${entry.finalUrl}`;
    if (!unique.has(key)) unique.set(key, entry);
  }
  return Array.from(unique.values());
}

function buildSourceMessageUrl(entry) {
  const sourceChannelParts = parseSourceChannelParts(entry.sourceChannelUrl);
  if (!sourceChannelParts) return entry.sourceChannelUrl;
  return `https://discord.com/channels/${sourceChannelParts.guildId}/${sourceChannelParts.channelId}/${entry.sourceMessageId}`;
}

function buildDiscordPayload(entry) {
  const description = [
    `**${truncate(entry.title, 180)}**`,
    `Fresh pull from the monitored bonus feed. Claim it before it gets rinsed.`,
  ].join('\n');

  const fields = [
    {
      name: 'Brand',
      value: entry.brand,
      inline: true,
    },
    {
      name: 'Source',
      value: truncate(entry.author || 'Monitored bonus source', 1024),
      inline: true,
    },
  ];

  if (entry.timestamp) {
    fields.push({
      name: 'Posted',
      value: truncate(entry.timestamp, 1024),
      inline: true,
    });
  }

  const sourceMessageUrl = buildSourceMessageUrl(entry);

  return {
    embeds: [
      {
        color: BRAND_COLOR,
        title: `BONUS ALERT | ${entry.brand.toUpperCase()}`,
        description,
        fields,
        footer: {
          text: 'TiltCheck bonus relay | Made for Degens. By Degens.',
        },
        timestamp: new Date().toISOString(),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: 'Claim bonus',
            url: entry.finalUrl,
          },
          {
            type: 2,
            style: 5,
            label: 'Source post',
            url: sourceMessageUrl,
          },
        ],
      },
    ],
    allowed_mentions: { parse: [] },
  };
}

async function postEntries(entries) {
  if (!DISCORD_BOT_TOKEN) throw new Error('TILT_DISCORD_BOT_TOKEN or DISCORD_BOT_TOKEN is required.');

  for (const entry of entries) {
    const response = await fetch(`https://discord.com/api/v10/channels/${BONUS_DROPS_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: {
        'authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(buildDiscordPayload(entry)),
    });

    if (!response.ok) {
      throw new Error(`Discord post failed (${response.status}): ${await response.text()}`);
    }
  }
}

async function runSyncPass(options = {}) {
  const state = readState();
  const messages = await scrapeMessages(options);
  const entries = await buildEntries(messages);
  const freshEntries = entries.filter(entry =>
    !state.postedSourceMessageKeys.includes(entry.sourceMessageKey) &&
    !state.postedUrls.includes(entry.finalUrl)
  );

  if (!freshEntries.length) {
    console.log('No new bonus links to post.');
    return;
  }

  if (DRY_RUN) {
    console.log(JSON.stringify(freshEntries, null, 2));
    return freshEntries.length;
  }

  await postEntries(freshEntries);

  state.postedUrls.push(...freshEntries.map(entry => entry.finalUrl));
  state.postedSourceMessageKeys.push(...freshEntries.map(entry => entry.sourceMessageKey));
  writeState(state);

  console.log(`Posted ${freshEntries.length} bonus link(s) to channel ${BONUS_DROPS_CHANNEL_ID}.`);
  return freshEntries.length;
}

async function main() {
  if (!WATCH_MODE) {
    await runSyncPass();
    return;
  }

  console.log(
    `Watching ${SOURCE_CHANNEL_URLS.length} source channel(s) every ${Math.floor(POLL_INTERVAL_MS / 1000)}s ` +
    `(${HEADLESS ? 'headless' : 'headed'})`
  );

  const runtime = await createDiscordContext();
  const pages = new Map();
  let firstPass = true;

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const scrollPasses = firstPass ? MAX_SCROLL_PASSES : LIVE_SCROLL_PASSES;
      firstPass = false;

      try {
        await runSyncPass({ context: runtime.context, pages, scrollPasses });
      } catch (error) {
        console.error(error?.message || error);
      }

      if (DRY_RUN) return;
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  } finally {
    try {
      await runtime.browser.close();
    } catch {
      // noop
    }
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
