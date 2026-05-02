// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18
/**
 * Trivia Manager
 * Shared question-bank-driven trivia engine for the game-arena service.
 * Manages game lifecycle, durable state snapshots, scoring, and eventRouter emissions.
 */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { eventRouter } from '@tiltcheck/event-router';
import {
  SHARED_TRIVIA_TOPICS,
  TRIVIA_QUESTION_BANK,
  type SharedTriviaQuestion,
  type SharedTriviaTopic,
} from '@tiltcheck/shared';
import type { TriviaGameSettings } from '@tiltcheck/types';
import { redisClient } from './redis-client.js';

const REDIS_SNAPSHOT_KEY = 'game-arena:trivia:snapshot';
const REDIS_EVENTS_CHANNEL = 'game-arena:trivia:events';
let preferFilePersistence = false;


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
  shieldConsumed: boolean;
  shieldQuestionId: string | null;
  buyBackUsed: boolean;
}

interface ActiveGame {
  gameId: string;
  settings: TriviaGameSettings;
  questions: StoredQuestion[];
  players: Map<string, PlayerState>;
  currentRound: number;
  roundEndsAt: number | null;
  roundTimerId: ReturnType<typeof setTimeout> | null;
  startTimerId: ReturnType<typeof setTimeout> | null;
  nextRoundTimerId: ReturnType<typeof setTimeout> | null;
  startedAt: number;
}

interface PersistedPlayerState {
  userId: string;
  username: string;
  score: number;
  answers: Array<{ questionId: string; answer: string }>;
  eliminated: boolean;
  shieldConsumed: boolean;
  shieldQuestionId: string | null;
  buyBackUsed: boolean;
}

interface PersistedActiveGame {
  gameId: string;
  settings: TriviaGameSettings;
  questions: StoredQuestion[];
  players: PersistedPlayerState[];
  currentRound: number;
  roundEndsAt: number | null;
  startedAt: number;
}

interface TriviaWinner {
  userId: string;
  username: string;
  score: number;
  rank: number;
}

interface TriviaFinalScore {
  userId: string;
  username: string;
  score: number;
  eliminated: boolean;
}

interface TriviaLivePlayerState {
  userId: string;
  username: string;
  score: number;
  eliminated: boolean;
  shieldConsumed: boolean;
  buyBackUsed: boolean;
}

interface TriviaCompletedGameRecord {
  gameId: string;
  settings: TriviaGameSettings;
  completedAt: number;
  winners: TriviaWinner[];
  finalScores: TriviaFinalScore[];
}

interface TriviaAuditRecord {
  id: string;
  gameId: string;
  type:
    | 'game.scheduled'
    | 'game.reset'
    | 'player.joined'
    | 'answer.submitted'
    | 'round.started'
    | 'round.revealed'
    | 'player.reinstated'
    | 'powerup.shield.activated'
    | 'powerup.buy-back'
    | 'game.completed';
  occurredAt: number;
  data: Record<string, unknown>;
}

interface TriviaSnapshot {
  version: 1;
  savedAt: number;
  activeGame: PersistedActiveGame | null;
  completedGames: TriviaCompletedGameRecord[];
  auditLog: TriviaAuditRecord[];
}

