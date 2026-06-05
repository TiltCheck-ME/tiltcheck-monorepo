// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
/**
 * Bonus digest for the email crawler — ranks daily and time-sensitive offers
 * from per-email intel (API response or local parseEmailIntel in dry-run).
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { BonusSignal } from '../../apps/api/src/lib/email-parser.js';

export interface CrawlIngestIntel {
  casinoBrand: string | null;
  subject: string | null;
  sentAt: string | null;
  bonusSignals: BonusSignal[];
  urgencyFlags: string[];
  promoCode: string | null;
}

export interface DigestOffer {
  brand: string;
  subject: string | null;
  sentAt: string | null;
  bonusType: BonusSignal['type'];
  amount: string | null;
  currency: BonusSignal['currency'];
  expiresIn: string | null;
  wageringRequirement: string | null;
  rawText: string;
  promoCode: string | null;
  urgencyScore: number;
  isDaily: boolean;
}

export interface BonusDigest {
  generatedAt: string;
  emailCount: number;
  offerCount: number;
  dailyBonuses: DigestOffer[];
  timeSensitive: DigestOffer[];
  /** Fallback when nothing matched daily/urgency buckets */
  otherOffers: DigestOffer[];
}

function urgencyScoreForEmail(intel: CrawlIngestIntel, signal: BonusSignal): number {
  let score = intel.urgencyFlags.length * 3;
  if (signal.expiresIn) score += 12;
  if (signal.type === 'daily') score += 10;
  if (signal.type === 'weekly' && intel.urgencyFlags.length > 0) score += 6;
  if (/limited\s*time|today\s*only|expires?\s*in\s*\d+\s*h/i.test(signal.rawText)) score += 8;
  if (/hour|tonight|tomorrow|ends?\s*today/i.test(`${signal.expiresIn ?? ''} ${intel.subject ?? ''}`)) {
    score += 5;
  }
  return score;
}

function isWeakBonusSignal(signal: BonusSignal): boolean {
  const text = signal.rawText.trim();
  return text.length < 4 || /^\d+$/.test(text);
}

function flattenOffers(items: CrawlIngestIntel[]): DigestOffer[] {
  const offers: DigestOffer[] = [];

  for (const item of items) {
    const brand = item.casinoBrand?.trim() || 'Unknown brand';
    for (const signal of item.bonusSignals) {
      if (isWeakBonusSignal(signal)) continue;
      const isDaily =
        signal.type === 'daily' ||
        /\bdaily\b/i.test(signal.rawText) ||
        /\bdaily\b/i.test(item.subject ?? '');

      offers.push({
        brand,
        subject: item.subject,
        sentAt: item.sentAt,
        bonusType: signal.type,
        amount: signal.amount,
        currency: signal.currency,
        expiresIn: signal.expiresIn,
        wageringRequirement: signal.wageringRequirement,
        rawText: signal.rawText,
        promoCode: item.promoCode,
        urgencyScore: urgencyScoreForEmail(item, signal),
        isDaily,
      });
    }
  }

  return dedupeOffers(offers);
}

