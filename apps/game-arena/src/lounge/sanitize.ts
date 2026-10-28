/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */

const WALLET_RE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/;
const AMOUNT_RE = /\$\s*\d|\d+\s*(usd|usdc|sol)\b|\b\d+(\.\d+)?x\b|\bheater\b|\bmultiplier\b/i;

export const LOUNGE_RECEIPTS_LINE = 'Show receipts or touch grass.';

export function looksLikeWallet(text: string): boolean {
  return WALLET_RE.test(text);
}

export function looksLikeBroadcastStat(text: string): boolean {
  return AMOUNT_RE.test(text);
}

export function sanitizeChatText(raw: string): { ok: true; text: string } | { ok: false; reason: string } {
  const text = raw.replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!text) {
    return { ok: false, reason: 'empty' };
  }
  if (looksLikeWallet(text) || looksLikeBroadcastStat(text)) {
    return { ok: false, reason: LOUNGE_RECEIPTS_LINE };
  }
  return { ok: true, text };
}

export function sanitizeGameTitle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const title = raw.replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!title) return null;
  if (looksLikeWallet(title) || looksLikeBroadcastStat(title)) return null;
  return title;
}

export function sanitizeAwayMessage(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!text) return null;
  if (looksLikeWallet(text) || looksLikeBroadcastStat(text)) return null;
  return text;
}
