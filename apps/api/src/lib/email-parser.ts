// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06

/**
 * Email Intel Parser
 *
 * Extracts structured trust signal data from raw casino marketing email text.
 * Designed for use with the /rgaas/email-ingest endpoint.
 *
 * Parses:
 *   - Sender domain (From / Reply-To / Return-Path headers)
 *   - Casino brand name
 *   - Bonus type, amount, and wagering requirements
 *   - All URLs embedded in the email body
 *   - Promotional cadence signals (urgency language, expiry)
 */

export interface BonusSignal {
  type: 'match' | 'free_play' | 'no_deposit' | 'reload' | 'cashback' | 'vip' | 'daily' | 'weekly' | 'unknown';
  amount: string | null;
  currency: 'SC' | 'GC' | 'USD' | 'USDC' | 'SOL' | 'unknown';
  wageringRequirement: string | null;
  expiresIn: string | null;
  rawText: string;
}

export interface EmailIntelData {
  senderDomain: string | null;
  senderEmail: string | null;
  casinoBrand: string | null;
  subject: string | null;
  sentAt: string | null;
  bonusSignals: BonusSignal[];
  allUrls: string[];
  embeddedUrls: string[];
  imageUrls: string[];
  urgencyFlags: string[];
  hasUnsubscribeLink: boolean;
  hasSPFHint: boolean;
  promoCode: string | null;
  rawSignals: string[];
}

// ─── Known sweepstakes casino brand patterns ─────────────────────────────────

