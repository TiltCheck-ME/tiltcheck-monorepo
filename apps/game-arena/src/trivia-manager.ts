// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
/**
 * Trivia Manager
 * Full question-bank-driven trivia game engine for the game-arena service.
 * Manages game lifecycle, round timers, scoring, and eventRouter emissions.
 */

import { v4 as uuidv4 } from 'uuid';
import { eventRouter } from '@tiltcheck/event-router';
import type { TriviaGameSettings } from '@tiltcheck/types';

// ─── Question bank ────────────────────────────────────────────────────────────

interface StoredQuestion {
  id: string;
  question: string;
  choices: string[];
  answer: string;
  category: string;
  theme?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

const QUESTION_BANK: StoredQuestion[] = [
  // ── Gambling Strategy ──────────────────────────────────────────────────────
  {
    id: 'gs-01', category: 'gambling-strategy', difficulty: 'easy',
    question: 'What does RTP stand for?',
    choices: ['Return To Player', 'Risk Transfer Percentage', 'Rate To Profit', 'Random Trigger Probability'],
    answer: 'Return To Player',
    explanation: 'RTP is the theoretical percentage of all wagered money a slot machine pays back to players over time.',
  },
  {
    id: 'gs-02', category: 'gambling-strategy', difficulty: 'easy',
    question: 'If a slot advertises 96% RTP, what is the theoretical house edge?',
    choices: ['4%', '6%', '96%', '0.4%'],
    answer: '4%',
    explanation: 'House edge = 100% minus RTP. 100 - 96 = 4%.',
  },
  {
    id: 'gs-03', category: 'gambling-strategy', difficulty: 'medium',
    question: 'What is variance (volatility) in slot games?',
    choices: [
      'How frequently and how large payouts occur',
      'The speed of the spin animation',
      'The number of paylines active',
      'The minimum bet required',
    ],
    answer: 'How frequently and how large payouts occur',
    explanation: 'High volatility = rare but large wins. Low volatility = frequent but smaller wins.',
  },
  {
    id: 'gs-04', category: 'gambling-strategy', difficulty: 'medium',
    question: 'What is a Martingale betting strategy?',
    choices: [
      'Double bet after every loss',
      'Bet the same amount every round',
      'Halve bet after every win',
      'Bet 1% of bankroll per round',
    ],
    answer: 'Double bet after every loss',
    explanation: 'Martingale doubles after each loss to recover. It fails when hitting table limits or bankroll.',
  },
  {
    id: 'gs-05', category: 'gambling-strategy', difficulty: 'hard',
    question: 'In blackjack with perfect basic strategy, what is the approximate house edge?',
    choices: ['0.5%', '2%', '5%', '10%'],
    answer: '0.5%',
    explanation: 'With perfect basic strategy blackjack offers ~0.5% house edge — one of the lowest in the casino.',
  },
  {
    id: 'gs-06', category: 'gambling-strategy', difficulty: 'medium',
    question: 'What does "provably fair" mean in crypto gambling?',
    choices: [
      'The outcome can be cryptographically verified by the player',
      'The casino is licensed by a regulator',
      'The house edge is zero',
      'The game uses a random number generator',
    ],
    answer: 'The outcome can be cryptographically verified by the player',
    explanation: 'Provably fair uses HMAC-SHA256 with player and server seeds to prove the result was not manipulated.',
  },
  {
    id: 'gs-07', category: 'gambling-strategy', difficulty: 'easy',
    question: 'What is a "bad beat" in poker?',
    choices: [
      'Losing with a statistically strong hand to an unlikely draw',
      'Being physically hit by another player',
      'Folding a winning hand by mistake',
      'Losing all chips in one session',
    ],
    answer: 'Losing with a statistically strong hand to an unlikely draw',
    explanation: 'A bad beat is when a strong hand loses to an opponent who drew out with low probability.',
  },
  {
    id: 'gs-08', category: 'gambling-strategy', difficulty: 'hard',
    question: 'What does "Expected Value" (EV) represent?',
    choices: [
      'Average outcome of a bet over many trials',
      'Maximum possible win in a single bet',
      'The amount the house keeps per bet',
      'The number of wins in a session',
    ],
    answer: 'Average outcome of a bet over many trials',
    explanation: 'EV = probability of win * win amount - probability of loss * loss amount. Negative EV means losing long-term.',
  },
  {
    id: 'gs-09', category: 'gambling-strategy', difficulty: 'medium',
    question: 'What is "tilt" in gambling psychology?',
    choices: [
      'Emotionally compromised decision-making after losses',
      'The angle of a physical slot machine',
      'A bonus round feature',
      'A winning streak pattern',
    ],
    answer: 'Emotionally compromised decision-making after losses',
    explanation: 'Tilt causes players to chase losses, increase bets irrationally, and break their own limits.',
  },
  {
    id: 'gs-10', category: 'gambling-strategy', difficulty: 'hard',
    question: 'What is a "certified RTP tier" in slot gaming?',
    choices: [
      'A specific payout percentage tested by a lab like GLI or eCOGRA',
      'The advertised RTP on the casino lobby page',
      'A bonus feature that increases RTP temporarily',
      'The average RTP across all slots on a platform',
    ],
    answer: 'A specific payout percentage tested by a lab like GLI or eCOGRA',
    explanation: 'Slots are certified at multiple RTP tiers. Casinos choose which tier to deploy — players rarely know which.',
  },
  // ── Crypto & Web3 ──────────────────────────────────────────────────────────
  {
    id: 'cr-01', category: 'crypto', difficulty: 'easy',
    question: 'What does "HODL" mean in crypto culture?',
    choices: ['Hold long-term instead of selling', 'Hack On Decentralized Ledgers', 'High Order Derivative Logic', 'Hedge On Declining Liquidity'],
    answer: 'Hold long-term instead of selling',
    explanation: 'HODL originated from a 2013 Bitcoin forum typo for "hold" — it became a meme for long-term holding.',
  },
  {
    id: 'cr-02', category: 'crypto', difficulty: 'easy',
    question: 'What is a wallet "seed phrase"?',
    choices: [
      '12-24 words that back up your private key',
      'Your username and password for a crypto exchange',
      'A smart contract address',
      'A transaction ID on the blockchain',
    ],
    answer: '12-24 words that back up your private key',
    explanation: 'Never share your seed phrase. It grants full access to all funds associated with that wallet.',
  },
  {
    id: 'cr-03', category: 'crypto', difficulty: 'medium',
    question: 'What network does SOL run on?',
    choices: ['Solana', 'Ethereum', 'Polygon', 'Avalanche'],
    answer: 'Solana',
    explanation: 'SOL is the native token of the Solana blockchain, known for high throughput and low fees.',
  },
  {
    id: 'cr-04', category: 'crypto', difficulty: 'medium',
    question: 'What is a "wallet drainer" attack?',
    choices: [
      'A malicious smart contract that empties your wallet when you interact with it',
      'A slow rug pull over weeks',
      'An exchange that charges high withdrawal fees',
      'A phishing site that collects passwords',
    ],
    answer: 'A malicious smart contract that empties your wallet when you interact with it',
    explanation: 'Drainers execute token approvals silently — once signed, all approved tokens are swept to the attacker.',
  },
  {
    id: 'cr-05', category: 'crypto', difficulty: 'hard',
    question: 'What is HMAC-SHA256 used for in provably fair gambling?',
    choices: [
      'Generating a verifiable hash of the outcome using client and server seeds',
      'Encrypting credit card transactions',
      'Hashing player passwords in the database',
      'Verifying identity documents',
    ],
    answer: 'Generating a verifiable hash of the outcome using client and server seeds',
    explanation: 'HMAC-SHA256 with client seed, server seed, and nonce lets players verify no manipulation occurred post-round.',
  },
  {
    id: 'cr-06', category: 'crypto', difficulty: 'medium',
    question: 'What is a "rug pull"?',
    choices: [
      'Developers abandoning a project and taking investor funds',
      'A failed smart contract audit',
      'A temporary price dip on an exchange',
      'A liquidity lock expiry',
    ],
    answer: 'Developers abandoning a project and taking investor funds',
    explanation: 'Rug pulls happen when project insiders drain the liquidity pool and disappear, leaving holders with worthless tokens.',
  },
  {
    id: 'cr-07', category: 'crypto', difficulty: 'easy',
    question: 'What does "non-custodial" mean for a crypto wallet?',
    choices: [
      'You control your private keys — no third party holds them',
      'A hardware wallet stored in a bank vault',
      'A wallet with multi-sig required',
      'An exchange-held wallet with withdrawal limits',
    ],
    answer: 'You control your private keys — no third party holds them',
    explanation: 'Non-custodial wallets give users full sovereignty. Custodial wallets (exchanges) can freeze or seize funds.',
  },
  {
    id: 'cr-08', category: 'crypto', difficulty: 'hard',
    question: 'What is a "token approval" on EVM blockchains?',
    choices: [
      'Permission you grant a smart contract to spend your tokens',
      'A governance vote for a protocol upgrade',
      'A KYC step required by regulators',
      'The process of minting new tokens',
    ],
    answer: 'Permission you grant a smart contract to spend your tokens',
    explanation: 'Token approvals are permanent until revoked. Unlimited approvals to malicious contracts enable drainer attacks.',
  },
  // ── Math & Statistics ──────────────────────────────────────────────────────
  {
    id: 'ms-01', category: 'math', difficulty: 'easy',
    question: 'If you flip a fair coin 100 times, what is the expected number of heads?',
    choices: ['50', '100', '25', '0'],
    answer: '50',
    explanation: 'Expected value = probability * trials = 0.5 * 100 = 50.',
  },
  {
    id: 'ms-02', category: 'math', difficulty: 'medium',
    question: 'What does standard deviation measure?',
    choices: [
      'How spread out values are from the mean',
      'The highest value in a dataset',
      'The probability of an event occurring',
      'The average of all values',
    ],
    answer: 'How spread out values are from the mean',
    explanation: 'High standard deviation = wide spread. Low = values cluster near the mean.',
  },
  {
    id: 'ms-03', category: 'math', difficulty: 'hard',
    question: 'In a binomial z-test, what does a z-score of 3.0 indicate?',
    choices: [
      'The result is 3 standard deviations from the expected mean',
      'The probability of the event is exactly 3%',
      'The sample size is 3 times the minimum required',
      'The house edge is 3%',
    ],
    answer: 'The result is 3 standard deviations from the expected mean',
    explanation: 'A z-score of 3.0 corresponds to roughly p < 0.001 — the result is statistically anomalous.',
  },
  {
    id: 'ms-04', category: 'math', difficulty: 'medium',
    question: 'What is the gambler\'s fallacy?',
    choices: [
      'Believing past independent outcomes influence future ones',
      'Calculating correct expected value for a bet',
      'Doubling bets to recover losses (Martingale)',
      'Assuming all games have the same house edge',
    ],
    answer: 'Believing past independent outcomes influence future ones',
    explanation: 'Each spin is independent. "I\'m due for a win" after 10 losses is the gambler\'s fallacy.',
  },
  {
    id: 'ms-05', category: 'math', difficulty: 'hard',
    question: 'What is the law of large numbers?',
    choices: [
      'As sample size grows, observed average approaches theoretical expected value',
      'Large jackpots are won more often than small ones',
      'More players = higher house profits',
      'RTP increases as you play longer',
    ],
    answer: 'As sample size grows, observed average approaches theoretical expected value',
    explanation: 'Short sessions can deviate far from RTP. With millions of spins, actual returns converge to the certified RTP.',
  },
  {
    id: 'ms-06', category: 'math', difficulty: 'medium',
    question: 'What is p-value in hypothesis testing?',
    choices: [
      'Probability of seeing a result at least as extreme if the null hypothesis is true',
      'The probability that the alternative hypothesis is correct',
      'The confidence level of a test',
      'The sample size required for significance',
    ],
    answer: 'Probability of seeing a result at least as extreme if the null hypothesis is true',
    explanation: 'p < 0.05 is typically the significance threshold — it means the result is unlikely to be random noise.',
  },
  // ── Degen Culture ──────────────────────────────────────────────────────────
  {
    id: 'dc-01', category: 'degen-culture', difficulty: 'easy',
    question: 'What does "rekt" mean in degen slang?',
    choices: ['Suffered a major loss', 'Won a jackpot', 'Got a bonus round', 'Withdrew profits safely'],
    answer: 'Suffered a major loss',
    explanation: 'Rekt = wrecked. Used when someone loses a large portion of their bankroll.',
  },
  {
    id: 'dc-02', category: 'degen-culture', difficulty: 'easy',
    question: 'What is a "degen"?',
    choices: [
      'A high-risk, high-reward gambler or crypto trader',
      'A casino dealer',
      'A type of slot machine',
      'A regulatory body for online gambling',
    ],
    answer: 'A high-risk, high-reward gambler or crypto trader',
    explanation: 'Degen = degenerate (affectionate). Refers to high-risk-appetite players who embrace variance.',
  },
  {
    id: 'dc-03', category: 'degen-culture', difficulty: 'medium',
    question: 'What does "touch grass" mean in gaming and degen culture?',
    choices: [
      'A reminder to step away from screens and take a break',
      'A new slot game mechanic',
      'A crypto farming strategy',
      'A Discord bot command',
    ],
    answer: 'A reminder to step away from screens and take a break',
    explanation: 'Touch grass = go outside. Tells someone they\'ve been online too long. TiltCheck uses it for responsible gaming.',
  },
  {
    id: 'dc-04', category: 'degen-culture', difficulty: 'medium',
    question: 'What is a "whale" in gambling/crypto?',
    choices: [
      'A player with very large bankroll/holdings',
      'A player on a losing streak',
      'A casino bonus offer',
      'A high-volatility slot game',
    ],
    answer: 'A player with very large bankroll/holdings',
    explanation: 'Whales move markets and casino floors. Platforms often give them preferential treatment and custom limits.',
  },
  {
    id: 'dc-05', category: 'degen-culture', difficulty: 'easy',
    question: 'What does "GG" mean?',
    choices: ['Good Game', 'Get Going', 'Guaranteed Gains', 'Global Gold'],
    answer: 'Good Game',
    explanation: 'GG is said at the end of a match to acknowledge a good game, regardless of outcome.',
  },
  {
    id: 'dc-06', category: 'degen-culture', difficulty: 'medium',
    question: 'What is "ape-in" in degen culture?',
    choices: [
      'Buying/betting aggressively without doing research',
      'A careful strategy based on fundamentals',
      'A verified casino review process',
      'Withdrawing winnings immediately after a win',
    ],
    answer: 'Buying/betting aggressively without doing research',
    explanation: 'Aping in = going all in on impulse, often FOMO-driven. High risk, can result in huge wins or total loss.',
  },
  {
    id: 'dc-07', category: 'degen-culture', difficulty: 'hard',
    question: 'What is "FOMO" and how does it affect gambling behavior?',
    choices: [
      'Fear Of Missing Out — drives impulsive bets to chase perceived opportunities',
      'A slot game feature that activates during a losing streak',
      'A casino loyalty program incentive',
      'A crypto staking reward mechanism',
    ],
    answer: 'Fear Of Missing Out — drives impulsive bets to chase perceived opportunities',
    explanation: 'FOMO leads to chasing jackpots, late-session over-betting, and ignoring bankroll limits.',
  },
  {
    id: 'dc-08', category: 'degen-culture', difficulty: 'medium',
    question: 'What does "redeem to win" mean in TiltCheck philosophy?',
    choices: [
      'Cash out your winnings while you\'re ahead instead of risking them back',
      'Claim a welcome bonus before depositing',
      'Use bonus money to trigger a jackpot',
      'Withdraw and reinvest profits into a vault',
    ],
    answer: 'Cash out your winnings while you\'re ahead instead of risking them back',
    explanation: 'Redeem to Win is the TiltCheck core mission: redefine winning as securing profits, not maximizing playtime.',
  },
  {
    id: 'dc-09', category: 'degen-culture', difficulty: 'hard',
    question: 'What is a "shadow ban" in the casino context?',
    choices: [
      'An account restriction that silently limits bet sizes or winnings without notification',
      'A temporary deposit freeze for AML compliance',
      'A casino suspension for bonus abuse',
      'A Discord ban for spam',
    ],
    answer: 'An account restriction that silently limits bet sizes or winnings without notification',
    explanation: 'Shadow bans happen to winning players — casinos reduce limits or delay withdrawals without explaining why.',
  },
  {
    id: 'dc-10', category: 'degen-culture', difficulty: 'easy',
    question: 'What is a "LockVault" in TiltCheck?',
    choices: [
      'A time-locked vault that prevents spending winnings before a cooldown expires',
      'A hardware wallet for storing crypto',
      'A casino bonus code vault',
      'A two-factor authentication system',
    ],
    answer: 'A time-locked vault that prevents spending winnings before a cooldown expires',
    explanation: 'LockVault lets degens lock their winnings for a set period to prevent tilt-driven over-betting.',
  },
];

// ─── Type helpers ─────────────────────────────────────────────────────────────

interface PlayerState {
  userId: string;
  username: string;
  score: number;
  answers: Map<string, string>; // questionId → chosen answer
  eliminated: boolean;
  shieldUsed: boolean;
  buyBackUsed: boolean;
}

interface ActiveGame {
  gameId: string;
  settings: TriviaGameSettings;
  questions: StoredQuestion[];
  players: Map<string, PlayerState>;
  currentRound: number;
  roundTimerId: ReturnType<typeof setTimeout> | null;
  startedAt: number;
}

// ─── Manager state ────────────────────────────────────────────────────────────

let activeGame: ActiveGame | null = null;
let _clientId = '';
let _token = '';

// ─── Helper functions ─────────────────────────────────────────────────────────

function pickQuestions(category: string, count: number): StoredQuestion[] {
  const pool = category === 'general'
    ? QUESTION_BANK
    : QUESTION_BANK.filter(q => q.category === category);

  // Shuffle using Fisher-Yates
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function emitRoundStart(game: ActiveGame): void {
  if (game.currentRound >= game.questions.length) {
    endGameWithResults(game);
    return;
  }

  const q = game.questions[game.currentRound];
  const ROUND_DURATION_MS = 20_000; // 20 seconds per question

  eventRouter.publish(
    'trivia.round.start',
    'game-arena',
    {
      question: {
        id: q.id,
        question: q.question,
        choices: q.choices,
        category: q.category,
        theme: q.theme,
        difficulty: q.difficulty,
      },
      roundNumber: game.currentRound + 1,
      totalRounds: game.settings.totalRounds,
      endsAt: Date.now() + ROUND_DURATION_MS,
    }
  );

  game.roundTimerId = setTimeout(() => {
    revealRound(game);
  }, ROUND_DURATION_MS);
}

function revealRound(game: ActiveGame): void {
  const q = game.questions[game.currentRound];
  const stats: Record<string, { count: number; correct: boolean }> = {};

  for (const choice of q.choices) {
    stats[choice] = { count: 0, correct: choice === q.answer };
  }

  for (const player of game.players.values()) {
    if (player.eliminated) continue;
    const chosen = player.answers.get(q.id);
    if (chosen && stats[chosen]) {
      stats[chosen].count++;
    }

    if (chosen === q.answer) {
      player.score += 1;
    } else if (!player.shieldUsed) {
      player.eliminated = true;
    } else {
      player.shieldUsed = false; // Shield consumed
      eventRouter.publish(
        'trivia.player.reinstated',
        'game-arena',
        { gameId: game.gameId, userId: player.userId, username: player.username }
      );
    }
  }

  eventRouter.publish(
    'trivia.round.reveal',
    'game-arena',
    {
      questionId: q.id,
      correctChoice: q.answer,
      explanation: q.explanation,
      stats,
    }
  );

  game.currentRound++;

  // Advance to next round after reveal delay
  const REVEAL_DELAY_MS = 5_000;
  setTimeout(() => {
    if (!activeGame || activeGame.gameId !== game.gameId) return;
    emitRoundStart(game);
  }, REVEAL_DELAY_MS);
}

function endGameWithResults(game: ActiveGame): void {
  const sorted = [...game.players.values()]
    .filter(p => !p.eliminated || p.score > 0)
    .sort((a, b) => b.score - a.score);

  const winners = sorted.slice(0, 3).map((p, i) => ({
    userId: p.userId,
    username: p.username,
    score: p.score,
    rank: i + 1,
  }));

  const finalScores = sorted.map(p => ({
    userId: p.userId,
    username: p.username,
    score: p.score,
  }));

  eventRouter.publish(
    'trivia.completed',
    'game-arena',
    { gameId: game.gameId, winners, finalScores }
  );

  activeGame = null;
  console.log(`[TriviaManager] Game ${game.gameId} completed. Winner: ${winners[0]?.username ?? 'none'}`);
}

// ─── Public interface ─────────────────────────────────────────────────────────

export const triviaManager = {
  initializeShop: (clientId: string, token: string): void => {
    _clientId = clientId;
    _token = token;
    console.log('[TriviaManager] Shop initialized');
  },

  scheduleGame: async (options: Partial<TriviaGameSettings> & { totalRounds?: number }): Promise<{ success: boolean; message: string }> => {
    if (activeGame) {
      return { success: false, message: 'A trivia game is already in progress.' };
    }

    const settings: TriviaGameSettings = {
      startTime: options.startTime ?? Date.now() + 5_000,
      category: options.category ?? 'general',
      theme: options.theme ?? 'Random Degen Knowledge',
      totalRounds: options.totalRounds ?? 12,
      prizePool: options.prizePool ?? 0,
    };

    const gameId = uuidv4();
    const questions = pickQuestions(settings.category, settings.totalRounds);

    if (questions.length === 0) {
      return { success: false, message: `No questions available for category: ${settings.category}` };
    }

    activeGame = {
      gameId,
      settings,
      questions,
      players: new Map(),
      currentRound: 0,
      roundTimerId: null,
      startedAt: settings.startTime,
    };

    eventRouter.publish(
      'trivia.started',
      'game-arena',
      { gameId, ...settings }
    );

    console.log(`[TriviaManager] Game ${gameId} starting in ${settings.startTime - Date.now()}ms | ${questions.length} rounds | category: ${settings.category}`);

    // Delay start
    setTimeout(() => {
      if (activeGame?.gameId === gameId) {
        emitRoundStart(activeGame);
      }
    }, Math.max(0, settings.startTime - Date.now()));

    return { success: true, message: `Trivia game scheduled. Starting soon with ${questions.length} rounds.` };
  },

  endGame: (): void => {
    if (activeGame?.roundTimerId) clearTimeout(activeGame.roundTimerId);
    activeGame = null;
    console.log('[TriviaManager] Game forcibly ended');
  },

  isActive: (): boolean => activeGame !== null,

  submitAnswer: (userId: string, answer: string): void => {
    if (!activeGame) return;
    const q = activeGame.questions[activeGame.currentRound];
    if (!q) return;

    const player = activeGame.players.get(userId);
    if (!player || player.eliminated) return;
    if (player.answers.has(q.id)) return; // Already answered

    player.answers.set(q.id, answer);
  },

  joinGame: (userId: string, username: string): { success: boolean; message: string } => {
    if (!activeGame) return { success: false, message: 'No game in progress.' };
    if (activeGame.players.has(userId)) return { success: true, message: 'Already in game.' };
    activeGame.players.set(userId, {
      userId, username, score: 0,
      answers: new Map(), eliminated: false,
      shieldUsed: false, buyBackUsed: false,
    });
    return { success: true, message: `Joined game ${activeGame.gameId}` };
  },

  requestApeIn: async (userId: string): Promise<{ success: boolean; message: string; stats?: Record<string, number> }> => {
    if (!activeGame) return { success: false, message: 'No game in progress.' };
    const q = activeGame.questions[activeGame.currentRound];
    if (!q) return { success: false, message: 'No active round.' };

    // Ape In: reveals vote distribution (counts per choice) to help the player
    const stats: Record<string, number> = {};
    for (const choice of q.choices) {
      stats[choice] = 0;
    }
    for (const player of activeGame.players.values()) {
      const chosen = player.answers.get(q.id);
      if (chosen && stats[chosen] !== undefined) {
        stats[chosen]++;
      }
    }
    return { success: true, message: 'Ape In stats retrieved.', stats };
  },

  requestShield: async (userId: string): Promise<{ success: boolean; message: string; eliminated?: string[] }> => {
    if (!activeGame) return { success: false, message: 'No game in progress.' };
    const player = activeGame.players.get(userId);
    if (!player) return { success: false, message: 'Not in current game.' };
    if (player.shieldUsed) return { success: false, message: 'Shield already used.' };

    player.shieldUsed = true;
    const eliminated = [...activeGame.players.values()]
      .filter(p => p.eliminated)
      .map(p => p.userId);

    return { success: true, message: 'Shield activated — you are protected for this round.', eliminated };
  },

  processBuyBack: async (userId: string): Promise<{ success: boolean; message: string }> => {
    if (!activeGame) return { success: false, message: 'No game in progress.' };
    const player = activeGame.players.get(userId);
    if (!player) return { success: false, message: 'Not in current game.' };
    if (!player.eliminated) return { success: false, message: 'You are not eliminated.' };
    if (player.buyBackUsed) return { success: false, message: 'Buy-back already used.' };

    player.eliminated = false;
    player.buyBackUsed = true;

    eventRouter.publish(
      'trivia.player.reinstated',
      'game-arena',
      { gameId: activeGame.gameId, userId: player.userId, username: player.username }
    );

    return { success: true, message: 'Buy-back processed. You are back in the game.' };
  },
};
