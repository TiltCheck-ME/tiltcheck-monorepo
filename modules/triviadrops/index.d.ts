/**
 * TriviaDrops Module
 * On-demand trivia with leaderboards and persistence
 */
export interface TriviaQuestion {
    id: string;
    question: string;
    choices: string[];
    answer: string;
    category?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    createdAt: number;
}
export interface TriviaLeaderboardEntry {
    userId: string;
    username: string;
    score: number;
    correctAnswers: number;
    totalAttempts: number;
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
export declare function generateTriviaQuestion(category?: string, difficulty?: string): TriviaQuestion;
export declare function startTrivia(guildId: string, channelId: string, category?: string, difficulty?: string): TriviaQuestion;
export declare function checkAnswer(guildId: string, channelId: string, userId: string, username: string, answer: string): {
    correct: boolean;
    correctAnswer: string;
    points: number;
};
export declare function getLeaderboard(limit?: number): TriviaLeaderboardEntry[];
export declare function getUserStats(userId: string): TriviaLeaderboardEntry | null;
export declare function getActiveTrivia(guildId: string, channelId: string): TriviaQuestion | null;
//# sourceMappingURL=index.d.ts.map