// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * TriviaDrops Module
 * On-demand trivia with leaderboards and persistence
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { generateAIQuestion, generateAIQuestionAsync, isAIAvailable } from './ai-questions.js';

export type TriviaCategory = 'crypto' | 'poker' | 'sports' | 'science' | 'history' | 'general';

export interface TriviaQuestion {
  id: string;
  question: string;
  choices: string[];
  answer: string;
  category?: TriviaCategory;
  difficulty?: 'easy' | 'medium' | 'hard';
  createdAt: number;
}

export interface TriviaLeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  correctAnswers: number;
  totalAttempts: number;
  currentStreak: number;
  longestStreak: number;
  lastAnswerCorrect: boolean;
  achievements: string[];
  lastUpdated: number;
}

export interface ActiveTrivia {
  questionId: string;
  guildId: string;
  channelId: string;
  question: TriviaQuestion;
  startedAt: number;
  expiresAt: number;
}

interface TriviaStore {
  leaderboard: TriviaLeaderboardEntry[];
  activeGames: ActiveTrivia[];
}

const STORE_PATH = process.env.TRIVIA_STORE_PATH || './data/trivia-store.json';
const QUESTION_TIMEOUT_MS = 60000; // 1 minute per question

function loadStore(): TriviaStore {
  if (!existsSync(STORE_PATH)) {
    return { leaderboard: [], activeGames: [] };
  }
  try {
    const data = readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('[TriviaDrops] Failed to load store:', err);
    return { leaderboard: [], activeGames: [] };
  }
}

