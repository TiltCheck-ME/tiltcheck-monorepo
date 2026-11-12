// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Trivia question bank. Static, hand-written, no AI generation at runtime.
// Sources:
//   arena    = packages/shared/src/trivia.ts (the bank apps/game-arena/src/trivia-manager.ts and the
//              apps/web/src/lib/touch-grass practice deck both draw from), reworded for this guard.
//   tlive    = jmenichole/trivia.live starter question set (supabase SQL, free-play-mvp), 3-choice items given a 4th choice.
//   tg       = written for Touch Grass: general knowledge plus gambling literacy (odds, house edge, lore).
// archive/apps/degens-activity trivia had no local bank (it rendered questions sent by the arena server).
// Every item must pass the money-words guard in tests/no-money.test.ts.

export type TriviaCategory = 'odds' | 'lore' | 'crypto' | 'degen' | 'general' | 'pop';
export type TriviaSource = 'arena' | 'tlive' | 'tg';

export interface TriviaQuestion {
  id: string;
  cat: TriviaCategory;
  src: TriviaSource;
  q: string;
  choices: readonly [string, string, string, string];
  /** Index into choices of the correct answer. Server-only until the reveal. */
  answer: 0 | 1 | 2 | 3;
}

type Row = [TriviaCategory, TriviaSource, string, [string, string, string, string], 0 | 1 | 2 | 3];

