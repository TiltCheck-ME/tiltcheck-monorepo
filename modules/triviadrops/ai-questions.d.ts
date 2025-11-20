/**
 * AI Question Generation for TriviaDrops
 * Future: Integrate Vercel AI SDK or OpenAI API
 */
import type { TriviaQuestion } from './index.js';
interface AIQuestionRequest {
    category?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    topic?: string;
}
/**
 * Generate a trivia question using AI
 * Current implementation: Uses expanded question bank
 * Future: Replace with Vercel AI SDK generateText() or similar
 */
export declare function generateAIQuestion(request: AIQuestionRequest): Omit<TriviaQuestion, 'id' | 'createdAt'>;
/**
 * Validate if AI generation is available
 * Future: Check for API keys and model availability
 */
export declare function isAIAvailable(): boolean;
export {};
//# sourceMappingURL=ai-questions.d.ts.map