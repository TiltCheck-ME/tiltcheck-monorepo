// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-15
/**
 * Trivia Manager
 * Shared question-bank-driven trivia engine for the game-arena service.
 * Manages game lifecycle, round timers, scoring, and eventRouter emissions.
 */

import { v4 as uuidv4 } from 'uuid';
import { eventRouter } from '@tiltcheck/event-router';
import {
  SHARED_TRIVIA_TOPICS,
  TRIVIA_QUESTION_BANK,
  type SharedTriviaQuestion,
  type SharedTriviaTopic,
} from '@tiltcheck/shared';
import type { TriviaGameSettings } from '@tiltcheck/types';

interface StoredQuestion {
  id: string;
  question: string;
  choices: string[];
  answer: string;
  category: string;
  theme?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

interface PlayerState {
  userId: string;
  username: string;
  score: number;
  answers: Map<string, string>;
  eliminated: boolean;
  shieldUsed: boolean;
  buyBackUsed: boolean;
}

interface ActiveGame {
  gameId: string;
  settings: TriviaGameSettings;
  questions: StoredQuestion[];
  players: Map<string, PlayerState>;
  currentRound: number;
  roundTimerId: ReturnType<typeof setTimeout> | null;
  startedAt: number;
}

const TRIVIA_CATEGORY_ALIASES: Record<string, SharedTriviaTopic[]> = {
  general: SHARED_TRIVIA_TOPICS,
  casino: ['casino'],
  crypto: ['crypto'],
  degen: ['degen'],
  'degen-culture': ['degen'],
  gambling_math: ['gambling_math'],
  math: ['gambling_math'],
  strategy: ['strategy'],
  'gambling-strategy': ['casino', 'gambling_math', 'strategy'],
};

function toStoredQuestion(question: SharedTriviaQuestion): StoredQuestion {
  return {
    id: question.id,
    question: question.text,
    choices: [
      question.choices.A,
      question.choices.B,
      question.choices.C,
      question.choices.D,
    ],
    answer: question.choices[question.answer],
    category: question.topic,
    difficulty: 'medium',
    explanation: question.explanation,
  };
}

function getQuestionsForCategory(category: string): StoredQuestion[] {
  const topics = TRIVIA_CATEGORY_ALIASES[category] ?? SHARED_TRIVIA_TOPICS;
  return topics.flatMap((topic) => TRIVIA_QUESTION_BANK[topic].map(toStoredQuestion));
}

let activeGame: ActiveGame | null = null;
let _clientId = '';
let _token = '';

function pickQuestions(category: string, count: number): StoredQuestion[] {
  const pool = getQuestionsForCategory(category);

  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

function emitRoundStart(game: ActiveGame): void {
  if (game.currentRound >= game.questions.length) {
    endGameWithResults(game);
    return;
  }

  const q = game.questions[game.currentRound];
  const ROUND_DURATION_MS = 20_000;

  eventRouter.publish(
    'trivia.round.start',
    'game-arena',
    {
      question: {
        id: q.id,
        question: q.question,
        choices: q.choices,
        category: q.category,
        theme: q.theme,
        difficulty: q.difficulty,
      },
      roundNumber: game.currentRound + 1,
      totalRounds: game.settings.totalRounds,
      endsAt: Date.now() + ROUND_DURATION_MS,
    },
  );

  game.roundTimerId = setTimeout(() => {
    revealRound(game);
  }, ROUND_DURATION_MS);
}

function revealRound(game: ActiveGame): void {
  const q = game.questions[game.currentRound];
  const stats: Record<string, { count: number; correct: boolean }> = {};

  for (const choice of q.choices) {
    stats[choice] = { count: 0, correct: choice === q.answer };
  }

  for (const player of game.players.values()) {
    if (player.eliminated) continue;
    const chosen = player.answers.get(q.id);
    if (chosen && stats[chosen]) {
      stats[chosen].count++;
    }

    if (chosen === q.answer) {
      player.score += 1;
    } else if (!player.shieldUsed) {
      player.eliminated = true;
    } else {
      player.shieldUsed = false;
      eventRouter.publish(
        'trivia.player.reinstated',
        'game-arena',
        { gameId: game.gameId, userId: player.userId, username: player.username },
      );
    }
  }

  eventRouter.publish(
    'trivia.round.reveal',
    'game-arena',
    {
      questionId: q.id,
      correctChoice: q.answer,
      explanation: q.explanation,
      stats,
    },
  );

  game.currentRound++;

  setTimeout(() => {
    if (!activeGame || activeGame.gameId !== game.gameId) return;
    emitRoundStart(game);
  }, 5_000);
}

function endGameWithResults(game: ActiveGame): void {
  const sorted = [...game.players.values()]
    .filter((player) => !player.eliminated || player.score > 0)
    .sort((a, b) => b.score - a.score);

  const winners = sorted.slice(0, 3).map((player, index) => ({
    userId: player.userId,
    username: player.username,
    score: player.score,
    rank: index + 1,
  }));

  const finalScores = sorted.map((player) => ({
    userId: player.userId,
    username: player.username,
    score: player.score,
  }));

  eventRouter.publish(
    'trivia.completed',
    'game-arena',
    { gameId: game.gameId, winners, finalScores },
  );

  activeGame = null;
  console.log(`[TriviaManager] Game ${game.gameId} completed. Winner: ${winners[0]?.username ?? 'none'}`);
}

export const triviaManager = {
  initializeShop: (clientId: string, token: string): void => {
    _clientId = clientId;
    _token = token;
    console.log('[TriviaManager] Shop initialized');
  },

  scheduleGame: async (
    options: Partial<TriviaGameSettings> & { totalRounds?: number },
  ): Promise<{ success: boolean; message: string }> => {
    if (activeGame) {
      return { success: false, message: 'A trivia game is already in progress.' };
    }

    const settings: TriviaGameSettings = {
      startTime: options.startTime ?? Date.now() + 5_000,
      category: options.category ?? 'general',
      theme: options.theme ?? 'Random Degen Knowledge',
      totalRounds: options.totalRounds ?? 12,
      prizePool: options.prizePool ?? 0,
    };

    const gameId = uuidv4();
    const questions = pickQuestions(settings.category, settings.totalRounds);

    if (questions.length === 0) {
      return { success: false, message: `No questions available for category: ${settings.category}` };
    }

    activeGame = {
      gameId,
      settings,
      questions,
      players: new Map(),
      currentRound: 0,
      roundTimerId: null,
      startedAt: settings.startTime,
    };

    eventRouter.publish(
      'trivia.started',
      'game-arena',
      { gameId, ...settings },
    );

    console.log(`[TriviaManager] Game ${gameId} starting in ${settings.startTime - Date.now()}ms | ${questions.length} rounds | category: ${settings.category}`);

    setTimeout(() => {
      if (activeGame?.gameId === gameId) {
        emitRoundStart(activeGame);
      }
    }, Math.max(0, settings.startTime - Date.now()));

    return { success: true, message: `Trivia game scheduled. Starting soon with ${questions.length} rounds.` };
  },

  endGame: (): void => {
    if (activeGame?.roundTimerId) clearTimeout(activeGame.roundTimerId);
    activeGame = null;
    console.log('[TriviaManager] Game forcibly ended');
  },

  isActive: (): boolean => activeGame !== null,

  submitAnswer: (userId: string, answer: string): void => {
    if (!activeGame) return;
    const q = activeGame.questions[activeGame.currentRound];
    if (!q) return;

    const player = activeGame.players.get(userId);
    if (!player || player.eliminated) return;
    if (player.answers.has(q.id)) return;

    player.answers.set(q.id, answer);
  },

  joinGame: (userId: string, username: string): { success: boolean; message: string } => {
    if (!activeGame) return { success: false, message: 'No game in progress.' };
    if (activeGame.players.has(userId)) return { success: true, message: 'Already in game.' };

    activeGame.players.set(userId, {
      userId,
      username,
      score: 0,
      answers: new Map(),
      eliminated: false,
      shieldUsed: false,
      buyBackUsed: false,
    });

    return { success: true, message: `Joined game ${activeGame.gameId}` };
  },

  requestApeIn: async (
    userId: string,
  ): Promise<{ success: boolean; message: string; stats?: Record<string, number> }> => {
    if (!activeGame) return { success: false, message: 'No game in progress.' };
    const q = activeGame.questions[activeGame.currentRound];
    if (!q) return { success: false, message: 'No active round.' };

    const stats: Record<string, number> = {};
    for (const choice of q.choices) {
      stats[choice] = 0;
    }

    for (const player of activeGame.players.values()) {
      const chosen = player.answers.get(q.id);
      if (chosen && stats[chosen] !== undefined) {
        stats[chosen]++;
      }
    }

    return { success: true, message: 'Ape In stats retrieved.', stats };
  },

  requestShield: async (
    userId: string,
  ): Promise<{ success: boolean; message: string; eliminated?: string[] }> => {
    if (!activeGame) return { success: false, message: 'No game in progress.' };
    const player = activeGame.players.get(userId);
    if (!player) return { success: false, message: 'Not in current game.' };
    if (player.shieldUsed) return { success: false, message: 'Shield already used.' };

    player.shieldUsed = true;
    const eliminated = [...activeGame.players.values()]
      .filter((candidate) => candidate.eliminated)
      .map((candidate) => candidate.userId);

    return { success: true, message: 'Shield activated — you are protected for this round.', eliminated };
  },

  processBuyBack: async (userId: string): Promise<{ success: boolean; message: string }> => {
    if (!activeGame) return { success: false, message: 'No game in progress.' };
    const player = activeGame.players.get(userId);
    if (!player) return { success: false, message: 'Not in current game.' };
    if (!player.eliminated) return { success: false, message: 'You are not eliminated.' };
    if (player.buyBackUsed) return { success: false, message: 'Buy-back already used.' };

    player.eliminated = false;
    player.buyBackUsed = true;

    eventRouter.publish(
      'trivia.player.reinstated',
      'game-arena',
      { gameId: activeGame.gameId, userId: player.userId, username: player.username },
    );

    return { success: true, message: 'Buy-back processed. You are back in the game.' };
  },
};
