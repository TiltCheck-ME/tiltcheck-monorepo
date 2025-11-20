/**
 * Poker Game Manager
 * Manages Texas Hold'em game state and actions
 */

import { eventRouter } from '@tiltcheck/event-router';
import { createDeck, shuffleDeck, dealCards } from './deck.js';
import { evaluateHand, compareHands, isBadBeat } from './hand-evaluator.js';
import type { PokerGame, GameAction, GameResult, GameStage } from './types.js';

const activeGames = new Map<string, PokerGame>();

/**
 * Create a new poker game
 */
export function createGame(
  channelId: string,
  hostUserId: string,
  hostUsername: string,
  buyIn: number = 10,
  smallBlind: number = 1,
  bigBlind: number = 2
): PokerGame {
  const gameId = `poker_${channelId}_${Date.now()}`;
  
  const game: PokerGame = {
    id: gameId,
    channelId,
    players: [{
      userId: hostUserId,
      username: hostUsername,
      chips: buyIn,
      cards: [],
      currentBet: 0,
      folded: false,
      allIn: false,
    }],
    deck: [],
    communityCards: [],
    pot: 0,
    currentBet: 0,
    stage: 'waiting',
    dealerIndex: 0,
    currentPlayerIndex: 0,
    smallBlind,
    bigBlind,
    buyIn,
    createdAt: Date.now(),
    lastActionAt: Date.now(),
  };
  
  activeGames.set(gameId, game);
  return game;
}

/**
 * Join an existing game
 */
export function joinGame(gameId: string, userId: string, username: string): boolean {
  const game = activeGames.get(gameId);
  if (!game || game.stage !== 'waiting') return false;
  
  // Max 9 players
  if (game.players.length >= 9) return false;
  
  // Check if already joined
  if (game.players.some(p => p.userId === userId)) return false;
  
  game.players.push({
    userId,
    username,
    chips: game.buyIn,
    cards: [],
    currentBet: 0,
    folded: false,
    allIn: false,
  });
  
  game.lastActionAt = Date.now();
  return true;
}

/**
 * Start the game (min 2 players)
 */
export function startGame(gameId: string): boolean {
  const game = activeGames.get(gameId);
  if (!game || game.stage !== 'waiting' || game.players.length < 2) return false;
  
  // Shuffle and deal
  game.deck = shuffleDeck(createDeck());
  
  // Post blinds
  const sbIndex = (game.dealerIndex + 1) % game.players.length;
  const bbIndex = (game.dealerIndex + 2) % game.players.length;
  
  game.players[sbIndex].chips -= game.smallBlind;
  game.players[sbIndex].currentBet = game.smallBlind;
  game.pot += game.smallBlind;
  
  game.players[bbIndex].chips -= game.bigBlind;
  game.players[bbIndex].currentBet = game.bigBlind;
  game.pot += game.bigBlind;
  game.currentBet = game.bigBlind;
  
  // Deal hole cards
  for (const player of game.players) {
    const { cards, remaining } = dealCards(game.deck, 2);
    player.cards = cards;
    game.deck = remaining;
  }
  
  game.stage = 'preflop';
  game.currentPlayerIndex = (bbIndex + 1) % game.players.length;
  game.lastActionAt = Date.now();
  
  return true;
}

/**
 * Process a player action
 */
export function processAction(gameId: string, action: GameAction): { success: boolean; message?: string } {
  const game = activeGames.get(gameId);
  if (!game) return { success: false, message: 'Game not found' };
  
  const player = game.players[game.currentPlayerIndex];
  if (player.userId !== action.userId) {
    return { success: false, message: 'Not your turn' };
  }
  
  if (player.folded || player.allIn) {
    return { success: false, message: 'You cannot act' };
  }
  
  switch (action.action) {
    case 'fold':
      player.folded = true;
      break;
      
    case 'check':
      if (player.currentBet < game.currentBet) {
        return { success: false, message: 'Cannot check, must call or raise' };
      }
      break;
      
    case 'call':
      const callAmount = game.currentBet - player.currentBet;
      if (player.chips < callAmount) {
        // All-in
        game.pot += player.chips;
        player.currentBet += player.chips;
        player.chips = 0;
        player.allIn = true;
      } else {
        player.chips -= callAmount;
        player.currentBet += callAmount;
        game.pot += callAmount;
      }
      break;
      
    case 'raise':
      if (!action.amount || action.amount < game.currentBet * 2) {
        return { success: false, message: 'Raise must be at least 2x current bet' };
      }
      const raiseAmount = action.amount - player.currentBet;
      if (player.chips < raiseAmount) {
        return { success: false, message: 'Not enough chips' };
      }
      player.chips -= raiseAmount;
      player.currentBet += raiseAmount;
      game.pot += raiseAmount;
      game.currentBet = action.amount;
      break;
      
    case 'all-in':
      game.pot += player.chips;
      player.currentBet += player.chips;
      player.chips = 0;
      player.allIn = true;
      if (player.currentBet > game.currentBet) {
        game.currentBet = player.currentBet;
      }
      break;
  }
  
  game.lastActionAt = Date.now();
  
  // Move to next player
  const nextIndex = getNextActivePlayer(game, game.currentPlayerIndex);
  
  // Check if betting round is complete
  if (isBettingRoundComplete(game, nextIndex)) {
    advanceStage(game);
  } else {
    game.currentPlayerIndex = nextIndex;
  }
  
  return { success: true };
}

