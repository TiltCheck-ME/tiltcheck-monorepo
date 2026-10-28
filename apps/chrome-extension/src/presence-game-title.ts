/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */

const AMOUNT_RE = /\$\s*\d|\d+\s*(usd|usdc|sol)\b|\b\d+(\.\d+)?x\b|\bheater\b|\bmultiplier\b/i;
const WALLET_RE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/;

const URL_PATTERNS = [
  /\/casino\/slots\/([a-z0-9-]+)/i,
  /\/games?\/([a-z0-9-]+)/i,
  /\/slots?\/([a-z0-9-]+)/i,
  /\/play\/([a-z0-9-]+)/i,
];

export function sanitizePresenceTitle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const title = raw.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!title || AMOUNT_RE.test(title) || WALLET_RE.test(title)) return null;
  if (title === 'unknown game') return null;
  return title;
}

export function readPresenceGameTitle(loc: Location = window.location, doc: Document = document): string | null {
  const pathname = loc.pathname;
  const href = loc.href;
  for (const pattern of URL_PATTERNS) {
    const match = pathname.match(pattern) || href.match(pattern);
    if (match?.[1]) {
      return sanitizePresenceTitle(match[1]);
    }
  }
  const named = doc.querySelector('[data-game-name], .game-title, [class*="gameTitle"], [class*="gameName"]');
  if (named?.textContent) {
    return sanitizePresenceTitle(named.textContent);
  }
  return sanitizePresenceTitle(doc.title.split('|')[0] ?? null);
}
