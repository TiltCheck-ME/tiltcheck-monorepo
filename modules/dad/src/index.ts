/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * DA&D (Degens Against Decency) - AI-powered card game
 * 
 * Features:
 * - White and black cards
 * - AI-generated packs
 * - Player voting
 * - Score tracking
 * - Discord integration
 */

export { DADModule, dad } from './module.js';
export type { 
  WhiteCard, 
  BlackCard, 
  CardPack, 
  Player, 
  GameRound, 
  Game,
  SerializedGameRound,
  SerializedGameState
} from './module.js';
