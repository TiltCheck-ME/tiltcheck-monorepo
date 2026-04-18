// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17
/**
 * Email Bonus Feed Persistence
 *
 * Persists parsed inbox bonuses to a stable JSON feed for the web app and
 * tracks which bonuses have already been published to the live alert bus.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { EmailIntelData, BonusSignal } from './email-parser.js';

export interface EmailBonusFeedEntry {
  id: string;
  brand: string;
  bonus: string;
  url: string;
  imageUrl: string | null;
  verified: string;
  code: string | null;
  source: 'email-inbox';
  senderDomain: string | null;
  senderEmail: string | null;
  subject: string | null;
  bonusType: string;
  bonusValue: string;
  terms: string;
  expiryMessage: string;
  expiresAt: string | null;
  isExpired: boolean;
  discoveredAt: string;
  updatedAt: string;
  lastPublishedAt: string | null;
}

export interface EmailBonusFeed {
  updatedAt: string | null;
  bonuses: EmailBonusFeedEntry[];
}

export interface PersistEmailBonusResult {
  feed: EmailBonusFeed;
  entries: EmailBonusFeedEntry[];
  added: EmailBonusFeedEntry[];
  updated: EmailBonusFeedEntry[];
  toPublish: EmailBonusFeedEntry[];
}

const EMPTY_FEED: EmailBonusFeed = {
  updatedAt: null,
  bonuses: [],
};

const NON_CLAIM_URL_PATTERNS = [
  /unsubscribe/i,
  /preferences/i,
  /privacy/i,
  /terms/i,
  /support/i,
  /help/i,
  /contact/i,
  /view(?:ing)?(?:\s|-)?in(?:\s|-)?browser/i,
  /mailto:/i,
];

const NON_DURABLE_IMAGE_URL_PATTERNS = [
  /cdn\.discordapp\.com\/ephemeral-attachments\//i,
  /discordapp\.net\/ephemeral-attachments\//i,
  /google-analytics\.com/i,
  /doubleclick\.net/i,
  /pixel/i,
  /tracking/i,
];

export function getEmailBonusFeedPath(): string {
  return process.env.EMAIL_BONUS_FEED_PATH?.trim() || path.join(process.cwd(), 'data', 'email-bonus-feed.json');
}

export function readEmailBonusFeed(): EmailBonusFeed {
  const feedPath = getEmailBonusFeedPath();
  if (!existsSync(feedPath)) {
    return EMPTY_FEED;
  }

  try {
    const raw = readFileSync(feedPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<EmailBonusFeed>;
    return {
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      bonuses: Array.isArray(parsed.bonuses) ? parsed.bonuses.filter(isFeedEntry) : [],
    };
  } catch (error) {
    console.warn('[email-bonus-feed] Failed to read persisted feed:', error);
    return EMPTY_FEED;
  }
}

export function persistEmailBonusIntel(
  rawEmail: string,
  intel: EmailIntelData,
  now = new Date()
): PersistEmailBonusResult {
  const feed = readEmailBonusFeed();
  const entries = buildEmailBonusEntries(rawEmail, intel, now);
  if (entries.length === 0) {
    return { feed, entries, added: [], updated: [], toPublish: [] };
  }

  const nextBonuses = [...feed.bonuses];
  const existingById = new Map(nextBonuses.map((entry, index) => [entry.id, { entry, index }]));
  const added: EmailBonusFeedEntry[] = [];
  const updated: EmailBonusFeedEntry[] = [];

  for (const entry of entries) {
    const existing = existingById.get(entry.id);
    if (!existing) {
      nextBonuses.push(entry);
      existingById.set(entry.id, { entry, index: nextBonuses.length - 1 });
      added.push(entry);
      continue;
    }

    const merged: EmailBonusFeedEntry = {
      ...existing.entry,
      ...entry,
      discoveredAt: existing.entry.discoveredAt,
      lastPublishedAt: existing.entry.lastPublishedAt,
    };

    if (JSON.stringify(existing.entry) !== JSON.stringify(merged)) {
      nextBonuses[existing.index] = merged;
      existingById.set(entry.id, { entry: merged, index: existing.index });
      updated.push(merged);
    }
  }

  if (added.length === 0 && updated.length === 0) {
    return {
      feed: sortFeedBonuses(feed),
      entries,
      added,
      updated,
      toPublish: getUnpublishedActiveEntries(feed, entries, now),
    };
  }

  const nextFeed = sortFeedBonuses({
    updatedAt: now.toISOString(),
    bonuses: nextBonuses,
  });
  writeEmailBonusFeed(nextFeed);

  return {
    feed: nextFeed,
    entries,
    added,
    updated,
    toPublish: getUnpublishedActiveEntries(nextFeed, entries, now),
  };
}

export function markEmailBonusEntriesPublished(ids: string[], publishedAt = new Date().toISOString()): EmailBonusFeed {
  if (ids.length === 0) {
    return readEmailBonusFeed();
  }

  const feed = readEmailBonusFeed();
  const idSet = new Set(ids);
  const bonuses = feed.bonuses.map((entry) => (
    idSet.has(entry.id)
      ? {
          ...entry,
          lastPublishedAt: publishedAt,
          updatedAt: publishedAt,
        }
      : entry
  ));

  const nextFeed = sortFeedBonuses({
    updatedAt: publishedAt,
    bonuses,
  });
  writeEmailBonusFeed(nextFeed);
  return nextFeed;
}

export function getActiveEmailBonusEntries(now = new Date()): EmailBonusFeedEntry[] {
  const feed = readEmailBonusFeed();
  return feed.bonuses.filter((entry) => !isExpiredEntry(entry, now));
}

export function buildEmailBonusEntries(
  rawEmail: string,
  intel: EmailIntelData,
  now = new Date()
): EmailBonusFeedEntry[] {
  if (intel.bonusSignals.length === 0) {
    return [];
  }

  const verified = now.toISOString();
  const brand = normalizeBrand(intel.casinoBrand, intel.senderDomain);
  const url = selectBonusUrl(intel);
  const imageUrl = selectBonusImageUrl(intel);
  const promoCode = extractPromoCode(rawEmail, intel);

  return intel.bonusSignals.map((signal, index) => {
    const expiryMessage =
      signal.expiresIn ||
      inferUrgencyExpiry(intel.urgencyFlags) ||
      (/\b(?:expired|ended|closed)\b/i.test(signal.rawText) ? signal.rawText : null);
    const expiresAt = resolveExpiryTimestamp(expiryMessage, intel.sentAt || verified);
    const isExpired = hasExpired(expiryMessage, expiresAt, now);
    const bonusValue = formatBonusValue(signal);
    const bonus = formatBonusDescription(signal);
    const bonusType = humanizeBonusType(signal.type);
    const terms = buildTerms(signal, intel.subject, promoCode);
    const id = buildEntryId({
      brand,
      url,
      signal,
      code: promoCode,
      index,
    });

    return {
      id,
      brand,
      bonus,
      url,
      imageUrl,
      verified,
      code: promoCode,
      source: 'email-inbox',
      senderDomain: intel.senderDomain,
      senderEmail: intel.senderEmail,
      subject: intel.subject,
      bonusType,
      bonusValue,
      terms,
      expiryMessage: expiryMessage || 'Expiry not stated in email',
      expiresAt,
      isExpired,
      discoveredAt: verified,
      updatedAt: verified,
      lastPublishedAt: null,
    };
  });
}

function buildTerms(signal: BonusSignal, subject: string | null, promoCode: string | null): string {
  const parts = [
    signal.rawText,
    signal.wageringRequirement ? `Wagering ${signal.wageringRequirement}` : null,
    promoCode ? `Code ${promoCode}` : null,
    subject ? `Subject ${subject}` : null,
  ].filter(Boolean);

  return parts.join(' | ');
}

function formatBonusDescription(signal: BonusSignal): string {
  const parts = [signal.rawText.trim()];
  if (signal.wageringRequirement) parts.push(`Wagering ${signal.wageringRequirement}`);
  if (signal.expiresIn) parts.push(signal.expiresIn);
  return parts.join(' • ');
}

function formatBonusValue(signal: BonusSignal): string {
  if (signal.amount) {
    const currency = signal.currency !== 'unknown' ? ` ${signal.currency}` : '';
    return `${signal.amount}${currency}`.trim();
  }

  return signal.rawText.trim();
}

function humanizeBonusType(type: BonusSignal['type']): string {
  return type
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function normalizeBrand(casinoBrand: string | null, senderDomain: string | null): string {
  if (casinoBrand?.trim()) return casinoBrand.trim();
  if (!senderDomain) return 'Unknown Brand';

  const root = senderDomain
    .replace(/^(mail|email|promo|offers|news|info|hello|noreply|no-reply)\./i, '')
    .split('.')[0]
    ?.replace(/[-_]+/g, ' ');

  return root
    ?.split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || 'Unknown Brand';
}

function selectBonusUrl(intel: EmailIntelData): string {
  const urls = intel.allUrls.length > 0 ? intel.allUrls : intel.embeddedUrls;
  const best = urls.find((url) => !NON_CLAIM_URL_PATTERNS.some((pattern) => pattern.test(url)));
  if (best) {
    return best;
  }

  if (intel.senderDomain) {
    return `https://${intel.senderDomain}`;
  }

  return 'https://tiltcheck.me/bonuses';
}

function selectBonusImageUrl(intel: EmailIntelData): string | null {
  const safeImage = intel.imageUrls.find((url) => isDurableImageUrl(url, intel.senderDomain));
  return safeImage || null;
}

function isDurableImageUrl(url: string, senderDomain: string | null): boolean {
  if (NON_DURABLE_IMAGE_URL_PATTERNS.some((pattern) => pattern.test(url))) {
    return false;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    if (senderDomain && hostname === senderDomain.toLowerCase()) {
      return true;
    }

    return /\.(png|jpe?g|gif|webp|svg)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function extractPromoCode(rawEmail: string, intel: EmailIntelData): string | null {
  if (intel.promoCode) {
    return intel.promoCode;
  }

  const match = rawEmail.match(/(?:promo|bonus|offer|coupon)\s*code\s*[:\-]?\s*([A-Z0-9-]{4,20})/i);
  return match?.[1]?.toUpperCase() || null;
}

function inferUrgencyExpiry(urgencyFlags: string[]): string | null {
  if (urgencyFlags.some((flag) => /today\s*only/i.test(flag))) {
    return 'today only';
  }
  return null;
}

function resolveExpiryTimestamp(expiryMessage: string | null, baseIso: string): string | null {
  if (!expiryMessage) return null;

  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) return null;

  const normalized = expiryMessage.toLowerCase();
  const relativeMatch = normalized.match(/in\s*(\d+)\s*(hour|hours|day|days|week|weeks)/i);
  if (relativeMatch) {
    const amount = Number(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    const multiplier = unit.startsWith('hour') ? 3_600_000 : unit.startsWith('day') ? 86_400_000 : 604_800_000;
    return new Date(base.getTime() + (amount * multiplier)).toISOString();
  }

  if (/\btoday\b|\btonight\b/i.test(normalized)) {
    const expires = new Date(base);
    expires.setUTCHours(23, 59, 59, 999);
    return expires.toISOString();
  }

  if (/\btomorrow\b/i.test(normalized)) {
    const expires = new Date(base);
    expires.setUTCDate(expires.getUTCDate() + 1);
    expires.setUTCHours(23, 59, 59, 999);
    return expires.toISOString();
  }

  const absoluteMatch = expiryMessage.match(/(?:on\s*)?([A-Za-z]+\s+\d{1,2}(?:,\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i);
  if (!absoluteMatch?.[1]) return null;

  const candidate = absoluteMatch[1].includes('/')
    ? parseSlashDate(absoluteMatch[1], base)
    : parseNamedDate(absoluteMatch[1], base);

  return candidate ? candidate.toISOString() : null;
}

function parseSlashDate(rawDate: string, base: Date): Date | null {
  const parts = rawDate.split('/');
  const month = Number(parts[0]);
  const day = Number(parts[1]);
  const year = parts[2] ? normalizeYear(Number(parts[2])) : base.getUTCFullYear();
  if (!month || !day || !year) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  if (!parts[2] && parsed.getTime() < base.getTime()) {
    parsed.setUTCFullYear(parsed.getUTCFullYear() + 1);
  }
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseNamedDate(rawDate: string, base: Date): Date | null {
  const withYear = /\d{4}/.test(rawDate) ? rawDate : `${rawDate}, ${base.getUTCFullYear()}`;
  const parsed = new Date(`${withYear} 23:59:59 UTC`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (!/\d{4}/.test(rawDate) && parsed.getTime() < base.getTime()) {
    parsed.setUTCFullYear(parsed.getUTCFullYear() + 1);
  }
  return parsed;
}

function normalizeYear(year: number): number {
  if (year < 100) {
    return year >= 70 ? 1900 + year : 2000 + year;
  }
  return year;
}

function hasExpired(expiryMessage: string | null, expiresAt: string | null, now: Date): boolean {
  if (expiryMessage && /\b(?:expired|ended|closed)\b/i.test(expiryMessage)) {
    return true;
  }

  if (!expiresAt) return false;
  const expiryDate = new Date(expiresAt);
  return !Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() <= now.getTime();
}

function isExpiredEntry(entry: EmailBonusFeedEntry, now: Date): boolean {
  return hasExpired(entry.expiryMessage, entry.expiresAt, now);
}

function getUnpublishedActiveEntries(
  feed: EmailBonusFeed,
  incomingEntries: EmailBonusFeedEntry[],
  now: Date
): EmailBonusFeedEntry[] {
  const incomingIds = new Set(incomingEntries.map((entry) => entry.id));
  return feed.bonuses.filter((entry) => (
    incomingIds.has(entry.id)
    && !isExpiredEntry(entry, now)
    && !entry.lastPublishedAt
  ));
}

function buildEntryId(input: {
  brand: string;
  url: string;
  signal: BonusSignal;
  code: string | null;
  index: number;
}): string {
  return [
    input.brand,
    input.url,
    input.signal.type,
    input.signal.rawText,
    input.code,
    input.index,
  ]
    .join('|')
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 180);
}

function sortFeedBonuses(feed: EmailBonusFeed): EmailBonusFeed {
  return {
    ...feed,
    bonuses: [...feed.bonuses].sort((left, right) => (
      new Date(right.verified).getTime() - new Date(left.verified).getTime()
    )),
  };
}

function writeEmailBonusFeed(feed: EmailBonusFeed): void {
  const feedPath = getEmailBonusFeedPath();
  const dir = path.dirname(feedPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(feedPath, JSON.stringify(feed, null, 2), 'utf8');
}

function isFeedEntry(entry: unknown): entry is EmailBonusFeedEntry {
  if (!entry || typeof entry !== 'object') return false;
  const candidate = entry as Partial<EmailBonusFeedEntry>;
  return (
    typeof candidate.id === 'string'
    && typeof candidate.brand === 'string'
    && typeof candidate.bonus === 'string'
    && typeof candidate.url === 'string'
    && typeof candidate.verified === 'string'
  );
}