const BRAND_PATTERNS: Array<{ pattern: RegExp; brand: string }> = [
  { pattern: /myprize(?:\s*us)?/i, brand: 'MyPrize US' },
  { pattern: /chumba\s*casino/i, brand: 'Chumba Casino' },
  { pattern: /global\s*poker/i, brand: 'Global Poker' },
  { pattern: /luckyland\s*slots?/i, brand: 'LuckyLand Slots' },
  { pattern: /pulsz\s*bingo/i, brand: 'Pulsz Bingo' },
  { pattern: /pulsz/i, brand: 'Pulsz' },
  { pattern: /stake\.us/i, brand: 'Stake.us' },
  { pattern: /high\s*5\s*casino/i, brand: 'High 5 Casino' },
  { pattern: /wow\s*vegas/i, brand: 'WOW Vegas' },
  { pattern: /funrize/i, brand: 'Funrize' },
  { pattern: /modo(?:\s*casino)?/i, brand: 'Modo Casino' },
  { pattern: /rolla/i, brand: 'Rolla' },
  { pattern: /rolling\s*riches/i, brand: 'Rolling Riches' },
  { pattern: /hello\s*millions/i, brand: 'Hello Millions' },
  { pattern: /fortune\s*coins/i, brand: 'Fortune Coins' },
  { pattern: /sportzino/i, brand: 'Sportzino' },
  { pattern: /zula\s*casino/i, brand: 'Zula Casino' },
  { pattern: /crown\s*coins(?:\s*casino)?/i, brand: 'Crown Coins Casino' },
  { pattern: /gains(?:\.com)?/i, brand: 'Gains.com' },
  { pattern: /lone\s*star\s*casino/i, brand: 'LoneStar Casino' },
  { pattern: /real\s*prize/i, brand: 'Real Prize' },
  { pattern: /megabonanza|mega\s*bonanza/i, brand: 'MegaBonanza' },
  { pattern: /mcluck/i, brand: 'McLuck' },
  { pattern: /no\s*limit\s*coins/i, brand: 'NoLimitCoins' },
  { pattern: /jackpota/i, brand: 'Jackpota' },
  { pattern: /playfame/i, brand: 'PlayFame' },
  { pattern: /spinblitz/i, brand: 'SpinBlitz' },
  { pattern: /ace(?:\.com)?/i, brand: 'Ace.com' },
  { pattern: /spindoo/i, brand: 'Spindoo' },
  { pattern: /american\s*luck/i, brand: 'American Luck' },
  { pattern: /yay\s*casino/i, brand: 'Yay Casino' },
  { pattern: /shuffle(?:\.us|\s*us)?/i, brand: 'Shuffle.us' },
  { pattern: /chanced/i, brand: 'Chanced' },
  { pattern: /punt/i, brand: 'Punt' },
  { pattern: /spinfinite/i, brand: 'Spinfinite' },
  { pattern: /lunaland\s*casino/i, brand: 'Lunaland Casino' },
  { pattern: /baba\s*casino/i, brand: 'Baba Casino' },
  { pattern: /tao(?:\s*fortune|\.fun)/i, brand: 'Tao Fortune' },
  { pattern: /ding\s*ding\s*ding/i, brand: 'DingDingDing' },
  { pattern: /scratchful/i, brand: 'Scratchful' },
  { pattern: /spree/i, brand: 'Spree' },
  { pattern: /dara\s*casino/i, brand: 'Dara Casino' },
  { pattern: /chip(?:\s*'?\s*n)?\s*win/i, brand: "Chip'n WIN" },
  { pattern: /jefebet\s*casino/i, brand: 'JefeBet Casino' },
  { pattern: /rollin\s*riches/i, brand: 'Rollin Riches' },
  { pattern: /lucky\s*stake/i, brand: 'LuckyStake' },
  { pattern: /lucky\s*hands/i, brand: 'Lucky Hands' },
  { pattern: /spinquest/i, brand: 'SpinQuest' },
  { pattern: /zoot/i, brand: 'Zoot' },
  { pattern: /gold\s*machine/i, brand: 'Gold Machine' },
  // Crypto / offshore
  { pattern: /roobet/i, brand: 'Roobet' },
  { pattern: /rollbit/i, brand: 'Rollbit' },
  { pattern: /stake\.com/i, brand: 'Stake' },
  { pattern: /gamdom/i, brand: 'Gamdom' },
  { pattern: /shuffle/i, brand: 'Shuffle' },
  { pattern: /bc\.game/i, brand: 'BC.Game' },
];

// ─── Bonus type detection ─────────────────────────────────────────────────────

function detectBonusType(text: string): BonusSignal['type'] {
  const t = text.toLowerCase();
  if (/no[- ]deposit/i.test(t)) return 'no_deposit';
  if (/free\s*(play|spins|coins|sc|gc)/i.test(t)) return 'free_play';
  if (/match\s*(bonus|deposit|up\s*to)/i.test(t)) return 'match';
  if (/reload/i.test(t)) return 'reload';
  if (/cashback|cash\s*back/i.test(t)) return 'cashback';
  if (/vip|loyalty/i.test(t)) return 'vip';
  if (/daily/i.test(t)) return 'daily';
  if (/weekly/i.test(t)) return 'weekly';
  return 'unknown';
}

function detectCurrency(text: string): BonusSignal['currency'] {
  if (/\bsc\b|\bsweep\s*coin/i.test(text)) return 'SC';
  if (/\bgc\b|\bgold\s*coin/i.test(text)) return 'GC';
  if (/\bsol\b|\bsolana/i.test(text)) return 'SOL';
  if (/\busdc\b/i.test(text)) return 'USDC';
  if (/\$|\busd\b/i.test(text)) return 'USD';
  return 'unknown';
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseEmailIntel(raw: string): EmailIntelData {
  const lines = raw.split(/\r?\n/);

  // ── Extract headers (lines before first blank line) ──
  let headerEnd = lines.findIndex((l) => l.trim() === '');
  if (headerEnd === -1) headerEnd = Math.min(40, lines.length);

  const headerBlock = lines.slice(0, headerEnd).join('\n');
  const bodyBlock = lines.slice(headerEnd).join('\n');

  // ── Sender domain ──
  let senderEmail: string | null = null;
  let senderDomain: string | null = null;

  // Linear-time header scans (replaces `^From:.*?(local@domain)` regexes that
  // backtracked polynomially on long header lines).
  const fromEmail = findHeaderEmail(headerBlock, 'from:', true) || findHeaderEmail(raw, 'from:', false);
  const replyToEmail = findHeaderEmail(headerBlock, 'reply-to:', true);
  const returnPathMatch = headerBlock.match(/^Return-Path:.*?<([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})>/im);

  const rawEmail = fromEmail || replyToEmail || returnPathMatch?.[1] || null;
  if (rawEmail) {
    senderEmail = rawEmail;
    senderDomain = rawEmail.split('@')[1] ?? null;
  }

  // ── Subject ──
  const subjectMatch = headerBlock.match(/^Subject:\s*(.+)/im);
  const subject = subjectMatch?.[1]?.trim() || null;
  const dateMatch = headerBlock.match(/^Date:\s*(.+)/im);
  const sentAt = normalizeHeaderDate(dateMatch?.[1] || null);

  // ── SPF hint ──
  const hasSPFHint = /spf=pass|dkim=pass/i.test(headerBlock);

  // ── Casino brand ──
  let casinoBrand: string | null = null;
  const fullText = subject ? `${subject} ${bodyBlock}` : bodyBlock;
  for (const { pattern, brand } of BRAND_PATTERNS) {
    if (pattern.test(fullText)) {
      casinoBrand = brand;
      break;
    }
  }
  // Fallback: use sender domain as brand hint
  if (!casinoBrand && senderDomain) {
    casinoBrand = senderDomain.replace(/^(mail|email|promo|noreply|no-reply)\./i, '').split('.')[0] ?? null;
  }

  // ── Embedded URLs ──
  const urlRegex = /https?:\/\/[^\s"'<>\]]+/gi;
  const allUrls = [...new Set([...raw.matchAll(urlRegex)].map((m) => trimTrailingUrlPunctuation(m[0])))];
  const embeddedUrls = allUrls.filter((u) => {
    try {
      return new URL(u).hostname !== senderDomain;
    } catch {
      return true;
    }
  });
  const imageUrls = extractImageUrls(raw);

  // ── Bonus signal extraction ──
  const bonusSignals: BonusSignal[] = [];

  // Match patterns like "$50 Free Play", "200 SC", "100% match up to $500", "5 SC No Deposit"
  const bonusPatterns = [
    /(?:\$)?(\d[\d,.]{0,24})\s*(sc|gc|usd|usdc|sol|free\s*play|free\s*spins?|free\s*coins?|sweep\s*coins?|gold\s*coins?)/gi,
    /(\d{1,3}%)\s*match(\s*bonus)?(\s*up\s*to\s*[\$\d,.]+)?/gi,
    /(no[- ]deposit\s*bonus(?:\s*of\s*[\$\d,.]+\s*(?:sc|gc))?)/gi,
    /(daily|weekly)\s*(bonus|reward|coins?|sc|gc)(\s*of\s*[\$\d,.]+)?/gi,
    /cashback\s*(?:of\s*)?(\d{1,3}%|\$[\d,.]+)/gi,
  ];

  for (const pattern of bonusPatterns) {
    const matches = [...bodyBlock.matchAll(pattern)];
    for (const m of matches) {
      const rawText = m[0].trim();
      if (rawText.length < 3) continue;
      bonusSignals.push({
        type: detectBonusType(rawText),
        amount: m[1] || null,
        currency: detectCurrency(rawText),
        wageringRequirement: extractWagering(bodyBlock, m.index ?? 0),
        expiresIn: extractExpiry(bodyBlock, m.index ?? 0),
        rawText,
      });
    }
  }

  // ── Urgency flags ──
  const urgencyPatterns = [
    /expires?\s*(in|on|at)/i,
    /limited\s*time/i,
    /today\s*only/i,
    /act\s*now/i,
    /don'?t\s*miss/i,
    /last\s*chance/i,
    /hurry/i,
    /\d+\s*hours?\s*left/i,
    /claim\s*(before|by)/i,
  ];
  const urgencyFlags = urgencyPatterns
    .filter((p) => p.test(bodyBlock))
    .map((p) => p.source);

  // ── Unsubscribe ──
  const hasUnsubscribeLink = /unsubscribe/i.test(raw);
  const promoCode = extractPromoCode(fullText);

  // ── Raw signals summary ──
  const rawSignals: string[] = [];
  if (bonusSignals.length) rawSignals.push(`${bonusSignals.length} bonus signal(s) detected`);
  if (urgencyFlags.length) rawSignals.push(`${urgencyFlags.length} urgency trigger(s)`);
  if (!hasUnsubscribeLink) rawSignals.push('No unsubscribe link — potential spam signal');
  if (!hasSPFHint) rawSignals.push('SPF/DKIM not confirmed in headers');
  if (embeddedUrls.length > 10) rawSignals.push(`High link density: ${embeddedUrls.length} URLs`);

  return {
    senderDomain,
    senderEmail,
    casinoBrand,
    subject,
    sentAt,
    bonusSignals,
    allUrls,
    embeddedUrls,
    imageUrls,
    urgencyFlags,
    hasUnsubscribeLink,
    hasSPFHint,
    promoCode,
    rawSignals,
  };
}

function extractImageUrls(raw: string): string[] {
  const htmlImageMatches = extractHtmlImgSrcs(raw);
  const markdownImageMatches = [...raw.matchAll(/!\[[^\]]{0,1000}]\((https?:\/\/[^)\s]{1,2048})\)/gi)].map((match) => match[1]);
  const imageLikeUrls = extractImageLikeUrls(raw).map((url) => trimTrailingUrlPunctuation(url));

  return [...new Set([...htmlImageMatches, ...markdownImageMatches, ...imageLikeUrls])]
    .map((url) => url.trim())
    .filter(Boolean);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// The helpers below replace regexes that CodeQL flagged as polynomial ReDoS
// (js/polynomial-redos). Each keeps the old regex's match semantics but runs
// in linear time.

const EMAIL_LOCAL_CHAR = /[a-zA-Z0-9._%+\-]/;
const EMAIL_DOMAIN_CHAR = /[a-zA-Z0-9.\-]/;
const ASCII_LETTER = /[a-zA-Z]/;

/** Equivalent of `([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})` (leftmost match). */
function findEmailInText(text: string): string | null {
  let at = text.indexOf('@');
  while (at !== -1) {
    let start = at;
    while (start > 0 && EMAIL_LOCAL_CHAR.test(text[start - 1])) start--;
    if (start < at) {
      let end = at + 1;
      while (end < text.length && EMAIL_DOMAIN_CHAR.test(text[end])) end++;
      // Greedy backtracking picks the last '.' (with >=1 char before it) followed by >=2 letters.
      for (let dot = end - 3; dot >= at + 2; dot--) {
        if (text[dot] === '.' && ASCII_LETTER.test(text[dot + 1]) && ASCII_LETTER.test(text[dot + 2])) {
          let tld = dot + 3;
          while (tld < end && ASCII_LETTER.test(text[tld])) tld++;
          return text.slice(start, tld);
        }
      }
    }
    at = text.indexOf('@', at + 1);
  }
  return null;
}

/**
 * Equivalent of `/^Header:.*?(email)/im` (anchored) or `/Header:.*?(email)/i`
 * (unanchored): first header occurrence whose remaining line holds an email.
 */
function findHeaderEmail(text: string, headerLower: string, anchored: boolean): string | null {
  for (const line of text.split(/[\n\r\u2028\u2029]/)) {
    const lower = line.toLowerCase();
    const idx = anchored ? (lower.startsWith(headerLower) ? 0 : -1) : lower.indexOf(headerLower);
    if (idx === -1) continue;
    const found = findEmailInText(line.slice(idx + headerLower.length));
    if (found) return found;
  }
  return null;
}

/** Equivalent of `.replace(/[.,;)]+$/, '')`. */
function trimTrailingUrlPunctuation(url: string): string {
  let end = url.length;
  while (end > 0 && '.,;)'.includes(url[end - 1])) end--;
  return url.slice(0, end);
}

/** Equivalent of `[...raw.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m => m[1])`. */
function extractHtmlImgSrcs(raw: string): string[] {
  const lower = raw.toLowerCase();

  // A `src=` candidate's validity does not depend on which <img> tag it sits
  // in (the value may run past '>'), so evaluate every candidate exactly once.
  const validSrcAt: number[] = [];
  const valueEndAt = new Map<number, number>();
  for (let k = lower.indexOf('src='); k !== -1; k = lower.indexOf('src=', k + 1)) {
    const quote = raw[k + 4];
    if (quote !== '"' && quote !== "'") continue;
    let valueEnd = k + 5;
    while (valueEnd < raw.length && raw[valueEnd] !== '"' && raw[valueEnd] !== "'") valueEnd++;
    if (valueEnd > k + 5 && valueEnd < raw.length) {
      validSrcAt.push(k);
      valueEndAt.set(k, valueEnd);
    }
  }

  // Last valid candidate <= limit (binary search), or -1.
  const lastValidAtOrBefore = (limit: number): number => {
    let lo = 0;
    let hi = validSrcAt.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (validSrcAt[mid] <= limit) {
        found = validSrcAt[mid];
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return found;
  };

  const results: string[] = [];
  let from = 0;
  let nextGt = -2; // cached index of the next '>' (-1 = none left, -2 = not computed)
  while (true) {
    const tagStart = lower.indexOf('<img', from);
    if (tagStart === -1) break;
    if (nextGt === -2 || (nextGt !== -1 && nextGt < tagStart + 4)) {
      nextGt = lower.indexOf('>', tagStart + 4);
    }
    const tagEnd = nextGt === -1 ? raw.length : nextGt;
    // `[^>]+` is greedy, so the regex took the last `src=` + quote inside the tag
    // (at least one char after "<img") whose quoted value is non-empty and closed.
    const srcAt = lastValidAtOrBefore(tagEnd - 4);
    if (srcAt >= tagStart + 5) {
      const valueEnd = valueEndAt.get(srcAt)!;
      results.push(raw.slice(srcAt + 5, valueEnd));
      from = valueEnd + 1;
    } else {
      from = tagStart + 1;
    }
  }
  return results;
}

const IMAGE_EXTENSIONS = ['.png', '.jpeg', '.jpg', '.gif', '.webp', '.svg'];

/**
 * Equivalent of
 * `/https?:\/\/[^\s"'<>)\]]+\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s"'<>)\]]+)?/gi`.
 * Tokenizes URL runs first (each run consumed once), then finds the last image
 * extension inside each run.
 */
function extractImageLikeUrls(raw: string): string[] {
  const results: string[] = [];
  for (const m of raw.matchAll(/https?:\/\/[^\s"'<>)\]]+/gi)) {
    const token = m[0];
    const lower = token.toLowerCase();
    const minDot = lower.indexOf('//') + 3; // `[^...]+` needs at least one char after the scheme
    for (let dot = token.length - 4; dot >= minDot; dot--) {
      if (token[dot] !== '.') continue;
      const ext = IMAGE_EXTENSIONS.find((candidate) => lower.startsWith(candidate, dot));
      if (!ext) continue;
      const extEnd = dot + ext.length;
      const hasQuery = token[extEnd] === '?' && token.length > extEnd + 1;
      results.push(hasQuery ? token : token.slice(0, extEnd));
      break;
    }
  }
  return results;
}

function extractWagering(body: string, nearIndex: number): string | null {
  const window = body.slice(Math.max(0, nearIndex - 50), nearIndex + 300);
  const match = window.match(/(\d+)x\s*wagering|\bwagering\s*(?:requirement)?\s*(?:of|is|:)?\s*(\d+)x/i);
  return match ? `${match[1] || match[2]}x` : null;
}

function extractExpiry(body: string, nearIndex: number): string | null {
  const window = body.slice(Math.max(0, nearIndex - 50), nearIndex + 300);
  const match = window.match(
    /(?:expired\s*(?:yesterday|today)|(?:expires?|ends?)\s*(in\s*[\d]+\s*(?:hours?|days?|weeks?)|on\s*[A-Za-z]+\s*\d{1,2}(?:,\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|today|tonight|tomorrow))/i
  );
  return match ? match[0].trim() : null;
}

function normalizeHeaderDate(rawDate: string | null): string | null {
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function extractPromoCode(text: string): string | null {
  const patterns = [
    /(?:promo|bonus|offer|coupon)\s*code\s*(?:[:\-]\s*)?([A-Z0-9-]{4,20})/i,
    /\buse\s+code\s+([A-Z0-9-]{4,20})\b/i,
    /\benter\s+code\s+([A-Z0-9-]{4,20})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  return null;
}