function getNextActivePlayer(game: PokerGame, currentIndex: number): number {
  let nextIndex = (currentIndex + 1) % game.players.length;
  while (game.players[nextIndex].folded || game.players[nextIndex].allIn) {
    nextIndex = (nextIndex + 1) % game.players.length;
    if (nextIndex === currentIndex) break; // Cycled through
  }
  return nextIndex;
}

function isBettingRoundComplete(game: PokerGame, nextIndex: number): boolean {
  // All players have acted and matched current bet (or folded/all-in)
  const activePlayers = game.players.filter(p => !p.folded && !p.allIn);
  if (activePlayers.length === 0) return true;
  
  const allMatched = activePlayers.every(p => p.currentBet === game.currentBet);
  return allMatched && (nextIndex === game.dealerIndex || activePlayers.length === 1);
}

function advanceStage(game: PokerGame) {
  // Reset bets
  for (const player of game.players) {
    player.currentBet = 0;
  }
  game.currentBet = 0;
  
  const stages: GameStage[] = ['preflop', 'flop', 'turn', 'river', 'showdown'];
  const currentStageIndex = stages.indexOf(game.stage);
  
  if (currentStageIndex === -1 || currentStageIndex === stages.length - 1) {
    // Showdown
    endGame(game);
    return;
  }
  
  const nextStage = stages[currentStageIndex + 1];
  game.stage = nextStage;
  
  // Deal community cards
  if (nextStage === 'flop') {
    const { cards, remaining } = dealCards(game.deck, 3);
    game.communityCards = cards;
    game.deck = remaining;
  } else if (nextStage === 'turn' || nextStage === 'river') {
    const { cards, remaining } = dealCards(game.deck, 1);
    game.communityCards.push(cards[0]);
    game.deck = remaining;
  } else if (nextStage === 'showdown') {
    endGame(game);
    return;
  }
  
  // Start betting with player after dealer
  game.currentPlayerIndex = (game.dealerIndex + 1) % game.players.length;
}

function endGame(game: PokerGame) {
  game.stage = 'showdown';
  
  // Evaluate hands
  const activePlayers = game.players.filter(p => !p.folded);
  const evaluations = activePlayers.map(p => ({
    player: p,
    hand: evaluateHand([...p.cards, ...game.communityCards]),
  }));
  
  // Sort by hand strength
  evaluations.sort((a, b) => compareHands(b.hand, a.hand));
  
  // Determine winners (handle ties)
  const winners = [evaluations[0]];
  for (let i = 1; i < evaluations.length; i++) {
    if (compareHands(evaluations[i].hand, winners[0].hand) === 0) {
      winners.push(evaluations[i]);
    } else {
      break;
    }
  }
  
  // Split pot
  const winningsPerWinner = Math.floor(game.pot / winners.length);
  
  const result: GameResult = {
    winners: winners.map(w => ({
      userId: w.player.userId,
      username: w.player.username,
      hand: w.hand,
      winnings: winningsPerWinner,
    })),
    pot: game.pot,
  };
  
  // Check for bad beat
  if (evaluations.length >= 2 && winners.length === 1) {
    const loser = evaluations[1];
    const badBeatProb = isBadBeat(winners[0].hand, loser.hand);
    
    if (badBeatProb > 0.8) {
      result.badBeat = {
        loserId: loser.player.userId,
        loserHand: loser.hand,
        winnerHand: winners[0].hand,
        probability: badBeatProb,
      };
      
      // Emit tilt.detected event for bad beat
      void eventRouter.publish(
        'tilt.detected',
        'poker-module',
        {
          userId: loser.player.userId,
          reason: 'poker-bad-beat',
          severity: Math.floor(badBeatProb * 5), // 1-5 based on how bad
          context: {
            loserHand: loser.hand.description,
            winnerHand: winners[0].hand.description,
            probability: badBeatProb,
          },
        }
      );
    }
  }
  
  // Emit game.completed event
  void eventRouter.publish(
    'game.completed',
    'poker-module',
    {
      gameId: game.id,
      channelId: game.channelId,
      result,
      duration: Date.now() - game.createdAt,
    }
  );
  
  game.stage = 'complete';
  
  // Clean up after 5 minutes
  setTimeout(() => {
    activeGames.delete(game.id);
  }, 5 * 60 * 1000);
}

/**
 * Get game state
 */
export function getGame(gameId: string): PokerGame | undefined {
  return activeGames.get(gameId);
}

/**
 * Get all active games in a channel
 */
export function getChannelGames(channelId: string): PokerGame[] {
  return Array.from(activeGames.values()).filter(g => g.channelId === channelId);
}

/**
 * Leave a game (before it starts)
 */
export function leaveGame(gameId: string, userId: string): boolean {
  const game = activeGames.get(gameId);
  if (!game || game.stage !== 'waiting') return false;
  
  game.players = game.players.filter(p => p.userId !== userId);
  
  if (game.players.length === 0) {
    activeGames.delete(gameId);
  }
  
  return true;
}
