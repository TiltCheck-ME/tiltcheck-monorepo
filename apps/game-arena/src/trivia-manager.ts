/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Global Trivia Manager
 * Manages synchronized live trivia events for 10k+ users
 */

import { v4 as uuidv4 } from 'uuid';
import { eventRouter } from '@tiltcheck/event-router';
import { generateTriviaQuestionAsync } from '@tiltcheck/triviadrops';
import type { TriviaQuestion, TriviaCategory } from '@tiltcheck/triviadrops';
import { justthetip } from '@tiltcheck/justthetip';
import type { GameStatus } from './types.js';

interface TriviaSurvivor {
  userId: string;
  username: string;
  isEliminated: boolean;
  lives: number;
  score: number;
  currentAnswer?: string;
  lastAnswerTimestamp?: number;
}

interface TriviaGameState {
  id: string;
  status: GameStatus;
  category: string;
  theme?: string;
  currentRound: number;
  totalRounds: number;
  startTime: number;
  endsAt?: number;
  questions: TriviaQuestion[];
  winners: string[];
  prizePool: number; // in SOL
}

export class GlobalTriviaManager {
  private activeGame: TriviaGameState | null = null;
  private players: Map<string, TriviaSurvivor> = new Map();
  private timers: { [key: string]: NodeJS.Timeout } = {};

  constructor() {
    console.log('[GlobalTriviaManager] Initialized');
  }

  public isActive(): boolean {
    return this.activeGame !== null && this.activeGame.status === 'active';
  }

  /**
   * Schedule a new trivia event
   */
  async scheduleGame(
    options: {
      category?: TriviaCategory;
      theme?: string;
      totalRounds?: number;
      startTime: number;
      prizePool: number;
    }
  ): Promise<string> {
    const gameId = uuidv4();
    const totalRounds = options.totalRounds || 12;
    
    // Pre-generate questions using the AI engine
    const questions: TriviaQuestion[] = [];
    for (let i = 0; i < totalRounds; i++) {
      const difficulty = i < 4 ? 'easy' : i < 9 ? 'medium' : 'hard';
      const q = await generateTriviaQuestionAsync(options.category || 'general', difficulty);
      questions.push({ ...q, id: `q-${i}`, createdAt: Date.now() });
    }

    this.activeGame = {
      id: gameId,
      status: 'scheduled',
      category: options.category || 'general',
      theme: options.theme,
      currentRound: 0,
      totalRounds: totalRounds,
      startTime: options.startTime,
      questions: questions,
      winners: [],
      prizePool: options.prizePool
    };

    console.log(`[GlobalTriviaManager] Game ${gameId} scheduled for ${new Date(options.startTime).toISOString()}`);

    // Set a timer to start the game
    const delay = options.startTime - Date.now();
    if (delay > 0) {
      this.timers['start'] = setTimeout(() => this.startGame(), delay);
    } else {
      await this.startGame();
    }

    return gameId;
  }

  /**
   * Start the live game
   */
  private async startGame(): Promise<void> {
    if (!this.activeGame) return;

    this.activeGame.status = 'active';
    console.log(`[GlobalTriviaManager] Game ${this.activeGame.id} is now LIVE`);

    await eventRouter.publish('trivia.started', 'game-arena', {
      gameId: this.activeGame.id,
      totalRounds: this.activeGame.totalRounds,
      category: this.activeGame.category,
      theme: this.activeGame.theme
    });

    // Start Phase 1: Waiting Room (60 seconds for 10k users to join)
    this.nextRound();
  }

  /**
   * Move to the next round
   */
  private async nextRound(): Promise<void> {
    if (!this.activeGame || this.activeGame.status !== 'active') return;

    this.activeGame.currentRound++;

    if (this.activeGame.currentRound > this.activeGame.totalRounds) {
      return this.endGame();
    }

    const currentQuestion = this.activeGame.questions[this.activeGame.currentRound - 1];
    const durationMs = 15000; // 15 seconds to answer

    this.activeGame.endsAt = Date.now() + durationMs;

    // Reset current answers for survivors
    for (const player of this.players.values()) {
      player.currentAnswer = undefined;
    }

    // Broadcast to all connected clients
    await eventRouter.publish('trivia.round.start', 'game-arena', {
      gameId: this.activeGame.id,
      roundNumber: this.activeGame.currentRound,
      totalRounds: this.activeGame.totalRounds,
      question: {
        id: currentQuestion.id,
        text: currentQuestion.question,
        choices: currentQuestion.choices
      },
      endsAt: this.activeGame.endsAt
    });

    // Set timer for reveal
    this.timers['reveal'] = setTimeout(() => this.revealRound(), durationMs);
  }

