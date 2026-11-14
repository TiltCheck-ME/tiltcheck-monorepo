// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Myth or Math: true/false statements. This file holds the gambling cards (myths and real odds);
// src/shared/mythGeneral.ts holds the general cards, and every run deals half of each. SERVER AND TESTS ONLY:
// the browser build swaps in src/client/guestMythBank.ts (vite.config.ts), a small practice subset,
// so the full bank and its answers never ship to clients. Inside Discord the worker deals one card at
// a time and only sends the answer and the "why" after you've locked in (or the clock ran out).
//
// Every card is original and written to be defensible. Wording is conservative on purpose
// ("usually", "most", "in many regulated markets") wherever the real world has exceptions.
// No brand or venue names, no betting advice, nothing that reads like a promotion.
// Money-words guard: the gambling cards are the one scoped exception in tests/no-money.test.ts. They
// may say "jackpot" and "payout"; every other banned word is still banned. General cards get no exception.

import { GENERAL_ROWS } from './mythGeneral.js';

export type MythKind = 'gambling' | 'general';

export interface MythCard {
  id: string;
  text: string;
  /** true = it's math (true), false = it's a myth. */
  truth: boolean;
  /** Plain-English reason shown after the answer. 140 characters max. */
  why: string;
  /** Gambling myth/odds card, or a general one (everyday myths, science, maths). */
  kind: MythKind;
}

type Row = [id: string, text: string, truth: boolean, why: string];