interface TriviaPersistenceStats {
  lastSavedAt: number | null;
  lastRestoredAt: number | null;
  persistErrorCount: number;
  restoreErrorCount: number;
  restoredActiveGame: boolean;
  auditEventCount: number;
  completedGameCount: number;
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

const TRIVIA_ANSWER_KEYS = ['A', 'B', 'C', 'D'] as const;
const ROUND_DURATION_MS = 20_000;
const ROUND_REVEAL_DELAY_MS = 5_000;
const MAX_COMPLETED_GAMES = 25;
const MAX_AUDIT_RECORDS = 250;

let activeGame: ActiveGame | null = null;
let completedGames: TriviaCompletedGameRecord[] = [];
let auditLog: TriviaAuditRecord[] = [];
let persistencePath = 'data/trivia-state.json';
let _clientId = '';
let _token = '';
const persistenceStats: TriviaPersistenceStats = {
  lastSavedAt: null,
  lastRestoredAt: null,
  persistErrorCount: 0,
  restoreErrorCount: 0,
  restoredActiveGame: false,
  auditEventCount: 0,
  completedGameCount: 0,
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

function isRoundActive(game: ActiveGame): boolean {
  return game.roundEndsAt !== null && Date.now() < game.roundEndsAt;
}

function normalizeSubmittedAnswer(question: StoredQuestion, submittedAnswer: string): string | null {
  if (typeof submittedAnswer !== 'string') {
    return null;
  }

  const normalizedAnswer = submittedAnswer.trim();
  if (!normalizedAnswer) {
    return null;
  }

  const directChoice = question.choices.find((choice) => choice === normalizedAnswer);
  if (directChoice) {
    return directChoice;
  }

  const answerKeyIndex = TRIVIA_ANSWER_KEYS.indexOf(normalizedAnswer.toUpperCase() as typeof TRIVIA_ANSWER_KEYS[number]);
  if (answerKeyIndex !== -1 && answerKeyIndex < question.choices.length) {
    return question.choices[answerKeyIndex];
  }

  if (/^\d+$/.test(normalizedAnswer)) {
    const choiceIndex = Number.parseInt(normalizedAnswer, 10);
    if (choiceIndex >= 0 && choiceIndex < question.choices.length) {
      return question.choices[choiceIndex];
    }
  }

  return null;
}

function pickQuestions(category: string, count: number): StoredQuestion[] {
  const pool = getQuestionsForCategory(category);
  const shuffled = [...pool];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

function appendAuditRecord(
  type: TriviaAuditRecord['type'],
  gameId: string,
  data: Record<string, unknown>
): void {
  auditLog.push({
    id: uuidv4(),
    gameId,
    type,
    occurredAt: Date.now(),
    data,
  });

  if (auditLog.length > MAX_AUDIT_RECORDS) {
    auditLog = auditLog.slice(-MAX_AUDIT_RECORDS);
  }

  persistenceStats.auditEventCount = auditLog.length;
}

function clonePlayerState(player: PlayerState): PlayerState {
  return {
    ...player,
    answers: new Map(player.answers),
  };
}

function toLivePlayerState(player: PlayerState): TriviaLivePlayerState {
  return {
    userId: player.userId,
    username: player.username,
    score: player.score,
    eliminated: player.eliminated,
    shieldConsumed: player.shieldConsumed,
    buyBackUsed: player.buyBackUsed,
  };
}

function buildLivePlayers(players: Map<string, PlayerState>): TriviaLivePlayerState[] {
  return [...players.values()]
    .map(toLivePlayerState)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.eliminated !== right.eliminated) {
        return Number(left.eliminated) - Number(right.eliminated);
      }

      return left.username.localeCompare(right.username);
    });
}

function buildLiveLeaderboard(
  players: Map<string, PlayerState>,
): Array<{ username: string; score: number }> {
  return buildLivePlayers(players)
    .map((player) => ({
      username: player.username,
      score: player.score,
    }))
    .slice(0, 8);
}

function clonePlayers(players: Map<string, PlayerState>): Map<string, PlayerState> {
  return new Map(
    [...players.entries()].map(([userId, player]) => [userId, clonePlayerState(player)])
  );
}

function serializeActiveGame(game: ActiveGame | null): PersistedActiveGame | null {
  if (!game) {
    return null;
  }

  return {
    gameId: game.gameId,
    settings: game.settings,
    questions: game.questions,
    players: [...game.players.values()].map((player) => ({
      userId: player.userId,
      username: player.username,
      score: player.score,
      answers: [...player.answers.entries()].map(([questionId, answer]) => ({ questionId, answer })),
      eliminated: player.eliminated,
      shieldConsumed: player.shieldConsumed,
      shieldQuestionId: player.shieldQuestionId,
      buyBackUsed: player.buyBackUsed,
    })),
    currentRound: game.currentRound,
    roundEndsAt: game.roundEndsAt,
    startedAt: game.startedAt,
  };
}

function deserializeActiveGame(snapshot: PersistedActiveGame): ActiveGame {
  return {
    gameId: snapshot.gameId,
    settings: snapshot.settings,
    questions: snapshot.questions,
    players: new Map(
      snapshot.players.map((player) => [
        player.userId,
        {
          userId: player.userId,
          username: player.username,
          score: player.score,
          answers: new Map(player.answers.map((entry) => [entry.questionId, entry.answer])),
          eliminated: player.eliminated,
          shieldConsumed: player.shieldConsumed,
          shieldQuestionId: player.shieldQuestionId,
          buyBackUsed: player.buyBackUsed,
        },
      ])
    ),
    currentRound: snapshot.currentRound,
    roundEndsAt: snapshot.roundEndsAt,
    roundTimerId: null,
    startTimerId: null,
    nextRoundTimerId: null,
    startedAt: snapshot.startedAt,
  };
}

