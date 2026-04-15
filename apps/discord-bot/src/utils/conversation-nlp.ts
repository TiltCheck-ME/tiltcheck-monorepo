// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-08
/**
 * Conversation NLP — intent detection and persona replies for DMs and @mentions.
 * Tone: direct, blunt, degen wit. No emojis. No apologies. No corporate fluff.
 */

export type ConversationIntent =
  | 'help'
  | 'tip'
  | 'wallet'
  | 'deposit'
  | 'withdraw'
  | 'safety'
  | 'game'
  | 'poker'
  | 'unknown';

const INTENT_KEYWORDS: Array<{ intent: ConversationIntent; words: string[] }> = [
  { intent: 'help',     words: ['help', 'how', 'what', 'commands', 'start', 'guide'] },
  { intent: 'tip',      words: ['tip', 'send', 'airdrop', 'rain'] },
  { intent: 'wallet',   words: ['wallet', 'address', 'register', 'connect'] },
  { intent: 'deposit',  words: ['deposit', 'fund', 'load', 'top up', 'memo'] },
  { intent: 'withdraw', words: ['withdraw', 'cash out', 'payout'] },
  { intent: 'safety',   words: ['tilt', 'cooldown', 'sus', 'scan', 'scam', 'safe'] },
  { intent: 'game',     words: ['dad', 'cards', 'play', 'submit', 'vote', 'scores'] },
  { intent: 'poker',    words: ['poker', 'all in', 'raise', 'fold', 'blinds'] },
];

export function detectConversationIntent(message: string): ConversationIntent {
  const text = message.toLowerCase().trim();
  for (const { intent, words } of INTENT_KEYWORDS) {
    if (words.some((word) => text.includes(word))) return intent;
  }
  return 'unknown';
}

export function buildPersonaReply(intent: ConversationIntent): string {
  switch (intent) {
    case 'safety':
      return 'On it. `/status` audits your session, `/cooldown` locks you out, `/scan` checks a link, `/casino` rates a site. Run `/help` for the rest.';
    case 'help':
      return 'TiltCheck — the reluctant babysitter for degens. Run `/help` for the full command map. Tipping lives in JustTheTip bot. Card games live in Degens Against Decency bot.';
    case 'tip':
      return 'Wrong bot. Tips and airdrops go through JustTheTip bot. I handle the part where you stop making terrible decisions.';
    case 'deposit':
      return 'Deposits run through JustTheTip bot. Non-custodial — your keys, your funds, your regrets.';
    case 'withdraw':
      return 'Withdrawals are in JustTheTip bot. While you\'re here: `/status` to make sure you\'re actually up before you cash out.';
    case 'wallet':
      return 'Wallet registration for tips is in JustTheTip bot. For trust scoring and session tracking, use `/linkwallet` here. Different wallets, different purpose.';
    case 'game':
      return 'Card games belong to the Degens Against Decency bot. I\'m the one who tells you when to stop.';
    case 'poker':
      return 'Poker is still disabled in the live DAD launch surfaces. If you want something that actually runs today, use trivia or the live activity list — then come back here when the tilt hits.';
    default:
      return 'TiltCheck audits your sessions, scans links, rates casinos, and locks your vault when you\'re spiralling. Run `/help` or just tell me what you need.';
  }
}

