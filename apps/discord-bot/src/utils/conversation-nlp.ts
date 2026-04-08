/* Copyright (c) 2026 TiltCheck. All rights reserved. */
export type ConversationIntent = 'help' | 'tip' | 'wallet' | 'deposit' | 'withdraw' | 'safety' | 'game' | 'poker' | 'unknown';

const INTENT_KEYWORDS: Array<{ intent: ConversationIntent; words: string[] }> = [
  { intent: 'help', words: ['help', 'how', 'what', 'commands', 'start', 'guide'] },
  { intent: 'tip', words: ['tip', 'send', 'airdrop', 'rain'] },
  { intent: 'wallet', words: ['wallet', 'address', 'register', 'connect'] },
  { intent: 'deposit', words: ['deposit', 'fund', 'load', 'top up', 'memo'] },
  { intent: 'withdraw', words: ['withdraw', 'cash out', 'payout'] },
  { intent: 'safety', words: ['tilt', 'cooldown', 'sus', 'scan', 'scam', 'safe'] },
  { intent: 'game', words: ['dad', 'cards', 'play', 'submit', 'vote', 'scores'] },
  { intent: 'poker', words: ['poker', 'all in', 'raise', 'fold', 'blinds'] },
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
      return 'Safety commands: `/status`, `/cooldown`, `/scan`, `/casino`. Run `/help` for the full list.';
    case 'help':
      return 'This is the TiltCheck safety bot. Run `/help` for the full command map. Tips go to JustTheTip bot. Card games go to the Degens Against Decency bot.';
    case 'tip':
    case 'deposit':
    case 'withdraw':
      return 'Tips, deposits, and withdrawals live in JustTheTip bot. This bot handles safety only.';
    case 'wallet':
      return 'Wallet registration is in JustTheTip bot. To link your wallet for trust scoring, use `/linkwallet` here.';
    case 'game':
    case 'poker':
      return 'Card games and poker are in the Degens Against Decency bot. This bot handles safety and session auditing.';
    default:
      return 'This is the TiltCheck safety bot. Run `/help` to see what I can do, or describe what you need.';
  }
}