function saveStore(store: TriviaStore): void {
  try {
    const dir = dirname(STORE_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[TriviaDrops] Failed to save store:', err);
  }
}

export function generateTriviaQuestion(category?: string, difficulty?: string): TriviaQuestion {
  // Use AI question generation (currently falls back to expanded bank)
  const questionData = generateAIQuestion({
    category: category as TriviaCategory,
    difficulty: difficulty as 'easy' | 'medium' | 'hard' | undefined
  });

  return {
    ...questionData,
    id: randomBytes(8).toString('hex'),
    createdAt: Date.now(),
  };
}

export async function generateTriviaQuestionAsync(category?: string, difficulty?: string): Promise<TriviaQuestion> {
  // Use AI question generation with async support
  const questionData = await generateAIQuestionAsync({
    category: category as TriviaCategory,
    difficulty: difficulty as 'easy' | 'medium' | 'hard' | undefined
  });

  return {
    ...questionData,
    id: randomBytes(8).toString('hex'),
    createdAt: Date.now(),
  };
}

export function startTrivia(
  guildId: string,
  channelId: string,
  category?: string,
  difficulty?: string
): TriviaQuestion {
  const store = loadStore();

  // Clear expired games
  const now = Date.now();
  store.activeGames = store.activeGames.filter((g) => g.expiresAt > now);

  // Check if there's already an active game in this channel
  const existing = store.activeGames.find(
    (g) => g.guildId === guildId && g.channelId === channelId
  );

  if (existing) {
    return existing.question;
  }

  const question = generateTriviaQuestion(category, difficulty);

  store.activeGames.push({
    questionId: question.id,
    guildId,
    channelId,
    question,
    startedAt: now,
    expiresAt: now + QUESTION_TIMEOUT_MS,
  });

  saveStore(store);
  return question;
}

export async function startTriviaAsync(
  guildId: string,
  channelId: string,
  category?: string,
  difficulty?: string,
  useAI = false
): Promise<TriviaQuestion> {
  const store = loadStore();

  // Clear expired games
  const now = Date.now();
  store.activeGames = store.activeGames.filter((g) => g.expiresAt > now);

  // Check if there's already an active game in this channel
  const existing = store.activeGames.find(
    (g) => g.guildId === guildId && g.channelId === channelId
  );

  if (existing) {
    return existing.question;
  }

  const question = useAI && isAIAvailable()
    ? await generateTriviaQuestionAsync(category, difficulty)
    : generateTriviaQuestion(category, difficulty);

  store.activeGames.push({
    questionId: question.id,
    guildId,
    channelId,
    question,
    startedAt: now,
    expiresAt: now + QUESTION_TIMEOUT_MS,
  });

  saveStore(store);
  return question;
}

export function checkAnswer(
  guildId: string,
  channelId: string,
  userId: string,
  username: string,
  answer: string
): { correct: boolean; correctAnswer: string; points: number } {
  const store = loadStore();
  const now = Date.now();

  // Clear expired games
  store.activeGames = store.activeGames.filter((g) => g.expiresAt > now);

  const game = store.activeGames.find(
    (g) => g.guildId === guildId && g.channelId === channelId
  );

  if (!game) {
    return { correct: false, correctAnswer: '', points: 0 };
  }

  const correct = answer.toLowerCase().trim() === game.question.answer.toLowerCase().trim();
  let points = 0;

  if (correct) {
    // Award points based on difficulty
    switch (game.question.difficulty) {
      case 'easy':
        points = 10;
        break;
      case 'medium':
        points = 20;
        break;
      case 'hard':
        points = 30;
        break;
      default:
        points = 10;
    }
  }

  // Update leaderboard
  let entry = store.leaderboard.find((e) => e.userId === userId);

  if (!entry) {
    entry = {
      userId,
      username,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastAnswerCorrect: false,
      achievements: [],
      lastUpdated: now,
    };
    store.leaderboard.push(entry);
  }

  entry.totalAttempts += 1;
  if (correct) {
    entry.score += points;
    entry.correctAnswers += 1;

    // Update streak
    if (entry.lastAnswerCorrect) {
      entry.currentStreak += 1;
    } else {
      entry.currentStreak = 1;
    }

    if (entry.currentStreak > entry.longestStreak) {
      entry.longestStreak = entry.currentStreak;
    }

    entry.lastAnswerCorrect = true;

    // Check for achievements
    checkAchievements(entry);
  } else {
    entry.currentStreak = 0;
    entry.lastAnswerCorrect = false;
  }
  entry.username = username; // Update username in case it changed
  entry.lastUpdated = now;

  // Remove the game if answered correctly
  if (correct) {
    store.activeGames = store.activeGames.filter((g) => g.questionId !== game.questionId);
  }

  saveStore(store);

  return { correct, correctAnswer: game.question.answer, points };
}

export function getLeaderboard(limit = 10): TriviaLeaderboardEntry[] {
  const store = loadStore();
  return store.leaderboard
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getUserStats(userId: string): TriviaLeaderboardEntry | null {
  const store = loadStore();
  return store.leaderboard.find((e) => e.userId === userId) || null;
}

export function getActiveTrivia(guildId: string, channelId: string): TriviaQuestion | null {
  const store = loadStore();
  const now = Date.now();

  // Clear expired games
  store.activeGames = store.activeGames.filter((g) => g.expiresAt > now);
  saveStore(store);

  const game = store.activeGames.find(
    (g) => g.guildId === guildId && g.channelId === channelId
  );

  return game ? game.question : null;
}

function checkAchievements(entry: TriviaLeaderboardEntry): void {
  const achievements: { id: string; name: string; condition: () => boolean }[] = [
    { id: 'first_correct', name: '🎯 First Blood', condition: () => entry.correctAnswers === 1 },
    { id: 'streak_3', name: '🔥 On Fire', condition: () => entry.currentStreak === 3 },
    { id: 'streak_5', name: '⚡ Unstoppable', condition: () => entry.currentStreak === 5 },
    { id: 'streak_10', name: '👑 Legendary', condition: () => entry.currentStreak === 10 },
    { id: 'score_100', name: '💯 Century', condition: () => entry.score >= 100 },
    { id: 'score_500', name: '⭐ All-Star', condition: () => entry.score >= 500 },
    { id: 'score_1000', name: '🏆 Champion', condition: () => entry.score >= 1000 },
    { id: 'accuracy_80', name: '🎓 Scholar', condition: () => (entry.correctAnswers / entry.totalAttempts) >= 0.8 && entry.totalAttempts >= 10 },
    { id: 'played_50', name: '🎮 Dedicated', condition: () => entry.totalAttempts >= 50 },
    { id: 'played_100', name: '💪 Grinder', condition: () => entry.totalAttempts >= 100 },
  ];

  for (const achievement of achievements) {
    if (!entry.achievements.includes(achievement.id) && achievement.condition()) {
      entry.achievements.push(achievement.id);
      console.log(`[TriviaDrops] Achievement unlocked for ${entry.username}: ${achievement.name}`);
    }
  }
}
