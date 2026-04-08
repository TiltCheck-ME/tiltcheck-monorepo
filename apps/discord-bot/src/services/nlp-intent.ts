// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-08
/**
 * NLP Intent Classifier
 * Maps free-form user messages to slash command intents.
 * Used for DMs and @mentions so users don't need to know exact slash commands.
 * Tone: direct, blunt, degen wit — no emojis, no apologies, no corporate fluff.
 */

export interface DetectedIntent {
  command: string;
  confidence: 'high' | 'low';
  args: Record<string, string>;
  reply?: string;
}

// Intent patterns: ordered by specificity (most specific first)
const INTENT_PATTERNS: Array<{
  pattern: RegExp;
  command: string;
  extract?: (match: RegExpMatchArray) => Record<string, string>;
  reply?: string;
}> = [
  // /scan — URL scanning
  {
    pattern: /(?:scan|check|is this safe|sketchy|sus|legit)\s+(https?:\/\/\S+)/i,
    command: 'scan',
    extract: (m) => ({ url: m[1] }),
    reply: 'That URL looks questionable. Run `/scan url:{url}` before your wallet finds out the hard way.',
  },
  // /casino — casino trust check
  {
    pattern: /(?:check|is|trust|legit|review|rate|score)\s+(?:casino\s+)?([a-z0-9-]+\.(?:com|io|bet|casino|ag|net))/i,
    command: 'casino',
    extract: (m) => ({ domain: m[1] }),
    reply: 'Before you deposit a single cent — `/casino domain:{domain}`. Trust the audit, not the promo banner.',
  },
  // /status — tilt status
  {
    pattern: /(?:how am i|my status|am i (?:ok|fine|tilting|on tilt)|check me|audit me|tilt check|how bad|my risk|am i good)/i,
    command: 'status',
    reply: 'The fact you\'re asking is already a signal. Run `/status` and let the data tell you what you don\'t want to hear.',
  },
  // /cooldown — break requests
  {
    pattern: /(?:i need a break|start cooldown|take a break|pause|stop me|lock me out|cool(?:down)?(?:\s+(\d+))?)/i,
    command: 'cooldown',
    extract: (m) => (m[1] ? { duration: m[1] } : {} as Record<string, string>),
    reply: 'Smartest thing you\'ve said all session. `/cooldown` — add `duration:` in minutes if you know yourself.',
  },
  // /goal — set profit target
  {
    pattern: /(?:set (?:my )?goal|cash out at|profit target|i want to (?:win|make)|redeem at)\s+\$?([\d.]+)/i,
    command: 'goal',
    extract: (m) => ({ redeem_point: m[1] }),
    reply: 'Redeem-to-win. Use `/goal starting_balance:{amount} redeem_point:{target}` — and actually stick to it this time.',
  },
  // /odds — game odds
  {
    pattern: /(?:odds|house edge|rtp|return|payout|what(?:'s| are) the odds)\s+(?:of\s+|for\s+)?([a-z]+)/i,
    command: 'odds',
    extract: (m) => ({ game: m[1] }),
    reply: 'The house always has the edge. See exactly how bad with `/odds game:{game}` — slots, blackjack, roulette, baccarat, poker, craps, keno.',
  },
  // /jackpot — prize pool
  {
    pattern: /(?:jackpot|prize|pool|prize ?pool|what(?:'s| is) (?:in )?the (?:pot|pool))/i,
    command: 'jackpot',
    reply: 'Community pool is live. `/jackpot status` — and yes, degens actually win it.',
  },
  // /linkwallet — wallet linking
  {
    pattern: /(?:link|connect|add|register)\s+(?:my\s+)?(?:wallet|solana|sol|phantom)\s*([1-9A-HJ-NP-Za-km-z]{32,44})?/i,
    command: 'linkwallet',
    extract: (m) => (m[1] ? { address: m[1] } : {} as Record<string, string>),
    reply: 'Non-custodial — your keys never leave your hands. `/linkwallet address:{your_solana_address}` to tie it to your trust score.',
  },
  // /reputation — trust scores
  {
    pattern: /(?:reputation|trust score|how trusted|what(?:'s| is) (?:my|the) (?:rep|score|trust))/i,
    command: 'reputation',
    reply: 'On-chain behavior doesn\'t lie. `/reputation user` for yours or `/reputation casino name:{site}` to check if they deserve your money.',
  },
  // /dashboard — full stats
  {
    pattern: /(?:dashboard|show (?:me )?(?:my )?stats|(?:my )?(?:full )?stats|overview|summary)/i,
    command: 'dashboard',
    reply: 'Full session forensics. `/dashboard` — try not to cringe at the data.',
  },
  // tip/payment routing
  {
    pattern: /(?:tip|send|airdrop|rain|deposit|withdraw|cash out|fund|load)\s/i,
    command: 'justthetip',
    reply: 'Tipping and payments live in JustTheTip bot, not here. This bot audits your head, not your wallet.',
  },
  // game routing
  {
    pattern: /(?:play|cards|poker|dad\b|degens against|blackjack|game)/i,
    command: 'play',
    reply: 'Card games are in the Degens Against Decency bot. I\'m the one trying to save you from yourself.',
  },
  // /help — catch-all
  {
    pattern: /(?:help|commands|what can you do|how do i|what do you do)/i,
    command: 'help',
    reply: 'Scan links, audit casinos, check your tilt, lock your vault, set a cash-out target. `/help` for the full breakdown.',
  },
];

export function detectIntent(message: string): DetectedIntent | null {
  const cleaned = message.trim().replace(/<@!?\d+>\s*/g, ''); // strip @mention

  for (const { pattern, command, extract, reply } of INTENT_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      const args = extract ? extract(match) : {};
      return { command, confidence: 'high', args, reply: buildReply(reply, args) };
    }
  }

  return null;
}

function buildReply(template: string | undefined, args: Record<string, string>): string | undefined {
  if (!template) return undefined;
  return template.replace(/\{(\w+)\}/g, (_, key) => args[key] ?? `{${key}}`);
}

export function formatNlpResponse(intent: DetectedIntent): string {
  if (intent.reply) return intent.reply;
  return `Try \`/${intent.command}\`.`;
}

/** Fallback when no intent matched — randomised so it doesn't feel like a canned error */
const FALLBACK_REPLIES = [
  'Not a command I recognise. Run `/help` — or just tell me what you\'re trying to do in plain terms.',
  'Say more. I handle: link scanning, casino audits, tilt checks, vault locks, and cash-out goals.',
  'That didn\'t match anything. `/help` shows the full list. Or just describe the problem.',
  'You\'re talking to an AI safety bot. Try describing what you need — scan, audit, status, cooldown, goal.',
];

export function getFallbackReply(): string {
  return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
}

