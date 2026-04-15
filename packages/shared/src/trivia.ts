// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-15

export type TriviaAnswerKey = 'A' | 'B' | 'C' | 'D';
export type SharedTriviaTopic = 'casino' | 'crypto' | 'degen' | 'gambling_math' | 'strategy';

export interface SharedTriviaQuestion {
  id: string;
  topic: SharedTriviaTopic;
  text: string;
  choices: Record<TriviaAnswerKey, string>;
  answer: TriviaAnswerKey;
  explanation: string;
}

type RawSharedTriviaQuestion = Omit<SharedTriviaQuestion, 'id' | 'topic'>;

const RAW_TRIVIA_QUESTION_BANK: Record<SharedTriviaTopic, RawSharedTriviaQuestion[]> = {
  casino: [
    {
      text: 'What does RTP stand for?',
      choices: { A: 'Return to Player', B: 'Risk Transfer Protocol', C: 'Random Testing Protocol', D: 'Revenue to Platform' },
      answer: 'A',
      explanation: 'RTP (Return to Player) is the percentage of wagered money a slot pays back over time.',
    },
    {
      text: 'What is the house edge on a standard European roulette wheel?',
      choices: { A: '5.26%', B: '1%', C: '2.70%', D: '0%' },
      answer: 'C',
      explanation: 'European roulette has a single zero, giving the house a 2.70% edge. American roulette (double zero) is 5.26%.',
    },
    {
      text: 'Which casino game typically has the lowest house edge with optimal play?',
      choices: { A: 'Slots', B: 'Blackjack (basic strategy)', C: 'Keno', D: 'Big Six Wheel' },
      answer: 'B',
      explanation: 'Blackjack with perfect basic strategy can reduce the house edge to under 0.5%.',
    },
    {
      text: 'What does "wagering requirement" mean for a casino bonus?',
      choices: {
        A: 'You must wager the bonus x the multiplier before withdrawing',
        B: 'The minimum deposit required',
        C: 'A loyalty points multiplier',
        D: 'A casino license requirement',
      },
      answer: 'A',
      explanation: 'e.g. a 30x wagering requirement on a $100 bonus means $3,000 must be wagered before withdrawal.',
    },
    {
      text: 'What is "provably fair" in crypto casinos?',
      choices: {
        A: 'Games audited by a third party once per year',
        B: 'Cryptographic proof that each game result was not manipulated',
        C: 'A government certification',
        D: 'A marketing term with no standard meaning',
      },
      answer: 'B',
      explanation: 'Provably fair uses hashing and seeds so players can independently verify each outcome.',
    },
    {
      text: 'In Blackjack, what is "basic strategy"?',
      choices: {
        A: 'Always hitting on soft hands',
        B: 'Mathematically optimal play for every hand combination',
        C: 'Betting the same amount every round',
        D: 'Splitting aces whenever possible',
      },
      answer: 'B',
      explanation: 'Basic strategy charts map every hand/dealer combination to the statistically best move.',
    },
    {
      text: 'What does "variance" describe in gambling?',
      choices: {
        A: "The casino's profit margin",
        B: 'How spread out outcomes are around the expected value',
        C: 'A mathematical formula for RTP',
        D: 'A bonus type offered by casinos',
      },
      answer: 'B',
      explanation: 'High variance = infrequent big wins. Low variance = frequent small wins. Both can share the same RTP.',
    },
    {
      text: 'What is a "comp" in casino terminology?',
      choices: {
        A: 'A casino employee',
        B: 'The final hand in Baccarat',
        C: 'Free perks given to loyal/high-volume players',
        D: 'A game completion bonus',
      },
      answer: 'C',
      explanation: 'Comps (complimentaries) include free hotel stays, meals, credits — standard tools to retain big players.',
    },
  ],
  crypto: [
    {
      text: 'What is a "gas fee" on Ethereum?',
      choices: {
        A: 'Fee paid to validators to process a transaction',
        B: 'Monthly platform subscription fee',
        C: 'Exchange withdrawal fee',
        D: 'Tax on crypto earnings',
      },
      answer: 'A',
      explanation: 'Gas fees compensate validators for the computation required to execute transactions.',
    },
    {
      text: '"HODL" originated as what?',
      choices: {
        A: 'Acronym for Hold On for Dear Life',
        B: 'A famous typo of "hold" in a 2013 BitcoinTalk post',
        C: 'A Dutch trading strategy',
        D: 'Short for "hodling asset"',
      },
      answer: 'B',
      explanation: 'User "GameKyuubi" posted "I AM HODLING" while drunk in 2013. The typo became crypto gospel.',
    },
    {
      text: 'What is a "rug pull" in crypto?',
      choices: {
        A: 'A protocol upgrade that removes staking liquidity',
        B: 'Developers abandoning a project and stealing investor funds',
        C: 'Reducing the circulating supply of a token',
        D: 'A bearish technical pattern',
      },
      answer: 'B',
      explanation: 'Devs hype a project, collect funds, then drain the liquidity and disappear.',
    },
    {
      text: 'What does "DeFi" stand for?',
      choices: { A: 'Decentralized Finance', B: 'Digital Financial Infrastructure', C: 'Derivative Finance Index', D: 'Distributed Fiat Integration' },
      answer: 'A',
      explanation: 'DeFi uses smart contracts to recreate financial instruments without centralized intermediaries.',
    },
    {
      text: 'What is the maximum supply of Bitcoin?',
      choices: { A: '100 million BTC', B: '21 million BTC', C: '42 million BTC', D: 'Unlimited' },
      answer: 'B',
      explanation: '21 million BTC is hard-coded in the Bitcoin protocol. The last one will be mined around 2140.',
    },
    {
      text: 'What is "slippage" in a DEX trade?',
      choices: {
        A: 'A trade execution delay',
        B: 'The difference between expected and actual trade price',
        C: 'Transaction fee percentage',
        D: 'Token price movement in 24h',
      },
      answer: 'B',
      explanation: 'Low liquidity causes your large order to move the price against you before it fills.',
    },
    {
      text: 'What does APY stand for in DeFi?',
      choices: { A: 'Annual Percentage Yield', B: 'Automated Protocol Yield', C: 'Asset Price Yield', D: 'Annual Protocol Yield' },
      answer: 'A',
      explanation: 'APY accounts for compound interest. APR does not. In DeFi, APY is usually the headline number.',
    },
    {
      text: 'What is a "smart contract"?',
      choices: {
        A: 'A legal agreement between two crypto traders',
        B: 'Self-executing code stored on a blockchain',
        C: 'A premium trading API feature',
        D: 'An NFT licensing agreement',
      },
      answer: 'B',
      explanation: 'Smart contracts execute automatically when conditions are met — no intermediary needed.',
    },
  ],
  degen: [
    {
      text: 'What does "NFA" mean in degen circles?',
      choices: { A: 'Non-Fungible Asset', B: 'Not Financial Advice', C: 'No Fee Applicable', D: 'Network Fee Alert' },
      answer: 'B',
      explanation: 'NFA is the standard disclaimer before someone gives you financial advice anyway.',
    },
    {
      text: 'What is "aping in"?',
      choices: {
        A: "Copying a successful trader's entire portfolio",
        B: 'Buying into a project without doing research',
        C: 'A DCA strategy for volatile assets',
        D: 'Shorting a project on margin',
      },
      answer: 'B',
      explanation: 'Aping in = all-in, no research, vibes-based entry. Sometimes it works. Often it does not.',
    },
    {
      text: 'What does "NGMI" mean?',
      choices: { A: 'Not Gonna Make It', B: 'Next Generation Market Index', C: 'No Gas Market Index', D: 'New Global Market Infrastructure' },
      answer: 'A',
      explanation: '"NGMI" is used when someone makes a choice that guarantees they will not survive the next bull run.',
    },
    {
      text: 'What does "paper hands" mean?',
      choices: {
        A: 'A trader who uses high leverage',
        B: 'Someone who sells at the first sign of trouble',
        C: 'A printing error in a smart contract',
        D: 'Low-volume passive trading',
      },
      answer: 'B',
      explanation: 'Opposite of "diamond hands." Paper hands fold early and miss the pump.',
    },
    {
      text: 'What does "down bad" mean?',
      choices: {
        A: 'Deep in a losing streak with no way out',
        B: 'A technical bearish market signal',
        C: 'A specific degen trading strategy',
        D: 'Out of ETH for gas fees',
      },
      answer: 'A',
      explanation: 'Down bad = emotionally and financially devastated. Used broadly in gambling and crypto.',
    },
    {
      text: 'What is "floor price" in the NFT space?',
      choices: {
        A: 'The highest price an NFT in a collection sold for',
        B: 'The lowest listed asking price in a collection',
        C: 'The creator royalty percentage',
        D: 'The original mint price',
      },
      answer: 'B',
      explanation: 'Floor price is the cheapest you can buy into a collection right now. Watched obsessively by degens.',
    },
    {
      text: 'What does "degen" actually mean in this context?',
      choices: {
        A: 'A type of token standard',
        B: 'Someone who makes high-risk bets with no conventional strategy',
        C: 'A DeFi yield protocol',
        D: 'A Discord moderation role',
      },
      answer: 'B',
      explanation: 'Short for "degenerate gambler." In crypto/gambling culture it is worn as a badge of honor.',
    },
    {
      text: 'What is a "pump and dump"?',
      choices: {
        A: 'A liquidity mining strategy',
        B: 'Artificially inflating an asset price then selling at the peak',
        C: 'A stablecoin depeg event',
        D: 'A legitimate market-making technique',
      },
      answer: 'B',
      explanation: 'Coordinated buying creates FOMO, latecomers buy the top, organizers dump on them.',
    },
  ],
  gambling_math: [
    {
      text: 'A fair coin lands heads 10 times in a row. What is the probability of heads on flip 11?',
      choices: { A: 'Less than 50%', B: 'Exactly 50%', C: 'More than 50%', D: 'Cannot be calculated' },
      answer: 'B',
      explanation: 'Each flip is independent. Past results do not change future probabilities.',
    },
    {
      text: 'What is the "gambler\'s fallacy"?',
      choices: {
        A: 'Believing past independent events influence future ones',
        B: 'Underestimating the compounding house edge',
        C: 'Overbetting relative to bankroll',
        D: 'Confusing EV with variance',
      },
      answer: 'A',
      explanation: '"Red hit 8 times — black is due." It is not. Independent events have no memory.',
    },
    {
      text: 'If a slot has 95% RTP, what is the house edge?',
      choices: { A: '95%', B: '5%', C: '0.95%', D: '0.05%' },
      answer: 'B',
      explanation: 'House edge = 100% - RTP. A 95% RTP machine keeps 5 cents of every dollar wagered.',
    },
    {
      text: 'What is the Kelly Criterion used for?',
      choices: {
        A: 'Calculating optimal bet size to maximize long-term growth',
        B: 'Determining when to stop gambling for the day',
        C: 'Predicting slot machine payout sequences',
        D: 'Calculating progressive jackpot odds',
      },
      answer: 'A',
      explanation: 'Kelly tells you what fraction of your bankroll to bet given your edge and odds.',
    },
    {
      text: 'If a game has negative expected value (-EV), what does that mean?',
      choices: {
        A: 'The player has an edge over the house',
        B: 'On average, the player loses money over time',
        C: 'The game is rigged and illegal',
        D: 'Volatility is unusually high',
      },
      answer: 'B',
      explanation: 'Nearly all casino games are -EV. The house edge ensures the casino wins in the long run.',
    },
    {
      text: 'What does standard deviation measure in a gambling context?',
      choices: {
        A: 'Average win amount per session',
        B: 'Spread of outcomes around the mean',
        C: 'The compounded house edge over time',
        D: 'Number of rounds needed to reach EV',
      },
      answer: 'B',
      explanation: 'High SD = wilder swings. Low SD = more consistent results. Both can have the same EV.',
    },
    {
      text: 'In poker, what are "pot odds"?',
      choices: {
        A: 'Ratio of the current pot size to the cost of a call',
        B: 'Probability of hitting your draw card',
        C: 'Expected value of a specific bet',
        D: 'The house rake as a percentage',
      },
      answer: 'A',
      explanation: 'If the pot is $100 and you need to call $25, your pot odds are 4:1.',
    },
    {
      text: 'What does "variance" mean for a high-RTP slot vs a low-RTP slot?',
      choices: {
        A: 'RTP and variance are the same measurement',
        B: 'RTP measures long-run return; variance measures swing intensity — they are independent',
        C: 'High RTP always means low variance',
        D: 'Low variance always means high RTP',
      },
      answer: 'B',
      explanation: 'A 96% RTP slot can be brutal in the short run if it is high variance. RTP and variance are separate axes.',
    },
  ],
  strategy: [
    {
      text: 'What is the Martingale strategy?',
      choices: {
        A: 'Flat betting the same amount every round',
        B: 'Doubling your bet after every loss',
        C: 'Only betting when you have a proven edge',
        D: 'Increasing bets after every win',
      },
      answer: 'B',
      explanation: 'Martingale: double after loss until you recover. Works in theory; table limits and bankroll limits kill it in practice.',
    },
    {
      text: 'Why does the Martingale strategy fail in real play?',
      choices: {
        A: 'It requires perfect timing to execute',
        B: 'Table limits and finite bankrolls prevent infinite doubling',
        C: 'All casinos ban it explicitly',
        D: 'It only works in poker, not slots or roulette',
      },
      answer: 'B',
      explanation: 'A 10-loss streak requires betting 512x your original stake. Table max and bankroll always impose a ceiling.',
    },
    {
      text: 'What does "bankroll management" mean?',
      choices: {
        A: 'Depositing funds across multiple casinos',
        B: 'Allocating gambling funds to manage risk and session length',
        C: 'The casino accounting system for player funds',
        D: 'Tracking bonus wagering progress',
      },
      answer: 'B',
      explanation: 'Good bankroll management defines session limits, max bet size, and stop-loss thresholds before you play.',
    },
    {
      text: 'What is "loss chasing"?',
      choices: {
        A: 'A profitable short-term recovery strategy',
        B: 'Increasing bets after losses to try to recover',
        C: 'Placing bets on losing outcomes to hedge',
        D: 'A slot bonus feature',
      },
      answer: 'B',
      explanation: 'Loss chasing is one of the clearest indicators of problem gambling and is what TiltCheck is built to detect.',
    },
    {
      text: 'What does "setting a stop-loss" mean?',
      choices: {
        A: 'Stopping only after landing a big win',
        B: 'Predetermining the maximum loss before you quit the session',
        C: 'A specific poker betting strategy',
        D: 'Blocking yourself from a casino site',
      },
      answer: 'B',
      explanation: 'Stop-loss is a pre-commitment tool. Set it before the session, honor it during.',
    },
    {
      text: 'What is "tilt" in gambling and trading?',
      choices: {
        A: 'A profitable emotional edge state',
        B: 'A cognitive/emotional state causing irrational decisions due to frustration or excitement',
        C: 'A physical slot machine malfunction',
        D: 'A bonus activation trigger',
      },
      answer: 'B',
      explanation: 'Tilt costs players more money than the house edge. Recognizing it is the first step to beating it.',
    },
    {
      text: 'Why is card counting in Blackjack effective?',
      choices: {
        A: 'It trains your memory to recognize card patterns',
        B: 'It tracks the high-to-low card ratio to adjust bet sizes accordingly',
        C: 'It predicts the exact next card to be dealt',
        D: 'It guarantees a win on every hand',
      },
      answer: 'B',
      explanation: 'When the deck is rich in 10s and aces, the player has an edge. Card counting identifies that window.',
    },
    {
      text: 'What is the main purpose of TiltCheck?',
      choices: {
        A: 'To maximize total casino profits',
        B: 'To help degens recognize tilt, secure profits, and gamble more responsibly',
        C: 'To predict winning numbers and game outcomes',
        D: 'To find the highest RTP slots across all casinos',
      },
      answer: 'B',
      explanation: 'Redeem to Win. TiltCheck is the edge equalizer built by degens, for degens.',
    },
  ],
};

export const SHARED_TRIVIA_TOPICS = Object.keys(RAW_TRIVIA_QUESTION_BANK) as SharedTriviaTopic[];

export const TRIVIA_QUESTION_BANK: Record<SharedTriviaTopic, SharedTriviaQuestion[]> = Object.fromEntries(
  SHARED_TRIVIA_TOPICS.map((topic) => [
    topic,
    RAW_TRIVIA_QUESTION_BANK[topic].map((question, index) => ({
      id: `${topic}-${index + 1}`,
      topic,
      ...question,
    })),
  ]),
) as Record<SharedTriviaTopic, SharedTriviaQuestion[]>;

