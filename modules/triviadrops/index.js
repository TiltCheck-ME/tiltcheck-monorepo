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
import { generateAIQuestion } from './ai-questions.js';
const STORE_PATH = process.env.TRIVIA_STORE_PATH || './data/trivia-store.json';
const QUESTION_TIMEOUT_MS = 60000; // 1 minute per question
function loadStore() {
    if (!existsSync(STORE_PATH)) {
        return { leaderboard: [], activeGames: [] };
    }
    try {
        const data = readFileSync(STORE_PATH, 'utf-8');
        return JSON.parse(data);
    }
    catch (err) {
        console.error('[TriviaDrops] Failed to load store:', err);
        return { leaderboard: [], activeGames: [] };
    }
}
function saveStore(store) {
    try {
        const dir = dirname(STORE_PATH);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
    }
    catch (err) {
        console.error('[TriviaDrops] Failed to save store:', err);
    }
}
export function generateTriviaQuestion(category, difficulty) {
    // Use AI question generation (currently falls back to expanded bank)
    const questionData = generateAIQuestion({
        category,
        difficulty: difficulty
    });
    return {
        ...questionData,
        id: randomBytes(8).toString('hex'),
        createdAt: Date.now(),
    };
}
export function startTrivia(guildId, channelId, category, difficulty) {
    const store = loadStore();
    // Clear expired games
    const now = Date.now();
    store.activeGames = store.activeGames.filter((g) => g.expiresAt > now);
    // Check if there's already an active game in this channel
    const existing = store.activeGames.find((g) => g.guildId === guildId && g.channelId === channelId);
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
export function checkAnswer(guildId, channelId, userId, username, answer) {
    const store = loadStore();
    const now = Date.now();
    // Clear expired games
    store.activeGames = store.activeGames.filter((g) => g.expiresAt > now);
    const game = store.activeGames.find((g) => g.guildId === guildId && g.channelId === channelId);
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
            lastUpdated: now,
        };
        store.leaderboard.push(entry);
    }
    entry.totalAttempts += 1;
    if (correct) {
        entry.score += points;
        entry.correctAnswers += 1;
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
export function getLeaderboard(limit = 10) {
    const store = loadStore();
    return store.leaderboard
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}
export function getUserStats(userId) {
    const store = loadStore();
    return store.leaderboard.find((e) => e.userId === userId) || null;
}
export function getActiveTrivia(guildId, channelId) {
    const store = loadStore();
    const now = Date.now();
    // Clear expired games
    store.activeGames = store.activeGames.filter((g) => g.expiresAt > now);
    saveStore(store);
    const game = store.activeGames.find((g) => g.guildId === guildId && g.channelId === channelId);
    return game ? game.question : null;
}
//# sourceMappingURL=index.js.map