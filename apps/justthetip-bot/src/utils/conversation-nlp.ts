export type ConversationIntent = 'help' | 'tip' | 'wallet' | 'deposit' | 'withdraw' | 'unknown';

const INTENT_KEYWORDS: Array<{ intent: ConversationIntent; words: string[] }> = [
  { intent: 'help', words: ['help', 'how', 'what', 'commands', 'start', 'guide'] },
  { intent: 'tip', words: ['tip', 'send', 'airdrop', 'rain'] },
  { intent: 'wallet', words: ['wallet', 'address', 'register', 'connect'] },
  { intent: 'deposit', words: ['deposit', 'fund', 'load', 'top up', 'memo'] },
  { intent: 'withdraw', words: ['withdraw', 'cash out', 'payout'] },
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
    case 'deposit':
      return 'Load credit with `/tip deposit` or `/tip deposit-token token:USDC`, then transfer using the memo code.';
    case 'wallet':
      return 'Wallet setup is quick: `/tip wallet action:register-external`. That wallet is used for withdrawals.';
    case 'tip':
      return 'Fast route: `/tip direct @user $5`. Group route: `/tip airdrop`. You are spending custodial credit balance.';
    case 'withdraw':
      return 'When you are done cooking, run `/tip withdraw` to send remaining credit to your registered wallet.';
    case 'help':
      return 'Quick map: `/tip` is the one command. Use `/tip help` for the full breakdown.';
    default:
      return 'Tell me what you want: deposit, tip, wallet, or withdraw. I will give exact commands.';
  }
}