function buildSnapshot(): TriviaSnapshot {
  return {
    version: 1,
    savedAt: Date.now(),
    activeGame: serializeActiveGame(activeGame),
    completedGames,
    auditLog,
  };
}

function clearTimers(game: ActiveGame | null): void {
  if (!game) {
    return;
  }

  if (game.startTimerId) {
    clearTimeout(game.startTimerId);
    game.startTimerId = null;
  }

  if (game.roundTimerId) {
    clearTimeout(game.roundTimerId);
    game.roundTimerId = null;
  }

  if (game.nextRoundTimerId) {
    clearTimeout(game.nextRoundTimerId);
    game.nextRoundTimerId = null;
  }
}

function resetInMemoryState(): void {
  clearTimers(activeGame);
  activeGame = null;
  completedGames = [];
  auditLog = [];
  persistenceStats.restoredActiveGame = false;
  persistenceStats.auditEventCount = 0;
  persistenceStats.completedGameCount = 0;
}

async function persistState(): Promise<void> {
  try {
    const snapshot = buildSnapshot();
    const snapshotJson = JSON.stringify({ ...snapshot });

    // If tests or callers explicitly requested file-backed persistence, prefer that unless force flag set
    const forceRedis = process.env.TRIVIA_FORCE_REDIS === 'true';

    if (preferFilePersistence && !forceRedis) {
      await mkdir(path.dirname(persistencePath), { recursive: true });
      await writeFile(persistencePath, snapshotJson, 'utf8');
      persistenceStats.lastSavedAt = Date.now();
      persistenceStats.completedGameCount = completedGames.length;
      return;
    }

    if (redisClient && redisClient.isAvailable()) {
      // Persist atomically to Redis
      await redisClient.setSnapshot(REDIS_SNAPSHOT_KEY, snapshotJson);
      persistenceStats.lastSavedAt = Date.now();
      persistenceStats.completedGameCount = completedGames.length;

      // Publish a lightweight event for subscribers
      try {
        const sizeBytes = Buffer.byteLength(snapshotJson, 'utf8');
        await redisClient.publish(REDIS_EVENTS_CHANNEL, { type: 'snapshot.updated', savedAt: persistenceStats.lastSavedAt, sizeBytes });
      } catch (pubErr) {
        // Non-fatal: log and continue
        console.debug('[TriviaManager] Failed to publish snapshot update event:', pubErr);
      }

      return;
    }

    // Fallback to file-based persistence
    await mkdir(path.dirname(persistencePath), { recursive: true });
    await writeFile(persistencePath, snapshotJson, 'utf8');
    persistenceStats.lastSavedAt = Date.now();
    persistenceStats.completedGameCount = completedGames.length;
  } catch (error) {
    persistenceStats.persistErrorCount++;
    console.warn('[TriviaManager] Failed to persist trivia snapshot:', error);
    throw error;
  }
}

function scheduleStartTimer(game: ActiveGame, delayMs: number): void {
  if (game.startTimerId) {
    clearTimeout(game.startTimerId);
    game.startTimerId = null;
  }

  game.startTimerId = setTimeout(async () => {
    await startScheduledGame(game.gameId);
  }, Math.max(0, delayMs));
}

function scheduleRevealTimer(game: ActiveGame, questionId: string, delayMs: number): void {
  if (game.roundTimerId) {
    clearTimeout(game.roundTimerId);
  }

  game.roundTimerId = setTimeout(async () => {
    await revealRound(game.gameId, questionId);
  }, Math.max(0, delayMs));
}

function buildCompletedRecord(game: ActiveGame): TriviaCompletedGameRecord {
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
    eliminated: player.eliminated,
  }));

  return {
    gameId: game.gameId,
    settings: game.settings,
    completedAt: Date.now(),
    winners,
    finalScores,
  };
}

async function emitRoundStart(game: ActiveGame): Promise<boolean> {
  if (!activeGame || activeGame.gameId !== game.gameId) {
    return false;
  }

  if (game.currentRound >= game.questions.length) {
    return endGameWithResults(game.gameId);
  }

  const question = game.questions[game.currentRound];
  const previousRoundEndsAt = game.roundEndsAt;
  const roundEndsAt = Date.now() + ROUND_DURATION_MS;
  game.roundEndsAt = roundEndsAt;
  game.startTimerId = null;

  appendAuditRecord('round.started', game.gameId, {
    questionId: question.id,
    roundNumber: game.currentRound + 1,
    totalRounds: game.settings.totalRounds,
    endsAt: roundEndsAt,
  });

  try {
    await persistState();
  } catch {
    game.roundEndsAt = previousRoundEndsAt;
    return false;
  }

  await eventRouter.publish(
    'trivia.round.start',
    'game-arena',
    {
      gameId: game.gameId,
      question: {
        id: question.id,
        question: question.question,
        choices: question.choices,
        category: question.category,
        theme: question.theme,
        difficulty: question.difficulty,
      },
      prizePool: game.settings.prizePool,
      roundNumber: game.currentRound + 1,
      totalRounds: game.settings.totalRounds,
      endsAt: roundEndsAt,
      leaderboard: buildLiveLeaderboard(game.players),
      players: buildLivePlayers(game.players),
    },
  );

  scheduleRevealTimer(game, question.id, ROUND_DURATION_MS);
  return true;
}