const ROWS: Row[] = [
  // ---- arena (shared bank) ----
  ['odds', 'arena', 'What does RTP stand for?', ['Return to Player', 'Risk Transfer Protocol', 'Random Testing Protocol', 'Revenue to Platform'], 0],
  ['odds', 'arena', 'What is the house edge on a single-zero (European) roulette wheel?', ['5.26%', '1%', '2.70%', '0%'], 2],
  ['odds', 'arena', 'Which table game usually has the lowest house edge when you play perfect basic strategy?', ['Slots', 'Blackjack', 'Keno', 'Big Six wheel'], 1],
  ['odds', 'arena', 'What does "provably fair" mean for an online game?', ['It gets audited once a year', 'Hashes and seeds let you verify each result yourself', 'A government stamp of approval', 'Nothing, it is just a slogan'], 1],
  ['odds', 'arena', 'In blackjack, "basic strategy" is...', ['Always hitting soft hands', 'The math-optimal play for every hand against every dealer card', 'Betting the same every hand', 'Splitting aces only'], 1],
  ['odds', 'arena', 'In gambling math, "variance" describes...', ["The house's profit margin", 'How spread out results are around the expected value', 'The formula for RTP', 'A type of bonus'], 1],
  ['lore', 'arena', 'In Vegas slang, a "comp" is...', ['A dealer', 'The last hand in baccarat', 'Free perks handed to high-volume players', 'A completion bonus'], 2],
  ['crypto', 'arena', 'What is a "gas fee" on Ethereum?', ['A fee paid to validators to process a transaction', 'A monthly platform subscription', 'An exchange withdrawal fee', 'A tax on crypto gains'], 0],
  ['crypto', 'arena', '"HODL" started as what?', ['An acronym for Hold On for Dear Life', 'A typo of "hold" in a 2013 BitcoinTalk post', 'A Dutch trading strategy', 'Short for "hodling asset"'], 1],
  ['crypto', 'arena', 'What is a "rug pull"?', ['A protocol upgrade', 'Devs draining the funds and vanishing', 'Cutting a token supply', 'A bearish chart pattern'], 1],
  ['crypto', 'arena', 'What does "DeFi" stand for?', ['Decentralized Finance', 'Digital Financial Infrastructure', 'Derivative Finance Index', 'Distributed Fiat Integration'], 0],
  ['crypto', 'arena', 'What is the maximum supply of Bitcoin?', ['100 million', '21 million', '42 million', 'Unlimited'], 1],
  ['crypto', 'arena', 'What is "slippage" on a DEX trade?', ['A delay before the trade runs', 'The gap between the expected price and the price you actually got', 'The fee percentage', 'The 24h price move'], 1],
  ['crypto', 'arena', 'What does APY stand for?', ['Annual Percentage Yield', 'Automated Protocol Yield', 'Asset Price Yield', 'Annual Protocol Yield'], 0],
  ['crypto', 'arena', 'What is a "smart contract"?', ['A legal agreement between two traders', 'Self-executing code stored on a blockchain', 'A premium API feature', 'An NFT license'], 1],
  ['degen', 'arena', 'What does "NFA" mean in degen chat?', ['Non-Fungible Asset', 'Not Financial Advice', 'No Fee Applicable', 'Network Fee Alert'], 1],
  ['degen', 'arena', 'What is "aping in"?', ["Copying a trader's whole portfolio", 'Jumping in with zero research', 'Dollar-cost averaging', 'Shorting on margin'], 1],
  ['degen', 'arena', 'What does "NGMI" mean?', ['Not Gonna Make It', 'Next Generation Market Index', 'No Gas Market Index', 'New Global Market Infrastructure'], 0],
  ['degen', 'arena', 'What does "paper hands" mean?', ['Someone using high leverage', 'Someone who sells at the first sign of trouble', 'A smart contract typo', 'Low-volume trading'], 1],
  ['degen', 'arena', 'In NFT land, "floor price" is...', ['The highest sale in a collection', 'The lowest listed ask in a collection', 'The creator royalty', 'The original mint price'], 1],
  ['degen', 'arena', 'What is a "pump and dump"?', ['A liquidity mining strategy', 'Hyping a price up, then selling into the hype', 'A stablecoin depeg', 'Legit market making'], 1],
  ['odds', 'arena', 'A fair coin lands heads 10 times in a row. Chance of heads on flip 11?', ['Less than 50%', 'Exactly 50%', 'More than 50%', 'Cannot be calculated'], 1],
  ['odds', 'arena', 'What is the "gambler\'s fallacy"?', ['Believing past independent results change the next one', 'Underestimating the house edge', 'Betting too big for your bankroll', 'Mixing up EV and variance'], 0],
  ['odds', 'arena', 'A slot lists 95% RTP. What is the house edge?', ['95%', '5%', '0.95%', '0.05%'], 1],
  ['odds', 'arena', 'What is the Kelly Criterion for?', ['Sizing bets to maximize long-run growth when you have an edge', 'Deciding when to stop for the day', 'Predicting slot sequences', 'Lottery odds'], 0],
  ['odds', 'arena', 'A game is negative EV (-EV). What does that mean?', ['The player has the edge', 'On average you lose over time', 'The game is rigged', 'Volatility is high'], 1],
  ['odds', 'arena', 'In poker, "pot odds" compare...', ['The pot size to the cost of a call', 'Your odds of hitting a draw', 'The EV of one bet', 'The rake percentage'], 0],
  ['odds', 'arena', 'What is the Martingale system?', ['Flat betting', 'Doubling your bet after every loss', 'Only betting with an edge', 'Raising after every win'], 1],
  ['odds', 'arena', 'Why does Martingale blow up in real play?', ['It needs perfect timing', 'Table limits and finite bankrolls stop the doubling', 'It is banned everywhere', 'It only works in poker'], 1],
  ['degen', 'arena', 'What is "loss chasing"?', ['A solid recovery strategy', 'Raising bets to win back what you lost', 'Hedging', 'A slot bonus feature'], 1],
  ['degen', 'arena', 'What is "tilt"?', ['A hot streak edge', 'Frustration taking over your decisions', 'A machine malfunction', 'A bonus trigger'], 1],
  ['odds', 'arena', 'Why can card counting give a blackjack player an edge?', ['It trains memory', 'It tracks the ratio of high to low cards left so bets can be sized', 'It predicts the exact next card', 'It wins every hand'], 1],
  ['odds', 'arena', 'How do RTP and variance relate?', ['Same thing', 'Independent: RTP is long-run return, variance is how hard it swings', 'High RTP always means low variance', 'Low variance always means high RTP'], 1],

  // ---- trivia.live starter set ----
  ['pop', 'tlive', 'Which film won Best Picture at the 1995 Oscars (the 1994 film year)?', ['Pulp Fiction', 'Forrest Gump', 'The Shawshank Redemption', 'Quiz Show'], 1],
  ['general', 'tlive', 'How many players does one soccer team have on the field during play?', ['9', '10', '11', '12'], 2],
  ['general', 'tlive', 'Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Mercury'], 1],
  ['general', 'tlive', 'Who painted the Mona Lisa?', ['Vincent van Gogh', 'Leonardo da Vinci', 'Michelangelo', 'Raphael'], 1],
  ['pop', 'tlive', 'Which TV series is set around the coffee shop Central Perk?', ['Seinfeld', 'Friends', 'How I Met Your Mother', 'Frasier'], 1],
  ['general', 'tlive', 'What is the chemical symbol for gold?', ['Go', 'Gd', 'Au', 'Ag'], 2],
  ['pop', 'tlive', "Which artist released the album '1989'?", ['Adele', 'Taylor Swift', 'Beyoncé', 'Katy Perry'], 1],
  ['general', 'tlive', 'In what year did World War II end?', ['1943', '1944', '1945', '1947'], 2],
  ['pop', 'tlive', 'Which company created Mario?', ['Sega', 'Nintendo', 'Sony', 'Atari'], 1],
  ['general', 'tlive', 'What is the capital of Australia?', ['Sydney', 'Melbourne', 'Canberra', 'Perth'], 2],
  ['pop', 'tlive', "Who directed 'Jurassic Park' (1993)?", ['James Cameron', 'Steven Spielberg', 'George Lucas', 'Ridley Scott'], 1],

  // ---- tg: odds and house edge ----
  ['odds', 'tg', 'What is the house edge on a double-zero (American) roulette wheel?', ['2.70%', '5.26%', '7.89%', '1.06%'], 1],
  ['odds', 'tg', 'How many pockets does an American roulette wheel have?', ['36', '37', '38', '40'], 2],
  ['odds', 'tg', 'Odds of a single number hitting on one spin of a single-zero wheel?', ['1 in 35', '1 in 36', '1 in 37', '1 in 38'], 2],
  ['odds', 'tg', 'What does a straight-up single-number bet in roulette pay?', ['17 to 1', '35 to 1', '36 to 1', '50 to 1'], 1],
  ['odds', 'tg', 'What color is the 0 pocket on a roulette wheel?', ['Red', 'Black', 'Green', 'White'], 2],
  ['odds', 'tg', 'The numbers 1 to 36 on a roulette wheel add up to what?', ['333', '666', '777', '999'], 1],
  ['odds', 'tg', 'Chance of rolling a total of 7 with two dice?', ['1 in 6', '1 in 12', '1 in 36', '1 in 8'], 0],
  ['odds', 'tg', 'What is the most likely total when you roll two six-sided dice?', ['6', '7', '8', '12'], 1],
  ['odds', 'tg', 'How many different outcomes are there when you roll two six-sided dice?', ['12', '21', '36', '64'], 2],
  ['odds', 'tg', 'Chance of drawing an ace from a full 52-card deck?', ['1 in 4', '1 in 13', '1 in 52', '1 in 26'], 1],
  ['odds', 'tg', 'A natural blackjack traditionally pays at what odds?', ['1 to 1', '6 to 5', '3 to 2', '2 to 1'], 2],
  ['odds', 'tg', 'In baccarat, which main bet has the lowest house edge?', ['Tie', 'Player', 'Banker', 'All the same'], 2],
  ['odds', 'tg', 'If the odds are 3 to 1 against something, what is its probability?', ['25%', '33%', '75%', '30%'], 0],
  ['odds', 'tg', 'At +200 American odds, a winning 1-unit bet profits how much?', ['0.5 units', '1 unit', '2 units', '3 units'], 2],
  ['odds', 'tg', 'A sportsbook line of -110 means...', ['Risk 110 to win 100', 'Risk 100 to win 110', 'A 110% chance', 'Even money'], 0],
  ['odds', 'tg', 'The "vig" or "juice" at a sportsbook is...', ["The book's built-in cut", 'One leg of a parlay', 'A live bet', 'A bonus'], 0],
  ['odds', 'tg', 'A parlay only wins if...', ['Any leg wins', 'Most legs win', 'Every leg wins', 'The first leg wins'], 2],
  ['odds', 'tg', 'Keno is known for having...', ['The lowest house edge on the floor', 'One of the highest house edges on the floor', 'No house edge', 'A player edge'], 1],
  ['odds', 'tg', 'The law of large numbers says that over many trials...', ['Results drift toward the expected value', 'Big bets win more often', 'Streaks must even out right away', 'Big numbers hit more'], 0],
  ['odds', 'tg', 'Thinking a slot is "due" after a dry spell is an example of...', ["The gambler's fallacy", 'The Kelly Criterion', 'Basic strategy', 'Arbitrage'], 0],
  ['odds', 'tg', 'What does "EV" stand for?', ['Expected value', 'Even volume', 'Extra value', 'Edge variance'], 0],
  ['odds', 'tg', 'An even-money bet on a fair coin flip has what expected value?', ['Positive', 'Zero', 'Negative', 'Depends on the last flip'], 1],
  ['odds', 'tg', 'A slot shows 97% RTP. Over the very long run that means...', ['You win 97% of spins', 'About 97 of every 100 wagered comes back on average', 'A guaranteed profit', '3% of players win'], 1],
  ['odds', 'tg', '"The house always wins" mostly comes down to...', ['Luck', 'The edge built into the odds', 'Rigged dealers', 'Taxes'], 1],
  ['odds', 'tg', 'In craps, the first roll of a new round is the...', ['Come-out roll', 'Point roll', 'Hard way', 'Field roll'], 0],
  ['odds', 'tg', 'In dice slang, "snake eyes" is...', ['Two sixes', 'Two ones', 'A one and a six', 'Any 7'], 1],
  ['odds', 'tg', "In Texas Hold'em, how many face-down cards does each player get?", ['1', '2', '3', '5'], 1],
  ['odds', 'tg', 'What is the best possible poker hand?', ['Four of a kind', 'Straight flush', 'Royal flush', 'Full house'], 2],
  ['odds', 'tg', 'Which poker hand beats a flush?', ['Straight', 'Three of a kind', 'Full house', 'Two pair'], 2],
  ['odds', 'tg', 'In poker, "the rake" is...', ['The cut the house takes from each pot', 'A forced bet', 'A bluff', 'The last community card'], 0],
  ['odds', 'tg', "In Hold'em, the fifth and last community card is called the...", ['Flop', 'Turn', 'River', 'Burn'], 2],
  ['degen', 'tg', 'In gambling slang, a "whale" is...', ['A rookie', 'A very high-stakes player', 'A dealer', 'A cheater'], 1],
  ['degen', 'tg', 'What does "FOMO" stand for?', ['Fear Of Missing Out', 'Fear Of Market Orders', 'Find Other Money Options', 'Fully Online Market Order'], 0],
  ['degen', 'tg', 'What does "WAGMI" stand for?', ["We're All Gonna Make It", 'We Are Getting More Interest', 'Wait And Grab More Ink', 'Win And Go Make It'], 0],
  ['degen', 'tg', 'What does "diamond hands" mean?', ['Holding through big swings', 'Selling at the first dip', 'Trading only blue chips', 'Using max leverage'], 0],

  // ---- tg: lore ----
  ['lore', 'tg', "Who wrote 'Beat the Dealer' (1962), the book that made card counting famous?", ['Edward Thorp', 'Ken Uston', 'Stanford Wong', 'Claude Shannon'], 0],
  ['lore', 'tg', 'Which 2008 movie was inspired by the MIT Blackjack Team?', ['Rounders', '21', "Molly's Game", 'The Cooler'], 1],
  ['lore', 'tg', 'Macau is a special administrative region of which country?', ['Japan', 'China', 'Portugal', 'Singapore'], 1],
  ['lore', 'tg', 'Monte Carlo is in which country?', ['France', 'Italy', 'Monaco', 'Spain'], 2],
  ['lore', 'tg', 'In 1913 at Monte Carlo, roulette famously landed on black how many times in a row?', ['10', '18', '26', '33'], 2],
  ['lore', 'tg', 'Which resort, opened in 1941, was the first on the Las Vegas Strip?', ['The Flamingo', 'El Rancho Vegas', 'The Sands', "Caesars Palace"], 1],
  ['lore', 'tg', 'Gangster Bugsy Siegel is tied to which Vegas resort, opened in 1946?', ['The Flamingo', 'The Sands', 'The Dunes', 'The Mirage'], 0],
  ['lore', 'tg', 'Las Vegas is in which US state?', ['Arizona', 'California', 'Nevada', 'Utah'], 2],
  ['lore', 'tg', 'Nevada legalized wide-open gambling in which year?', ['1910', '1931', '1955', '1978'], 1],
  ['lore', 'tg', 'Atlantic City is in which US state?', ['New York', 'New Jersey', 'Pennsylvania', 'Delaware'], 1],
  ['lore', 'tg', 'Who is credited with inventing the Liberty Bell slot machine?', ['Charles Fey', 'Thomas Edison', 'William Harrah', 'Bugsy Siegel'], 0],
  ['lore', 'tg', 'Old-school slot machines got which nickname?', ['One-armed bandits', 'Iron dealers', 'Spinning jennies', 'Lucky boxes'], 0],
  ['crypto', 'tg', "What is Bitcoin's pseudonymous creator called?", ['Vitalik Buterin', 'Satoshi Nakamoto', 'Hal Finney', 'Nick Szabo'], 1],
  ['crypto', 'tg', 'Bitcoin Pizza Day: 10,000 BTC for two pizzas. What year?', ['2009', '2010', '2012', '2013'], 1],
  ['crypto', 'tg', 'Who wrote the Ethereum whitepaper?', ['Vitalik Buterin', 'Satoshi Nakamoto', 'Charles Hoskinson', 'Gavin Wood'], 0],
  ['crypto', 'tg', 'Roughly how often does the Bitcoin block reward halve?', ['Every year', 'Every 2 years', 'Every 4 years', 'Every 10 years'], 2],

  // ---- tg: general knowledge ----
  ['general', 'tg', 'What is the largest planet in our solar system?', ['Saturn', 'Jupiter', 'Neptune', 'Earth'], 1],
  ['general', 'tg', 'Which is the hardest natural substance?', ['Quartz', 'Diamond', 'Granite', 'Topaz'], 1],
  ['general', 'tg', 'How many sides does a hexagon have?', ['5', '6', '7', '8'], 1],
  ['general', 'tg', 'Which is the largest ocean on Earth?', ['Atlantic', 'Indian', 'Pacific', 'Arctic'], 2],
  ['general', 'tg', 'Which land animal has the fastest top sprint speed?', ['Lion', 'Cheetah', 'Pronghorn', 'Greyhound'], 1],
  ['general', 'tg', 'How many bones are in an adult human body?', ['186', '206', '226', '256'], 1],
  ['general', 'tg', 'Roughly how fast does light travel in a vacuum?', ['300,000 km/s', '30,000 km/s', '3,000 km/s', '3 million km/s'], 0],
  ['general', 'tg', "Who wrote 'Romeo and Juliet'?", ['William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Mark Twain'], 0],
  ['general', 'tg', 'In what year did the first iPhone come out?', ['2005', '2007', '2009', '2010'], 1],
  ['general', 'tg', 'Which is the largest country by land area?', ['Canada', 'China', 'United States', 'Russia'], 3],
  ['general', 'tg', 'At sea level, water boils at what temperature in Fahrenheit?', ['100', '180', '212', '232'], 2],
  ['general', 'tg', 'What does DNA stand for?', ['Deoxyribonucleic acid', 'Dinucleic acid', 'Deoxyribose nitrogen acid', 'Dual nucleotide array'], 0],
  ['general', 'tg', 'Which gas do plants take in for photosynthesis?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], 2],
  ['pop', 'tg', 'Which studio made Minecraft?', ['Mojang', 'Valve', 'Epic Games', 'Blizzard'], 0],
  ['general', 'tg', 'How many squares are on a chessboard?', ['32', '48', '64', '81'], 2],
  ['general', 'tg', 'Which chess piece can only move diagonally?', ['Rook', 'Bishop', 'Knight', 'King'], 1],
  ['general', 'tg', 'How many players per team are on an NBA court at once?', ['5', '6', '7', '11'], 0],
  ['general', 'tg', 'Which country hosted the 2016 Summer Olympics?', ['China', 'United Kingdom', 'Brazil', 'Japan'], 2],
  ['general', 'tg', 'The Super Bowl is the championship game of which league?', ['NBA', 'NFL', 'MLB', 'NHL'], 1],
  ['general', 'tg', 'What is the smallest prime number?', ['0', '1', '2', '3'], 2],
  ['general', 'tg', 'How many minutes are in a day?', ['1,140', '1,440', '1,240', '1,600'], 1],
];

export const TRIVIA_BANK: readonly TriviaQuestion[] = ROWS.map(([cat, src, q, choices, answer], i) => ({
  id: `q${String(i + 1).padStart(3, '0')}`,
  cat,
  src,
  q,
  choices,
  answer,
}));

const BY_ID = new Map(TRIVIA_BANK.map((x) => [x.id, x]));

export function triviaById(id: string): TriviaQuestion | undefined {
  return BY_ID.get(id);
}