  /**
   * Reveal the correct answer and eliminate those who got it wrong
   */
  private async revealRound(): Promise<void> {
    if (!this.activeGame) return;

    const currentQuestion = this.activeGame.questions[this.activeGame.currentRound - 1];
    const stats: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    
    // Process eliminations
    for (const player of this.players.values()) {
      if (player.isEliminated) continue;

      const isCorrect = player.currentAnswer === currentQuestion.answer;
      
      if (player.currentAnswer) {
        // Map answers back to choices index if needed, for now just literal
        stats[player.currentAnswer] = (stats[player.currentAnswer] || 0) + 1;
      }

      if (!isCorrect) {
        if (player.lives > 0) {
          player.lives--;
          console.log(`[GlobalTriviaManager] Player ${player.username} used a life. Remaining: ${player.lives}`);
        } else {
          player.isEliminated = true;
          console.log(`[GlobalTriviaManager] Player ${player.username} ELIMINATED on round ${this.activeGame.currentRound}`);
        }
      } else {
        player.score += 10; // Base score for correct answer
      }
    }

    await eventRouter.publish('trivia.round.reveal', 'game-arena', {
      gameId: this.activeGame.id,
      questionId: currentQuestion.id,
      correctChoice: currentQuestion.answer,
      stats: stats
    });

    // Wait a few seconds then next round
    this.timers['next'] = setTimeout(() => this.nextRound(), 5000);
  }

  /**
   * End the game and handle payouts
   */
  public async endGame(): Promise<void> {
    if (!this.activeGame) return;

    this.activeGame.status = 'completed';
    const survivors = Array.from(this.players.values()).filter(p => !p.isEliminated);
    this.activeGame.winners = survivors.map(p => p.userId);

    console.log(`[GlobalTriviaManager] Game ${this.activeGame.id} Finished. ${survivors.length} Winners!`);

    await eventRouter.publish('trivia.completed', 'game-arena', {
      gameId: this.activeGame.id,
      winners: survivors.map(p => ({ id: p.userId, username: p.username })),
      prizePool: this.activeGame.prizePool
    });

    // Reset for next event
    this.activeGame = null;
    this.players.clear();
  }

  /**
   * Process a Buy-back request
   * Allows an eliminated player to rejoin if within the buy-back window (Q1-Q10)
   */
  async processBuyBack(userId: string): Promise<{ success: boolean; message?: string }> {
    if (!this.activeGame || this.activeGame.status !== 'active') {
      return { success: false, message: 'No active game found.' };
    }

    const player = this.players.get(userId);
    if (!player) return { success: false, message: 'Player not found in game.' };

    if (!player.isEliminated) {
      return { success: false, message: 'Player is not eliminated.' };
    }

    // Buy-back window check (up to Q10 in a 12-round game)
    if (this.activeGame.currentRound > 10) {
      return { success: false, message: 'Buy-back window has closed.' };
    }

    try {
      // Deduct 0.05 SOL equivalent in credits via JustTheTip
      const amount = 0.05;
      const deduction = await justthetip.credits.deduct(userId, amount, 'trivia-buy-back');
      
      if (!deduction) {
        return { success: false, message: 'Insufficient credits for buy-back.' };
      }

      player.isEliminated = false;
      player.lives = 1; // Give them a second chance
      
      console.log(`[Trivia] User ${player.username} successfully BUOUGHT BACK into game ${this.activeGame.id}`);
      
      await eventRouter.publish('trivia.player.reinstated', 'game-arena', {
        gameId: this.activeGame.id,
        userId: userId,
        username: player.username
      });

      return { success: true };
    } catch (error) {
      console.error('[Trivia] Buy-back failed:', error);
      return { success: false, message: 'Internal error processing buy-back.' };
    }
  }

  /**
   * Request an "Ape-in" hint
   * Returns the current answer distribution for the active round
   */
  async requestApeIn(userId: string): Promise<{ success: boolean; stats?: Record<string, number>; message?: string }> {
    if (!this.activeGame || this.activeGame.status !== 'active') {
      return { success: false, message: 'Game is not active.' };
    }

    const player = this.players.get(userId);
    if (!player || player.isEliminated) {
      return { success: false, message: 'Only active players can use hints.' };
    }

    try {
      // Deduct 0.02 SOL equivalent for the hint
      const amount = 0.02;
      const deduction = await justthetip.credits.deduct(userId, amount, 'trivia-ape-in-hint');

      if (!deduction) {
        return { success: false, message: 'Insufficient credits for hint.' };
      }

      const stats = this.getApeInStats();
      
      console.log(`[Trivia] User ${player.username} used APE-IN hint for round ${this.activeGame.currentRound}`);

      return { success: true, stats };
    } catch (error) {
      console.error('[Trivia] Hint request failed:', error);
      return { success: false, message: 'Internal error processing hint.' };
    }
  }

  /**
   * Join a trivia event
   */
  joinGame(userId: string, username: string): void {
    if (this.players.has(userId)) return;

    this.players.set(userId, {
      userId,
      username,
      isEliminated: false,
      lives: 0, // Should be fetched from profile/credits later
      score: 0
    });
  }

  /**
   * Submit an answer
   */
  submitAnswer(userId: string, answer: string): void {
    const player = this.players.get(userId);
    if (!player || player.isEliminated) return;

    // Only allow answers before the round ends
    if (this.activeGame?.endsAt && Date.now() < this.activeGame.endsAt) {
      player.currentAnswer = answer;
      player.lastAnswerTimestamp = Date.now();
    }
  }

  /**
   * Get Ape-In heat map
   */
  getApeInStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const player of this.players.values()) {
      if (player.currentAnswer) {
        stats[player.currentAnswer] = (stats[player.currentAnswer] || 0) + 1;
      }
    }
    return stats;
  }
}

export const triviaManager = new GlobalTriviaManager();