const ROWS: Row[] = [
  // Gambler's fallacy and independence.
  ['m01', "A slot that hasn't hit in a while is due.", false, "Each spin is independent. The machine doesn't remember the last thousand spins and doesn't owe you one."],
  ['m02', 'The house edge means the house comes out ahead over the long run.', true, 'The edge is built into the odds. Over many bets, results drift toward it.'],
  ['m03', 'After five reds in a row at roulette, black is more likely on the next spin.', false, 'The wheel has no memory. Every spin has the same odds as the first one.'],
  ['m04', 'After nine heads in a row, a fair coin is due for tails.', false, "Still 50/50. Fair coins don't keep score."],
  // 1/1024 = 0.5^10.
  ['m05', 'Ten heads in a row is exactly as likely as any other specific sequence of ten flips.', true, 'Every exact sequence of ten fair flips has the same 1 in 1,024 chance. HHHHHHHHHH just looks special.'],
  ['m06', "The gambler's fallacy is believing past random results change future ones.", true, "Independent events don't take turns. Expecting them to is the fallacy."],
  ['m07', 'Lottery numbers that came up last week are less likely to come up this week.', false, 'Each draw is independent. Last week\'s numbers have the same odds as any others.'],
  ['m08', 'In a lottery, 1-2-3-4-5-6 has worse odds than a random-looking set of numbers.', false, 'Every combination has the same odds. Patterns just feel less likely.'],
  ['m09', 'If a game is truly random, wins and losses should alternate pretty evenly.', false, 'Real randomness clumps. Neat alternating patterns are what fake randomness looks like.'],
  ['m10', 'Streaks are normal in random results.', true, 'Random runs clump. Long streaks show up more often than people expect.'],
  ['m11', 'A single-number roulette bet gets better odds the longer you keep backing it.', false, 'Every spin is 1 in 37 or 1 in 38, no matter how many times you have backed that number.'],
  ['m12', 'Taking a break changes the odds of your next bet.', false, "The game doesn't know you left. The odds are the same when you come back."],

  // Hot hands and "due" machines.
  ['m13', "A slot that's been paying out is hot and more likely to keep paying.", false, "Past results don't change the next spin's odds. Hot streaks only exist in hindsight."],
  ['m14', 'Switching machines after a big win stops the machine from cooling off on you.', false, "Machines don't heat up or cool off. Every spin carries the same odds."],
  ['m15', 'In games of pure chance, a run of wins is a reliable sign to bet bigger.', false, 'A run of wins says nothing about the next result. Chance has no momentum.'],
  ['m16', 'A board showing "hot numbers" at a roulette table helps predict the next spin.', false, 'Those boards show history, not the future. A fair wheel has no favorites.'],
  ['m17', "With a properly shuffled deck, a 'cold' dealer is the reason you're losing.", false, "Shuffled cards come out in random order. The dealer's mood doesn't pick them."],
  ['m18', 'Lucky charms and rituals can change the outcome of a random game.', false, 'Random means random. Your lucky socks have no say.'],
  ['m19', 'Winning a lot early means you found a game where the player has the edge.', false, 'Early wins are normal variance. The edge shows up over many bets, not a handful.'],

  // RNG, near-misses, slot mechanics.
  ['m20', 'Modern electronic slots use a random number generator to pick each result.', true, 'An RNG decides the outcome. The spinning reels are a display of a result already chosen.'],
  ['m21', 'A near-miss on a slot means you were close to winning.', false, 'The result is set before the reels stop. A near-miss is a losing spin dressed up as almost.'],
  // Near-miss research: e.g. Clark et al., Neuron 2009; Cote et al., 2003.
  ['m22', 'Studies link near-misses to a stronger urge to keep playing.', true, 'In lab studies near-misses boost the urge to play again, even though they pay the same as any other loss.'],
  ['m23', 'On most modern slots, hitting the stop button at the right moment changes the result.', false, 'On RNG slots the result is fixed when you spin. The stop button just ends the animation sooner.'],
  ['m24', "A 'loss disguised as a win' is when a slot celebrates a payout smaller than your bet.", true, 'Lights and sounds fire, but you got back less than you put in. Net, it was a loss.'],
  ['m25', 'In many regulated markets, game RNGs are tested by independent labs.', true, 'Regulators commonly require third-party testing. Unregulated sites may skip it.'],

  // RTP, house edge, volatility.
  ['m26', 'An RTP of 96% means you get 96% back every session.', false, 'RTP is a long-run average over a huge number of spins. One session can land far from it either way.'],
  ['m27', 'RTP and house edge are two ways of saying the same thing.', true, '96% RTP means a 4% house edge. Same number, flipped.'],
  ['m28', 'A slot with a higher RTP returns more on average over the long run.', true, "That's exactly what RTP measures. Over the long run, 97% gives back more than 92%."],
  ['m29', 'Volatility and RTP are the same thing.', false, 'RTP is the long-run average. Volatility is how wild the ride is around it.'],
  ['m30', 'Slots with bigger possible wins usually come with bigger swings.', true, 'High volatility means rarer, larger hits and longer dry spells, even at the same RTP.'],
  ['m31', 'The house edge on a bet is the same percentage whether you bet big or small.', true, 'The edge is a percentage. Bigger bets just mean bigger expected losses.'],
  ['m32', 'Playing faster means more bets per hour, so a bigger expected loss per hour.', true, 'Same edge on every bet, more bets in the hour, more expected loss in the hour.'],
  ['m33', 'Over many bets, your average result tends toward the expected value.', true, "That's the law of large numbers. With a house edge, that average sits below zero."],
  ['m34', 'The law of large numbers means a losing streak has to balance out soon.', false, "It's about averages over huge samples. Nothing has to make up for your last hour."],
  ['m35', 'The more you play a game with a house edge, the closer your total gets to breaking even.', false, 'With a house edge, the expected total keeps sliding below zero as bets stack up.'],
  ['m36', 'Variance means short-term results can swing far from the average in either direction.', true, "Short runs are noisy. That's why one good night tells you very little about the math."],
  ['m37', 'Expected value can be negative even when you win most of your bets.', true, 'Win small often, lose big now and then, and the average can still land below zero.'],

  // Betting systems.
  ['m38', 'Doubling your bet after every loss (the martingale) guarantees a profit.', false, 'Losing streaks happen. Table limits or your bankroll run out before the system pays off.'],
  ['m39', "The martingale can't change the house edge.", true, "Bet sizing doesn't change the odds of any single bet, so the edge stays exactly where it was."],
  ['m40', 'A betting system can beat a game with a built-in house edge over the long run.', false, 'No staking pattern turns a negative-expectation bet positive. The math ignores patterns.'],
  ['m41', 'Betting on both red and black at roulette means you always break even.', false, 'The green zero (or two) beats both. On those spins you lose both bets.'],
  ['m42', 'Chasing losses is a solid way to get back to even.', false, 'Bigger bets to win it back mean bigger swings, and the house edge applies to every one of them.'],

  // Bonuses and wagering requirements.
  ['m43', 'A wagering requirement means you have to bet a set multiple of a bonus before you can cash it out.', true, 'That is what the requirement is: total bets you must place first. What counts toward it varies.'],
  ['m44', 'A bonus with wagering requirements is basically free to cash out.', false, 'Each required bet runs into the house edge, so part of the bonus usually gets eaten on the way.'],
  ['m45', 'A higher wagering requirement makes a bonus harder to actually cash out.', true, 'More required betting means more trips through the house edge before anything is yours to keep.'],

  // Jackpots and lotteries.
  ['m46', 'The odds of hitting a big progressive jackpot are usually very long.', true, 'Huge pools build up because almost nobody hits them. Long odds are the whole design.'],
  ['m47', "A progressive jackpot that's grown huge is now more likely to hit.", false, "A bigger pool doesn't change the odds per spin. It just means nobody has hit it yet."],
  // Multistate jackpot about 1 in 292 million per ticket; US lifetime lightning odds about 1 in 15,300 (NWS).
  ['m48', 'One ticket has better odds of a big multistate lottery jackpot than you have of being struck by lightning in your lifetime.', false, 'Big jackpots run around 1 in 300 million per ticket. US lifetime lightning odds are about 1 in 15,000.'],
  // 1 - 0.99^100 = 0.634.
  ['m49', 'A 1 in 100 shot will definitely hit within your first 100 tries.', false, 'Not guaranteed. The chance of at least one hit in 100 tries is about 63%.'],

  // Roulette and dice math.
  // 38 pockets, straight-up pays 35 to 1.
  ['m50', 'In American roulette, the 0 and 00 are where the house gets its edge.', true, 'A single number pays 35 to 1 but is a 1 in 38 shot. The zeros fill that gap.'],
  // 1/37 = 2.70%; 2/38 = 5.26%.
  ['m51', 'Single-zero roulette has a lower house edge than double-zero roulette.', true, 'One zero: about 2.7%. Two zeros: about 5.26%.'],
  ['m52', 'With two dice, 7 is the most common total.', true, 'Six of the 36 combinations make 7, more than any other total.'],
  ['m53', 'Rolling double six is as likely as rolling a 3 and a 4.', false, 'Double six is 1 way out of 36. A 3 and a 4 can land 2 ways (3-4 or 4-3).'],
  // Pass line edge 1.41%.
  ['m54', 'The pass line in craps has one of the lowest house edges on the floor.', true, 'About 1.4%, lower than most slots and most side bets.'],
  ['m55', 'Side bets often carry a much bigger house edge than the main game.', true, 'Many side bets look fun because they pay big, and they pay big because the edge is steep.'],

  // Blackjack: edge facts only, no strategy advice.
  ['m56', "In blackjack, perfect basic strategy shrinks the house edge but doesn't remove it.", true, 'Played perfectly it gets small under common rules, but the house still keeps one.'],
  // Dealer blackjack with an ace up: 16/52 cards are ten-value, about 31%, under the 1 in 3 needed at 2 to 1.
  ['m57', 'Blackjack insurance is usually a losing bet over time.', true, 'It pays 2 to 1, but the dealer has blackjack under an ace less than 1 time in 3.'],
  // Keno edges commonly 20%+; blackjack with basic strategy around 1% or less.
  ['m58', 'Keno usually carries a bigger house edge than blackjack played well.', true, 'Keno often keeps 20% or more. Blackjack played well keeps far less.'],

  // Odds literacy.
  ['m59', 'Odds of 3 to 1 against mean a 1 in 4 chance.', true, '3 ways to miss, 1 way to hit. That is 1 in 4, or 25%.'],
  ['m60', 'A 25% chance and odds of 1 in 4 are two different things.', false, 'Same thing, written two ways. 1 in 4 is 25%.'],
  ['m61', 'A 50/50 bet that pays less than even money loses over the long run.', true, 'Win half the time, get paid less than you risk, and the average drifts down.'],
  ['m62', 'Sports odds include a built-in margin for the bookmaker.', true, 'Add up the implied chances on every outcome and you get more than 100%. The extra is the margin.'],
  ['m63', 'Parlays are easier to win than single bets because they pay more.', false, 'Every leg has to land. The chances multiply down, and the margin stacks up with each leg.'],
  ['m64', 'Decimal odds of 4.00 imply about a 25% chance, before the margin.', true, 'Implied chance is 1 divided by the decimal odds. 1 / 4.00 is 25%.'],
];

export const MYTH_BANK: readonly MythCard[] = [
  ...ROWS.map(([id, text, truth, why]): MythCard => ({ id, text, truth, why, kind: 'gambling' })),
  ...GENERAL_ROWS.map(([id, text, truth, why]): MythCard => ({ id, text, truth, why, kind: 'general' })),
];

const BY_ID = new Map(MYTH_BANK.map((c) => [c.id, c]));

export function mythById(id: string): MythCard | undefined {
  return BY_ID.get(id);
}
