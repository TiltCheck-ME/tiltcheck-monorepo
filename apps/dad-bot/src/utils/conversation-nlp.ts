export type ConversationIntent = 'help' | 'game' | 'poker' | 'unknown';

const INTENT_KEYWORDS: Array<{ intent: ConversationIntent; words: string[] }> = [
  { intent: 'help', words: ['help', 'how', 'what', 'commands', 'start', 'guide'] },
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
    case 'game':
      return 'DA&D speedrun: `/dad lobby create` -> `/dad lobby join` -> `/dad lobby start` -> `/dad lobby hand` -> `/dad lobby submit` -> `/dad lobby vote` -> `/dad lobby scores`.';
    case 'poker':
      return "Poker table flow: `/dad poker start`, then friends use `/dad poker join`. During hands use `/dad poker check|call|raise|fold|allin`.";
    case 'help':
      return 'I run games, not wallets. Use `/dad lobby ...` for DA&D and `/dad poker ...` for hold’em.';
    default:
      return 'Say `play`, `poker`, or `help` and I will route you fast.';
  }
}
