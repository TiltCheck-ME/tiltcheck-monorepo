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
      return 'Safety tools: `/tiltcheck status`, `/tiltcheck cooldown`, `/tiltcheck suslink scan`, and `/tiltcheck casino`.';
    case 'help':
      return 'I am the safety bot. Use `/tiltcheck help` for the full command map. Tips are in JustTheTip bot. Games are in DA&D bot.';
    default:
      return 'I handle safety and moderation. If you want tips or games, I will route you to the right bot.';
  }
}
