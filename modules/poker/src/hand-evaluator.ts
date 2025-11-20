/**
 * Hand Evaluation
 * Evaluates Texas Hold'em hands (best 5 from 7 cards)
 */

import type { Card, HandEvaluation, HandRank } from './types.js';

/**
 * Evaluate the best 5-card hand from 7 cards (2 hole + 5 community)
 */
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate');
  }

  // Generate all 5-card combinations
  const combinations = get5CardCombinations(cards);
  
  // Evaluate each and find best
  let bestEval: HandEvaluation | null = null;
  for (const combo of combinations) {
    const evaluation = evaluate5Cards(combo);
    if (!bestEval || evaluation.value > bestEval.value) {
      bestEval = evaluation;
    }
  }

  return bestEval!;
}

/**
 * Get all 5-card combinations from array
 */
function get5CardCombinations(cards: Card[]): Card[][] {
  const combinations: Card[][] = [];
  const n = cards.length;
  
  function combine(start: number, combo: Card[]) {
    if (combo.length === 5) {
      combinations.push([...combo]);
      return;
    }
    for (let i = start; i < n; i++) {
      combo.push(cards[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }
  
  combine(0, []);
  return combinations;
}

/**
 * Evaluate a 5-card hand
 */
function evaluate5Cards(cards: Card[]): HandEvaluation {
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  
  const isFlush = checkFlush(sorted);
  const isStraight = checkStraight(sorted);
  const counts = getRankCounts(sorted);
  
  // Royal Flush: A♠ K♠ Q♠ J♠ 10♠
  if (isFlush && isStraight && sorted[0].value === 14) {
    return {
      rank: 'royal-flush',
      value: 1000 + sorted[0].value,
      cards: sorted,
      description: `Royal Flush (${sorted[0].suit})`,
    };
  }
  
  // Straight Flush
  if (isFlush && isStraight) {
    return {
      rank: 'straight-flush',
      value: 900 + sorted[0].value,
      cards: sorted,
      description: `Straight Flush, ${sorted[0].rank} high`,
    };
  }
  
  // Four of a Kind
  if (counts.quads) {
    return {
      rank: 'four-of-a-kind',
      value: 800 + counts.quads,
      cards: sorted,
      description: `Four ${counts.quads === 14 ? 'Aces' : counts.quads + 's'}`,
    };
  }
  
  // Full House
  if (counts.trips && counts.pair) {
    return {
      rank: 'full-house',
      value: 700 + counts.trips,
      cards: sorted,
      description: `Full House, ${counts.trips}s over ${counts.pair}s`,
    };
  }
  
  // Flush
  if (isFlush) {
    return {
      rank: 'flush',
      value: 600 + sorted[0].value,
      cards: sorted,
      description: `Flush (${sorted[0].suit}), ${sorted[0].rank} high`,
    };
  }
  
  // Straight
  if (isStraight) {
    return {
      rank: 'straight',
      value: 500 + sorted[0].value,
      cards: sorted,
      description: `Straight, ${sorted[0].rank} high`,
    };
  }
  
  // Three of a Kind
  if (counts.trips) {
    return {
      rank: 'three-of-a-kind',
      value: 400 + counts.trips,
      cards: sorted,
      description: `Three ${counts.trips}s`,
    };
  }
  
  // Two Pair
  if (counts.pairs && counts.pairs.length === 2) {
    return {
      rank: 'two-pair',
      value: 300 + Math.max(...counts.pairs),
      cards: sorted,
      description: `Two Pair, ${counts.pairs[0]}s and ${counts.pairs[1]}s`,
    };
  }
  
  // One Pair
  if (counts.pair) {
    return {
      rank: 'pair',
      value: 200 + counts.pair,
      cards: sorted,
      description: `Pair of ${counts.pair === 14 ? 'Aces' : counts.pair + 's'}`,
    };
  }
  
  // High Card
  return {
    rank: 'high-card',
    value: 100 + sorted[0].value,
    cards: sorted,
    description: `${sorted[0].rank} high`,
  };
}

function checkFlush(cards: Card[]): boolean {
  return cards.every(c => c.suit === cards[0].suit);
}

function checkStraight(cards: Card[]): boolean {
  const values = cards.map(c => c.value).sort((a, b) => b - a);
  
  // Check regular straight
  let isStraight = true;
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] - values[i + 1] !== 1) {
      isStraight = false;
      break;
    }
  }
  
  // Check A-2-3-4-5 (wheel)
  if (!isStraight && values[0] === 14) {
    const wheelValues = [14, 5, 4, 3, 2];
    isStraight = values.every((v, i) => v === wheelValues[i]);
  }
  
  return isStraight;
}

function getRankCounts(cards: Card[]): {
  quads?: number;
  trips?: number;
  pairs?: number[];
  pair?: number;
} {
  const counts = new Map<number, number>();
  
  for (const card of cards) {
    counts.set(card.value, (counts.get(card.value) || 0) + 1);
  }
  
  const result: any = { pairs: [] };
  
  for (const [value, count] of counts.entries()) {
    if (count === 4) result.quads = value;
    else if (count === 3) result.trips = value;
    else if (count === 2) result.pairs.push(value);
  }
  
  if (result.pairs.length === 1) {
    result.pair = result.pairs[0];
    delete result.pairs;
  } else if (result.pairs.length === 0) {
    delete result.pairs;
  }
  
  return result;
}

/**
 * Compare two hands (returns > 0 if hand1 wins, < 0 if hand2 wins, 0 if tie)
 */
export function compareHands(hand1: HandEvaluation, hand2: HandEvaluation): number {
  return hand1.value - hand2.value;
}

/**
 * Determine if a loss was a "bad beat" (strong hand losing)
 * Returns probability that the losing hand should have won (0-1)
 */
export function isBadBeat(_winnerHand: HandEvaluation, loserHand: HandEvaluation): number {
  const loserRankValue: Record<HandRank, number> = {
    'high-card': 0,
    'pair': 0.1,
    'two-pair': 0.3,
    'three-of-a-kind': 0.5,
    'straight': 0.7,
    'flush': 0.8,
    'full-house': 0.9,
    'four-of-a-kind': 0.95,
    'straight-flush': 0.98,
    'royal-flush': 1.0,
  };
  
  // If loser had full house or better, it's a bad beat
  const loserStrength = loserRankValue[loserHand.rank];
  
  if (loserStrength >= 0.9) {
    return loserStrength; // Very strong hand lost
  }
  
  return 0; // Not a bad beat
}