function dedupeOffers(offers: DigestOffer[]): DigestOffer[] {
  const seen = new Set<string>();
  const out: DigestOffer[] = [];
  for (const o of offers) {
    const key = `${o.brand.toLowerCase()}|${o.bonusType}|${o.rawText.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
}

export function buildBonusDigest(
  items: CrawlIngestIntel[],
  options?: { topTimeSensitive?: number },
): BonusDigest {
  const topN = options?.topTimeSensitive ?? 5;
  const offers = flattenOffers(items);

  const dailyBonuses = offers
    .filter((o) => o.isDaily)
    .sort((a, b) => b.urgencyScore - a.urgencyScore || a.brand.localeCompare(b.brand));

  const timeSensitive = offers
    .filter((o) => !o.isDaily && (o.urgencyScore >= 8 || o.expiresIn))
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
    .slice(0, topN);

  // If few daily entries but strong urgency elsewhere, surface top urgent even when daily list is empty
  const urgentFill =
    dailyBonuses.length === 0 && timeSensitive.length === 0
      ? offers
          .filter((o) => o.urgencyScore > 0)
          .sort((a, b) => b.urgencyScore - a.urgencyScore)
          .slice(0, Math.min(topN, 3))
      : [];

  const pickedUrgent = timeSensitive.length > 0 ? timeSensitive : urgentFill;
  const pickedKeys = new Set(
    [...dailyBonuses, ...pickedUrgent].map((o) => `${o.brand}|${o.rawText}`),
  );
  const otherOffers = offers
    .filter((o) => !pickedKeys.has(`${o.brand}|${o.rawText}`))
    .slice(0, 6);

  return {
    generatedAt: new Date().toISOString(),
    emailCount: items.filter((i) => i.bonusSignals.some((s) => !isWeakBonusSignal(s))).length,
    offerCount: offers.length,
    dailyBonuses,
    timeSensitive: pickedUrgent,
    otherOffers,
  };
}

function formatOfferLine(o: DigestOffer, index: number): string {
  const amount =
    o.amount != null ? `${o.amount} ${o.currency !== 'unknown' ? o.currency : ''}`.trim() : o.rawText;
  const expiry = o.expiresIn ? ` · expires: ${o.expiresIn}` : '';
  const wager = o.wageringRequirement ? ` · ${o.wageringRequirement} wager` : '';
  const code = o.promoCode ? ` · code ${o.promoCode}` : '';
  const subj = o.subject ? ` — "${o.subject.slice(0, 55)}${o.subject.length > 55 ? '…' : ''}"` : '';
  return `  ${index + 1}. ${o.brand} | ${o.bonusType} | ${amount}${expiry}${wager}${code}${subj}`;
}

export function formatBonusDigestText(digest: BonusDigest, expanded: boolean): string {
  if (digest.offerCount === 0) {
    return '\nBonus digest: no qualifying offers this run (weak parser matches filtered).\n';
  }

  const lines: string[] = [
    '',
    '── Bonus digest ──',
    `Emails with bonuses: ${digest.emailCount} | Unique offers: ${digest.offerCount}`,
  ];

  if (digest.dailyBonuses.length > 0) {
    lines.push('', 'Daily bonuses:');
    const show = expanded ? digest.dailyBonuses : digest.dailyBonuses.slice(0, 8);
    show.forEach((o, i) => lines.push(formatOfferLine(o, i)));
    if (!expanded && digest.dailyBonuses.length > show.length) {
      lines.push(`  … +${digest.dailyBonuses.length - show.length} more (use --digest for full list)`);
    }
  } else {
    lines.push('', 'Daily bonuses: (none detected)');
  }

  if (digest.timeSensitive.length > 0) {
    lines.push('', 'Time-sensitive (expiring / urgency):');
    digest.timeSensitive.forEach((o, i) => lines.push(formatOfferLine(o, i)));
  }

  if (digest.otherOffers.length > 0 && (expanded || digest.dailyBonuses.length === 0)) {
    lines.push('', 'Other offers this run:');
    const show = expanded ? digest.otherOffers : digest.otherOffers.slice(0, 4);
    show.forEach((o, i) => lines.push(formatOfferLine(o, i)));
  }

  lines.push('');
  return lines.join('\n');
}

export function writeBonusDigestJson(digest: BonusDigest, logDir?: string): string {
  const dir = resolve(logDir ?? join(process.cwd(), 'scripts', 'logs'));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const date = digest.generatedAt.slice(0, 10);
  const stamp = digest.generatedAt.replace(/[:.]/g, '-');
  const filePath = join(dir, `email-bonus-digest-${date}-${stamp}.json`);
  writeFileSync(filePath, JSON.stringify(digest, null, 2), 'utf8');
  return filePath;
}
