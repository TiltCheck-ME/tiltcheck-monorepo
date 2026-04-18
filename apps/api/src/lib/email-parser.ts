// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17

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

  const fromMatch = headerBlock.match(/^From:.*?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/im)
    || raw.match(/From:.*?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
  const replyToMatch = headerBlock.match(/^Reply-To:.*?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/im);
  const returnPathMatch = headerBlock.match(/^Return-Path:.*?<([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})>/im);

  const rawEmail = fromMatch?.[1] || replyToMatch?.[1] || returnPathMatch?.[1] || null;
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
  const allUrls = [...new Set([...raw.matchAll(urlRegex)].map((m) => m[0].replace(/[.,;)]+$/, '')))];
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
    /(?:\$)?(\d[\d,.]*)\s*(sc|gc|usd|usdc|sol|free\s*play|free\s*spins?|free\s*coins?|sweep\s*coins?|gold\s*coins?)/gi,
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
  const htmlImageMatches = [...raw.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1]);
  const markdownImageMatches = [...raw.matchAll(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/gi)].map((match) => match[1]);
  const imageLikeUrls = [...raw.matchAll(/https?:\/\/[^\s"'<>)\]]+\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s"'<>)\]]+)?/gi)].map((match) =>
    match[0].replace(/[.,;)]+$/, '')
  );

  return [...new Set([...htmlImageMatches, ...markdownImageMatches, ...imageLikeUrls])]
    .map((url) => url.trim())
    .filter(Boolean);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    /(?:promo|bonus|offer|coupon)\s*code\s*[:\-]?\s*([A-Z0-9-]{4,20})/i,
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
