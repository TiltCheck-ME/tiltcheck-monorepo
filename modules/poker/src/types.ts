/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Poker Module - Texas Hold'em
 * Discord-based poker games with buy-ins via JustTheTip
 * Tilt detection on bad beats
 */

import type {
  Suit,
  Rank,
  Card,
  HandRank,
  HandEvaluation,
} from '@tiltcheck/types';

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
