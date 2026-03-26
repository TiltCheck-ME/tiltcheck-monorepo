/**
 * Poker Module - Texas Hold'em
 * Discord-based poker games with buy-ins via JustTheTip
 * Tilt detection on bad beats
 */
import { 
  Suit, 
  Rank, 
  Card, 
  HandRank, 
  HandEvaluation,
  GameResult 
} from '@tiltcheck/types';

export { Suit, Rank, Card, HandRank, HandEvaluation, GameResult };
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

// Players, Stage, and PokerGame remain local