async function revealRound(gameId: string, expectedQuestionId: string): Promise<boolean> {
  if (!activeGame || activeGame.gameId !== gameId) {
    return false;
  }

  const game = activeGame;
  const question = game.questions[game.currentRound];
  if (!question || question.id !== expectedQuestionId) {
    return false;
  }

  const previousPlayers = clonePlayers(game.players);
  const previousRoundEndsAt = game.roundEndsAt;
  const previousCurrentRound = game.currentRound;
  game.roundEndsAt = null;
  game.roundTimerId = null;
  const stats: Record<string, { count: number; correct: boolean }> = {};
  const reinstatedPlayers: Array<{ userId: string; username: string }> = [];

  for (const choice of question.choices) {
    stats[choice] = { count: 0, correct: choice === question.answer };
  }

  for (const player of game.players.values()) {
    if (player.eliminated) {
      continue;
    }

    const chosen = player.answers.get(question.id);
    const shieldActiveForRound = player.shieldQuestionId === question.id;

    if (chosen && stats[chosen]) {
      stats[chosen].count++;
    }

    if (chosen === question.answer) {
      player.score += 1;
    } else if (!shieldActiveForRound) {
      player.eliminated = true;
    } else {
      player.shieldQuestionId = null;
      reinstatedPlayers.push({ userId: player.userId, username: player.username });
    }

    if (shieldActiveForRound) {
      player.shieldQuestionId = null;
    }
  }

  game.currentRound++;

  appendAuditRecord('round.revealed', game.gameId, {
    questionId: question.id,
    roundNumber: previousCurrentRound + 1,
    correctChoice: question.answer,
    stats,
  });

  for (const player of reinstatedPlayers) {
    appendAuditRecord('player.reinstated', game.gameId, player);
  }

  try {
    await persistState();
  } catch {
    game.players = previousPlayers;
    game.roundEndsAt = previousRoundEndsAt;
    game.currentRound = previousCurrentRound;
    return false;
  }

  for (const player of reinstatedPlayers) {
    await eventRouter.publish(
      'trivia.player.reinstated',
      'game-arena',
      { gameId: game.gameId, userId: player.userId, username: player.username },
    );
  }

  await eventRouter.publish(
    'trivia.round.reveal',
    'game-arena',
    {
      gameId: game.gameId,
      questionId: question.id,
      correctChoice: question.answer,
      explanation: question.explanation,
      stats,
      leaderboard: buildLiveLeaderboard(game.players),
      players: buildLivePlayers(game.players),
    },
  );

  if (game.currentRound >= game.questions.length) {
    return endGameWithResults(game.gameId);
  }

  if (game.nextRoundTimerId) {
    clearTimeout(game.nextRoundTimerId);
  }

  game.nextRoundTimerId = setTimeout(async () => {
    game.nextRoundTimerId = null;
    if (!activeGame || activeGame.gameId !== game.gameId) {
      return;
    }

    await emitRoundStart(game);
  }, ROUND_REVEAL_DELAY_MS);

  return true;
}

async function endGameWithResults(gameId: string): Promise<boolean> {
  if (!activeGame || activeGame.gameId !== gameId) {
    return false;
  }

  const game = activeGame;
  const completedRecord = buildCompletedRecord(game);
  clearTimers(game);
  activeGame = null;
  completedGames = [...completedGames, completedRecord].slice(-MAX_COMPLETED_GAMES);
  appendAuditRecord('game.completed', game.gameId, {
    completedAt: completedRecord.completedAt,
    winners: completedRecord.winners,
  });

  try {
    await persistState();
  } catch {
    activeGame = game;
    completedGames = completedGames.filter((record) => record.gameId !== completedRecord.gameId);
    return false;
  }

  await eventRouter.publish(
    'trivia.completed',
    'game-arena',
    {
      gameId: completedRecord.gameId,
      winners: completedRecord.winners,
      finalScores: completedRecord.finalScores,
    },
  );

  console.log(`[TriviaManager] Game ${game.gameId} completed. Winner: ${completedRecord.winners[0]?.username ?? 'none'}`);
  return true;
}

