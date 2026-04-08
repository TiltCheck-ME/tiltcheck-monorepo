// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-08
/**
 * NLP Intent Classifier
 * Maps free-form user messages to slash command intents.
 * Used for DMs and @mentions so users don't need to know exact slash commands.
 */

export interface DetectedIntent {
  command: string;
  confidence: 'high' | 'low';
  args: Record<string, string>;
  reply?: string; // fallback reply if command can't be auto-invoked
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
    reply: 'Use `/scan url:{url}` to check that link.',
  },
  // /casino — casino trust check
  {
    pattern: /(?:check|is|trust|legit|review|rate|score)\s+(?:casino\s+)?([a-z0-9-]+\.(?:com|io|bet|casino|ag|net))/i,
    command: 'casino',
    extract: (m) => ({ domain: m[1] }),
    reply: 'Use `/casino domain:{domain}` to check that site.',
  },
  // /status — tilt status
  {
    pattern: /(?:how am i|my status|am i (?:ok|fine|tilting|on tilt)|check me|audit me|tilt check|how bad|my risk)/i,
    command: 'status',
    reply: 'Use `/status` for a live audit of your session risk.',
  },
  // /cooldown — break requests
  {
    pattern: /(?:i need a break|start cooldown|take a break|pause|stop me|lock me out|cool(?:down)?(?:\s+(\d+))?)/i,
    command: 'cooldown',
    extract: (m) => (m[1] ? { duration: m[1] } : {} as Record<string, string>),
    reply: 'Use `/cooldown` to start a voluntary break. Add `duration:` in minutes.',
  },
  // /goal — set profit target
  {
    pattern: /(?:set (?:my )?goal|cash out at|profit target|i want to (?:win|make)|redeem at)\s+\$?([\d.]+)/i,
    command: 'goal',
    extract: (m) => ({ redeem_point: m[1] }),
    reply: 'Use `/goal starting_balance:{amount} redeem_point:{target}` to set your cash-out target.',
  },
  // /odds — game odds
  {
    pattern: /(?:odds|house edge|rtp|return|payout|what(?:'s| are) the odds)\s+(?:of\s+|for\s+)?([a-z]+)/i,
    command: 'odds',
    extract: (m) => ({ game: m[1] }),
    reply: 'Use `/odds game:{game}` — options: slots, blackjack, roulette, baccarat, poker, craps, keno.',
  },
  // /jackpot — prize pool
  {
    pattern: /(?:jackpot|prize|pool|prize ?pool|what(?:'s| is) (?:in )?the (?:pot|pool))/i,
    command: 'jackpot',
    reply: 'Use `/jackpot status` to see the current community prize pool.',
  },
  // /linkwallet — wallet linking
  {
    pattern: /(?:link|connect|add|register)\s+(?:my\s+)?(?:wallet|solana|sol|phantom)\s*([1-9A-HJ-NP-Za-km-z]{32,44})?/i,
    command: 'linkwallet',
    extract: (m) => (m[1] ? { address: m[1] } : {} as Record<string, string>),
    reply: 'Use `/linkwallet address:{your_solana_address}` to link your wallet.',
  },
  // /reputation — trust scores
  {
    pattern: /(?:reputation|trust score|how trusted|what(?:'s| is) (?:my|the) (?:rep|score|trust))/i,
    command: 'reputation',
    reply: 'Use `/reputation user` for your trust score or `/reputation casino name:{site}` for a casino.',
  },
  // /dashboard — full stats
  {
    pattern: /(?:dashboard|show (?:me )?(?:my )?stats|(?:my )?(?:full )?stats|overview|summary)/i,
    command: 'dashboard',
    reply: 'Use `/dashboard` for your full tilt stats and session history.',
  },
  // /help — catch-all help
  {
    pattern: /(?:help|commands|what can you do|how do i|what do you do)/i,
    command: 'help',
    reply: 'Use `/help` for the full command list.',
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
  return `Try \`/${intent.command}\` for that.`;
}
