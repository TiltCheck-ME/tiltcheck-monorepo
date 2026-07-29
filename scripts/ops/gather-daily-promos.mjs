#!/usr/bin/env node
/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18
 *
 * Promo Gather agent entrypoint.
 * - Email inbox feed + Discord-shaped drops → auto-live (Sweeps allowlist)
 * - Optional --scrape public promo URLs → proposals only (never auto-live)
 *
 * Usage:
 *   node scripts/ops/gather-daily-promos.mjs
 *   node scripts/ops/gather-daily-promos.mjs --scrape
 *   node scripts/ops/gather-daily-promos.mjs --dry-run
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  REPO_ROOT,
  DEFAULT_LIVE_PATH,
  DEFAULT_PROPOSALS_PATH,
  DEFAULT_PRIORITY_PATH,
  loadPriority,
  matchAllowlist,
  readPromoFile,
  writePromoFile,
  upsertPromo,
  inferBonusType,
  normalizeRecord,
} from './lib/daily-promos.mjs';

function parseArgs(argv) {
  return {
    scrape: argv.includes('--scrape'),
    dryRun: argv.includes('--dry-run'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function readJsonSafe(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function loadEmailEntries() {
  const feedPath = process.env.EMAIL_BONUS_FEED_PATH?.trim() || path.join(REPO_ROOT, 'data/email-bonus-feed.json');
  const feed = readJsonSafe(feedPath, { bonuses: [] });
  return Array.isArray(feed.bonuses) ? feed.bonuses : [];
}

/**
 * Accept either channel-watcher style objects or a simple { brand, bonus, url } list
 * under data/bonus-discord-drops.json (ops-maintained).
 */
function loadDiscordEntries() {
  const dropPath =
    process.env.DISCORD_BONUS_DROPS_PATH?.trim() || path.join(REPO_ROOT, 'data/bonus-discord-drops.json');
  const raw = readJsonSafe(dropPath, { drops: [] });
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.drops)) return raw.drops;
  if (Array.isArray(raw.bonuses)) return raw.bonuses;
  return [];
}

function toLiveFromTrusted(entry, source, priority) {
  const brand = entry.brand || entry.casino || entry.name;
  const hit = matchAllowlist(brand, priority);
  if (!hit) return null;
  if (entry.isExpired) return null;
  const bonus = entry.bonus || entry.offer || entry.title;
  const url = entry.url || hit.promoUrl;
  if (!bonus || !url) return null;
  return normalizeRecord({
    brand: hit.name,
    slug: hit.slug,
    bonus: String(bonus),
    url: String(url),
    code: entry.code ?? null,
    bonusType: entry.bonusType || inferBonusType(bonus),
    source,
    verified: (entry.verified || entry.discoveredAt || new Date().toISOString()).toString().slice(0, 10),
    asOf: entry.updatedAt || entry.discoveredAt || new Date().toISOString(),
    expiresAt: entry.expiresAt || null,
    expiryMessage: entry.expiryMessage || null,
    imageUrl: entry.imageUrl || null,
    status: 'live',
  });
}

/** Very conservative public-page extract: title + first free-spin-ish line only. */
async function scrapePublicProposal(op) {
  if (!op.promoUrl) return null;
  try {
    const res = await fetch(op.promoUrl, {
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'TiltCheckPromoGather/1.0' },
      signal: AbortSignal.timeout(12_000),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]{3,120})<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';
    const bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 8000);
    const spinMatch = bodyText.match(/(.{0,40}free\s*spins?.{0,60})/i);
    const dailyMatch = bodyText.match(/(.{0,40}(daily\s+bonus|login\s+bonus|daily\s+collect).{0,60})/i);
    const snippet = (spinMatch?.[1] || dailyMatch?.[1] || '').trim();
    if (!snippet && !/promo|bonus|free\s*spin/i.test(title)) {
      // Do not invent — skip when no clear promo language
      return null;
    }
    const bonus = snippet || `${title} (public page promo signal)`.slice(0, 160);
    return normalizeRecord({
      brand: op.name,
      slug: op.slug,
      bonus,
      url: op.promoUrl,
      bonusType: inferBonusType(bonus),
      source: 'public-page',
      status: 'proposed',
      verified: new Date().toISOString().slice(0, 10),
      asOf: new Date().toISOString(),
    });
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`gather-daily-promos

  (default)  Ingest email + Discord allowlisted entries → live
  --scrape   Also fetch public promo URLs → proposals only
  --dry-run  Print actions without writing
`);
    return;
  }

  const priority = loadPriority(DEFAULT_PRIORITY_PATH);
  const livePath = process.env.DAILY_PROMOS_LIVE_PATH || DEFAULT_LIVE_PATH;
  const proposalsPath = process.env.DAILY_PROMOS_PROPOSALS_PATH || DEFAULT_PROPOSALS_PATH;
  let liveDoc = readPromoFile(livePath);
  let proposalsDoc = readPromoFile(proposalsPath);

  const stats = { emailLive: 0, discordLive: 0, scrapeProposed: 0, skipped: 0 };

  for (const entry of loadEmailEntries()) {
    const rec = toLiveFromTrusted(entry, 'email-inbox', priority);
    if (!rec) {
      stats.skipped += 1;
      continue;
    }
    const result = upsertPromo(liveDoc.promos, rec);
    liveDoc.promos = result.promos;
    if (result.changed) stats.emailLive += 1;
  }

  for (const entry of loadDiscordEntries()) {
    const rec = toLiveFromTrusted(entry, 'discord', priority);
    if (!rec) {
      stats.skipped += 1;
      continue;
    }
    const result = upsertPromo(liveDoc.promos, rec);
    liveDoc.promos = result.promos;
    if (result.changed) stats.discordLive += 1;
  }

  if (args.scrape) {
    for (const op of priority) {
      const proposal = await scrapePublicProposal(op);
      if (!proposal) {
        stats.skipped += 1;
        continue;
      }
      const result = upsertPromo(proposalsDoc.promos, { ...proposal, status: 'proposed' });
      proposalsDoc.promos = result.promos.map((p) =>
        p.id === result.record?.id ? { ...p, status: 'proposed' } : p,
      );
      if (result.changed) stats.scrapeProposed += 1;
      await new Promise((r) => setTimeout(r, 750));
    }
  }

  console.log(JSON.stringify({ dryRun: args.dryRun, ...stats, allowlist: priority.length }, null, 2));

  if (!args.dryRun) {
    writePromoFile(livePath, liveDoc);
    writePromoFile(proposalsPath, proposalsDoc);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