async function startScheduledGame(gameId: string): Promise<boolean> {
  if (!activeGame || activeGame.gameId !== gameId) {
    return false;
  }

  return emitRoundStart(activeGame);
}

async function restoreState(): Promise<void> {
  try {
    const forceRedis = process.env.TRIVIA_FORCE_REDIS === 'true';

    // If we are not forced to use file persistence, try Redis first when available
    if (!preferFilePersistence || forceRedis) {
      try {
        if (redisClient && redisClient.isAvailable()) {
          const raw = await redisClient.getSnapshot(REDIS_SNAPSHOT_KEY);
          if (raw) {
            console.debug('[TriviaManager] Restoring trivia snapshot from Redis');
            const snapshot = JSON.parse(raw) as TriviaSnapshot;

            if (snapshot.version !== 1) {
              console.warn('[TriviaManager] Ignoring unknown trivia snapshot version from Redis');
            } else {
              completedGames = snapshot.completedGames || [];
              auditLog = snapshot.auditLog || [];
              persistenceStats.auditEventCount = auditLog.length;
              persistenceStats.completedGameCount = completedGames.length;
              persistenceStats.lastRestoredAt = Date.now();

              if (snapshot.activeGame) {
                activeGame = deserializeActiveGame(snapshot.activeGame);
                persistenceStats.restoredActiveGame = true;

                const restoreDelay =
                  activeGame.roundEndsAt !== null
                    ? activeGame.roundEndsAt - Date.now()
                    : activeGame.startedAt - Date.now();

                if (activeGame.roundEndsAt !== null) {
                  const currentQuestion = activeGame.questions[activeGame.currentRound];
                  if (currentQuestion) {
                    scheduleRevealTimer(activeGame, currentQuestion.id, restoreDelay);
                  } else {
                    await endGameWithResults(activeGame.gameId);
                  }
                } else {
                  scheduleStartTimer(activeGame, restoreDelay);
                }

                console.log(`[TriviaManager] Restored trivia game ${activeGame.gameId} from Redis`);
                return;
              }
            }
          }
        }
      } catch (redisErr) {
        persistenceStats.restoreErrorCount++;
        console.debug('[TriviaManager] Redis restore failed, falling back to file-based persistence:', redisErr);
      }

      // Migration: if no Redis snapshot exists but a file snapshot exists, copy it to Redis
      try {
        const fileStat = await stat(persistencePath);
        if (fileStat && redisClient && redisClient.isAvailable()) {
          try {
            const rawFile = await readFile(persistencePath, 'utf8');
            await redisClient.setSnapshot(REDIS_SNAPSHOT_KEY, rawFile);
            console.debug('[TriviaManager] Migrated file snapshot to Redis');
          } catch (migErr) {
            console.debug('[TriviaManager] Migration to Redis failed:', migErr);
          }
        }
      } catch {
        // file does not exist or cannot be read; continue to file fallback below
      }
    }

    // File-based restore (fallback)
    try {
      const raw = await readFile(persistencePath, 'utf8');
      const snapshot = JSON.parse(raw) as TriviaSnapshot;

      if (snapshot.version !== 1) {
        console.warn('[TriviaManager] Ignoring unknown trivia snapshot version');
        return;
      }

      completedGames = snapshot.completedGames || [];
      auditLog = snapshot.auditLog || [];
      persistenceStats.auditEventCount = auditLog.length;
      persistenceStats.completedGameCount = completedGames.length;
      persistenceStats.lastRestoredAt = Date.now();

      if (!snapshot.activeGame) {
        persistenceStats.restoredActiveGame = false;
        return;
      }

      activeGame = deserializeActiveGame(snapshot.activeGame);
      persistenceStats.restoredActiveGame = true;

      const restoreDelay =
        activeGame.roundEndsAt !== null
          ? activeGame.roundEndsAt - Date.now()
          : activeGame.startedAt - Date.now();

      if (activeGame.roundEndsAt !== null) {
        const currentQuestion = activeGame.questions[activeGame.currentRound];
        if (currentQuestion) {
          scheduleRevealTimer(activeGame, currentQuestion.id, restoreDelay);
        } else {
          await endGameWithResults(activeGame.gameId);
        }
      } else {
        scheduleStartTimer(activeGame, restoreDelay);
      }

      console.log(`[TriviaManager] Restored trivia game ${activeGame.gameId} from file`);
      return;
    } catch (error: any) {
      persistenceStats.restoreErrorCount++;
      if (error?.code !== 'ENOENT') {
        console.warn('[TriviaManager] Failed to restore trivia snapshot:', error);
      }
    }
  } catch (error: any) {
    persistenceStats.restoreErrorCount++;
    console.warn('[TriviaManager] Failed to restore trivia snapshot (outer):', error);
  }
}

