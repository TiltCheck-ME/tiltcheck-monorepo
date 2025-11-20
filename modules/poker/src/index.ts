/**
 * Poker Module - Texas Hold'em for Discord
 * Non-custodial buy-ins via JustTheTip
 * Automatic tilt detection on bad beats
 */

export * from './types.js';
export * from './deck.js';
export * from './hand-evaluator.js';
export * from './game-manager.js';

export { createGame, joinGame, startGame, processAction, getGame, getChannelGames, leaveGame } from './game-manager.js';
export { evaluateHand, compareHands, isBadBeat } from './hand-evaluator.js';
export { formatCard, formatCards } from './deck.js';
