/**
 * Poker Module - Texas Hold'em
 * Discord-based poker games with buy-ins via JustTheTip
 * Tilt detection on bad beats
 */

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // 2-14 (Ace high)
}

export type HandRank =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

export interface HandEvaluation {
  rank: HandRank;
  value: number; // For comparison
  cards: Card[]; // Best 5-card hand
  description: string;
}

export interface Player {
  userId: string;
  username: string;
  chips: number;
  cards: Card[];
  currentBet: number;
  folded: boolean;
  allIn: boolean;
}

export type GameStage = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'complete';

export interface PokerGame {
  id: string;
  channelId: string;
  players: Player[];
  deck: Card[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  stage: GameStage;
  dealerIndex: number;
  currentPlayerIndex: number;
  smallBlind: number;
  bigBlind: number;
  buyIn: number;
  createdAt: number;
  lastActionAt: number;
}

export interface GameAction {
  userId: string;
  action: 'fold' | 'call' | 'raise' | 'check' | 'all-in';
  amount?: number;
}

export interface GameResult {
  winners: Array<{
    userId: string;
    username: string;
    hand: HandEvaluation;
    winnings: number;
  }>;
  pot: number;
  badBeat?: {
    loserId: string;
    loserHand: HandEvaluation;
    winnerHand: HandEvaluation;
    probability: number; // How unlikely the loss was (0-1)
  };
}