export const triviaManager = {
  initialize: async (options: { stateFilePath?: string } = {}): Promise<void> => {
    if (options.stateFilePath) {
      persistencePath = options.stateFilePath;
    }

    resetInMemoryState();
    await restoreState();
  },

  initializeShop: (clientId: string, token: string): void => {
    _clientId = clientId;
    _token = token;
    console.log('[TriviaManager] Shop initialized');
  },

  scheduleGame: async (
    options: Partial<TriviaGameSettings> & { totalRounds?: number },
  ): Promise<{ success: boolean; message: string; gameId?: string }> => {
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

    const nextGame: ActiveGame = {
      gameId,
      settings,
      questions,
      players: new Map(),
      currentRound: 0,
      roundEndsAt: null,
      roundTimerId: null,
      startTimerId: null,
      nextRoundTimerId: null,
      startedAt: settings.startTime,
    };

    activeGame = nextGame;
    appendAuditRecord('game.scheduled', gameId, {
      category: settings.category,
      theme: settings.theme,
      totalRounds: settings.totalRounds,
      startTime: settings.startTime,
      questionCount: questions.length,
    });

    try {
      scheduleStartTimer(nextGame, settings.startTime - Date.now());
      await persistState();
      await eventRouter.publish(
        'trivia.started',
        'game-arena',
        { gameId, ...settings },
      );
    } catch {
      clearTimers(nextGame);
      activeGame = null;
      return { success: false, message: 'Trivia scheduling failed before the game was armed.' };
    }

    console.log(`[TriviaManager] Game ${gameId} starting in ${settings.startTime - Date.now()}ms | ${questions.length} rounds | category: ${settings.category}`);
    return {
      success: true,
      message: `Trivia game scheduled. Starting soon with ${questions.length} rounds.`,
      gameId,
    };
  },

  endGame: async (): Promise<void> => {
    if (!activeGame) {
      return;
    }

    const game = activeGame;
    clearTimers(game);
    activeGame = null;
    appendAuditRecord('game.reset', game.gameId, { resetAt: Date.now() });

    try {
      await persistState();
    } catch {
      activeGame = game;
      return;
    }

    console.log('[TriviaManager] Game forcibly ended');
  },

  isActive: (): boolean => activeGame !== null,

  getLiveState: (): {
    gameId: string;
    settings: TriviaGameSettings;
    roundNumber: number;
    totalRounds: number;
    playerCount: number;
    players: TriviaLivePlayerState[];
    leaderboard: Array<{ username: string; score: number }>;
    currentQuestion: {
      id: string;
      question: string;
      choices: string[];
      category: string;
      theme?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
    } | null;
    endsAt: number | null;
  } | null => {
    if (!activeGame) {
      return null;
    }

    const currentQuestion = activeGame.questions[activeGame.currentRound];

    return {
      gameId: activeGame.gameId,
      settings: activeGame.settings,
      roundNumber: activeGame.currentRound + 1,
      totalRounds: activeGame.settings.totalRounds,
      playerCount: activeGame.players.size,
      players: buildLivePlayers(activeGame.players),
      leaderboard: buildLiveLeaderboard(activeGame.players),
      currentQuestion: currentQuestion
        ? {
            id: currentQuestion.id,
            question: currentQuestion.question,
            choices: currentQuestion.choices,
            category: currentQuestion.category,
            theme: currentQuestion.theme,
            difficulty: currentQuestion.difficulty,
          }
        : null,
      endsAt: activeGame.roundEndsAt,
    };
  },

  getAuditSnapshot: (): {
    liveState: {
      gameId: string;
      settings: TriviaGameSettings;
      roundNumber: number;
      totalRounds: number;
      playerCount: number;
      players: TriviaLivePlayerState[];
      leaderboard: Array<{ username: string; score: number }>;
      currentQuestion: {
        id: string;
        question: string;
        choices: string[];
        category: string;
        theme?: string;
        difficulty?: 'easy' | 'medium' | 'hard';
      } | null;
      endsAt: number | null;
    } | null;
    recentResults: TriviaCompletedGameRecord[];
    recentAuditEvents: TriviaAuditRecord[];
  } => ({
      liveState: activeGame
        ? {
            gameId: activeGame.gameId,
            settings: activeGame.settings,
            roundNumber: activeGame.currentRound + 1,
            totalRounds: activeGame.settings.totalRounds,
            playerCount: activeGame.players.size,
            players: buildLivePlayers(activeGame.players),
            leaderboard: buildLiveLeaderboard(activeGame.players),
            currentQuestion: activeGame.questions[activeGame.currentRound]
              ? {
                  id: activeGame.questions[activeGame.currentRound].id,
                question: activeGame.questions[activeGame.currentRound].question,
                choices: activeGame.questions[activeGame.currentRound].choices,
                category: activeGame.questions[activeGame.currentRound].category,
                theme: activeGame.questions[activeGame.currentRound].theme,
                difficulty: activeGame.questions[activeGame.currentRound].difficulty,
              }
            : null,
          endsAt: activeGame.roundEndsAt,
        }
      : null,
    recentResults: [...completedGames].slice(-10).reverse(),
    recentAuditEvents: [...auditLog].slice(-25).reverse(),
  }),

  getPersistenceStatus: async (): Promise<{
    stateFilePath: string;
    snapshotExists: boolean;
    snapshotSizeBytes: number | null;
    snapshotModifiedAt: number | null;
    activeGameId: string | null;
    recentCompletedGames: number;
    recentAuditEvents: number;
    stats: TriviaPersistenceStats;
  }> => {
    let snapshotExists = false;
    let snapshotSizeBytes: number | null = null;
    let snapshotModifiedAt: number | null = null;

    try {
      const fileStat = await stat(persistencePath);
      snapshotExists = true;
      snapshotSizeBytes = fileStat.size;
      snapshotModifiedAt = fileStat.mtimeMs;
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        console.warn('[TriviaManager] Failed to stat trivia snapshot:', error);
      }
    }

    return {
      stateFilePath: persistencePath,
      snapshotExists,
      snapshotSizeBytes,
      snapshotModifiedAt,
      activeGameId: activeGame?.gameId ?? null,
      recentCompletedGames: completedGames.length,
      recentAuditEvents: auditLog.length,
      stats: { ...persistenceStats },
    };
  },

  submitAnswer: async (
    userId: string,
    questionId: string,
    answer: string,
  ): Promise<{ success: boolean; message: string }> => {
    if (!activeGame) {
      return { success: false, message: 'No game in progress.' };
    }

    const question = activeGame.questions[activeGame.currentRound];
    if (!question || !isRoundActive(activeGame)) {
      return { success: false, message: 'No active round.' };
    }

    if (question.id !== questionId) {
      return { success: false, message: 'Round already moved.' };
    }

    const player = activeGame.players.get(userId);
    if (!player) {
      return { success: false, message: 'Join the live trivia game first.' };
    }
    if (player.eliminated) {
      return { success: false, message: 'You are eliminated.' };
    }
    if (player.answers.has(question.id)) {
      return { success: false, message: 'Answer already locked in.' };
    }

    const normalizedAnswer = normalizeSubmittedAnswer(question, answer);
    if (!normalizedAnswer) {
      return { success: false, message: 'Invalid answer choice.' };
    }

    player.answers.set(question.id, normalizedAnswer);
    appendAuditRecord('answer.submitted', activeGame.gameId, {
      userId,
      questionId: question.id,
      answer: normalizedAnswer,
    });

    try {
      await persistState();
    } catch {
      player.answers.delete(question.id);
      return { success: false, message: 'Answer could not be durably recorded.' };
    }

    return { success: true, message: 'Answer accepted.' };
  },

  joinGame: async (
    userId: string,
    username: string,
    expectedGameId?: string,
  ): Promise<{ success: boolean; message: string }> => {
    if (!activeGame) {
      return { success: false, message: 'No game in progress.' };
    }
    if (expectedGameId && activeGame.gameId !== expectedGameId) {
      return { success: false, message: 'Game not found.' };
    }
    if (activeGame.players.has(userId)) {
      return { success: true, message: 'Already in game.' };
    }

    activeGame.players.set(userId, {
      userId,
      username,
      score: 0,
      answers: new Map(),
      eliminated: false,
      shieldConsumed: false,
      shieldQuestionId: null,
      buyBackUsed: false,
    });

    appendAuditRecord('player.joined', activeGame.gameId, { userId, username });

    try {
      await persistState();
    } catch {
      activeGame.players.delete(userId);
      return { success: false, message: 'Join could not be durably recorded.' };
    }

    return { success: true, message: `Joined game ${activeGame.gameId}` };
  },

  requestApeIn: async (
    userId: string,
    expectedGameId?: string,
    questionId?: string,
  ): Promise<{ success: boolean; message: string; stats?: Record<string, number> }> => {
    if (!activeGame) {
      return { success: false, message: 'No game in progress.' };
    }
    if (expectedGameId && activeGame.gameId !== expectedGameId) {
      return { success: false, message: 'Game not found.' };
    }

    const question = activeGame.questions[activeGame.currentRound];
    if (!question || !isRoundActive(activeGame)) {
      return { success: false, message: 'No active round.' };
    }
    if (questionId && question.id !== questionId) {
      return { success: false, message: 'Round already moved.' };
    }

    const player = activeGame.players.get(userId);
    if (!player || player.eliminated) {
      return { success: false, message: 'Only active trivia players can use Ape In.' };
    }

    const stats: Record<string, number> = {};
    for (const choice of question.choices) {
      stats[choice] = 0;
    }

    for (const activePlayer of activeGame.players.values()) {
      const chosen = activePlayer.answers.get(question.id);
      if (chosen && stats[chosen] !== undefined) {
        stats[chosen]++;
      }
    }

    return { success: true, message: 'Ape In stats retrieved.', stats };
  },

  requestShield: async (
    userId: string,
    expectedGameId?: string,
    questionId?: string,
  ): Promise<{ success: boolean; message: string; eliminated?: string[] }> => {
    if (!activeGame) {
      return { success: false, message: 'No game in progress.' };
    }
    if (expectedGameId && activeGame.gameId !== expectedGameId) {
      return { success: false, message: 'Game not found.' };
    }

    const question = activeGame.questions[activeGame.currentRound];
    if (!question || !isRoundActive(activeGame)) {
      return { success: false, message: 'No active round.' };
    }
    if (questionId && question.id !== questionId) {
      return { success: false, message: 'Round already moved.' };
    }

    const player = activeGame.players.get(userId);
    if (!player) {
      return { success: false, message: 'Not in current game.' };
    }
    if (player.eliminated) {
      return { success: false, message: 'You are already eliminated.' };
    }
    if (player.shieldConsumed) {
      return { success: false, message: 'Shield already used.' };
    }
    if (player.answers.has(question.id)) {
      return { success: false, message: 'Shield must be activated before answering.' };
    }

    player.shieldConsumed = true;
    player.shieldQuestionId = question.id;
    appendAuditRecord('powerup.shield.activated', activeGame.gameId, {
      userId,
      questionId: question.id,
    });

    const eliminated = [...activeGame.players.values()]
      .filter((candidate) => candidate.eliminated)
      .map((candidate) => candidate.userId);

    try {
      await persistState();
    } catch {
      player.shieldConsumed = false;
      player.shieldQuestionId = null;
      return { success: false, message: 'Shield activation could not be durably recorded.' };
    }

    return { success: true, message: 'Shield activated — you are protected for this round.', eliminated };
  },

  processBuyBack: async (
    userId: string,
    expectedGameId?: string,
  ): Promise<{ success: boolean; message: string }> => {
    if (!activeGame) {
      return { success: false, message: 'No game in progress.' };
    }
    if (expectedGameId && activeGame.gameId !== expectedGameId) {
      return { success: false, message: 'Game not found.' };
    }

    const player = activeGame.players.get(userId);
    if (!player) {
      return { success: false, message: 'Not in current game.' };
    }
    if (!player.eliminated) {
      return { success: false, message: 'You are not eliminated.' };
    }
    if (player.buyBackUsed) {
      return { success: false, message: 'Buy-back already used.' };
    }

    player.eliminated = false;
    player.buyBackUsed = true;
    appendAuditRecord('powerup.buy-back', activeGame.gameId, { userId });
    appendAuditRecord('player.reinstated', activeGame.gameId, { userId, username: player.username });

    try {
      await persistState();
    } catch {
      player.eliminated = true;
      player.buyBackUsed = false;
      return { success: false, message: 'Buy-back could not be durably recorded.' };
    }

    await eventRouter.publish(
      'trivia.player.reinstated',
      'game-arena',
      { gameId: activeGame.gameId, userId: player.userId, username: player.username },
    );

    return { success: true, message: 'Buy-back processed. You are back in the game.' };
  },
};
