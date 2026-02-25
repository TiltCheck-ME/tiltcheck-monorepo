/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * AI Question Generation for TriviaDrops
 * Future: Integrate Vercel AI SDK or OpenAI API
 */
/**
 * Generate a trivia question using AI
 * Current implementation: Uses expanded question bank
 * Future: Replace with Vercel AI SDK generateText() or similar
 */
export function generateAIQuestion(request) {
    // TODO: Replace with actual AI generation
    // Example with Vercel AI SDK:
    // import { generateText } from 'ai';
    // const result = await generateText({
    //   model: openai('gpt-4'),
    //   prompt: `Generate a ${request.difficulty} trivia question about ${request.category}...`,
    // });
    // For now, return from expanded bank
    const questions = getExpandedQuestionBank(request.category, request.difficulty);
    const selected = questions[Math.floor(Math.random() * questions.length)];
    return selected;
}
function getExpandedQuestionBank(category, difficulty) {
    const allQuestions = [
        // Crypto - Easy
        {
            question: 'What is the native token of the Solana blockchain?',
            choices: ['SOL', 'ETH', 'BTC', 'USDC'],
            answer: 'SOL',
            category: 'crypto',
            difficulty: 'easy',
        },
        {
            question: 'What does NFT stand for?',
            choices: ['Non-Fungible Token', 'New Finance Tech', 'Network File Transfer', 'None Fiat Token'],
            answer: 'Non-Fungible Token',
            category: 'crypto',
            difficulty: 'easy',
        },
        {
            question: 'What is the maximum supply of Bitcoin?',
            choices: ['21 million', '100 million', '1 billion', 'Unlimited'],
            answer: '21 million',
            category: 'crypto',
            difficulty: 'easy',
        },
        // Crypto - Medium
        {
            question: 'Which consensus mechanism does Solana use?',
            choices: ['Proof of Work', 'Proof of Stake', 'Proof of History', 'Delegated PoS'],
            answer: 'Proof of History',
            category: 'crypto',
            difficulty: 'medium',
        },
        {
            question: 'What year was Bitcoin\'s whitepaper published?',
            choices: ['2008', '2010', '2006', '2012'],
            answer: '2008',
            category: 'crypto',
            difficulty: 'medium',
        },
        {
            question: 'What is a smart contract?',
            choices: [
                'Self-executing code on blockchain',
                'A legal document',
                'A type of wallet',
                'A mining algorithm',
            ],
            answer: 'Self-executing code on blockchain',
            category: 'crypto',
            difficulty: 'medium',
        },
        // Crypto - Hard
        {
            question: 'What is the typical block time for Solana?',
            choices: ['400ms', '2 seconds', '10 minutes', '15 seconds'],
            answer: '400ms',
            category: 'crypto',
            difficulty: 'hard',
        },
        {
            question: 'Who is the creator of Ethereum?',
            choices: ['Vitalik Buterin', 'Satoshi Nakamoto', 'Anatoly Yakovenko', 'Charles Hoskinson'],
            answer: 'Vitalik Buterin',
            category: 'crypto',
            difficulty: 'hard',
        },
        // Poker - Easy
        {
            question: 'In poker, what beats a flush?',
            choices: ['Straight', 'Full House', 'Two Pair', 'Three of a Kind'],
            answer: 'Full House',
            category: 'poker',
            difficulty: 'easy',
        },
        {
            question: 'In Texas Hold\'em, how many hole cards does each player receive?',
            choices: ['2', '3', '4', '5'],
            answer: '2',
            category: 'poker',
            difficulty: 'easy',
        },
        {
            question: 'What is the best possible hand in poker?',
            choices: ['Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House'],
            answer: 'Royal Flush',
            category: 'poker',
            difficulty: 'easy',
        },
        // Poker - Medium
        {
            question: 'What does "tilt" mean in poker?',
            choices: [
                'Playing emotionally after losses',
                'A winning streak',
                'A table angle',
                'A type of bet',
            ],
            answer: 'Playing emotionally after losses',
            category: 'poker',
            difficulty: 'medium',
        },
        {
            question: 'What is the "button" in poker?',
            choices: [
                'Dealer position marker',
                'A type of chip',
                'The first bet',
                'A poker tell',
            ],
            answer: 'Dealer position marker',
            category: 'poker',
            difficulty: 'medium',
        },
        {
            question: 'What does GTO stand for in poker strategy?',
            choices: ['Game Theory Optimal', 'Go To Offense', 'Great Table Odds', 'Get The Out'],
            answer: 'Game Theory Optimal',
            category: 'poker',
            difficulty: 'medium',
        },
        // Poker - Hard
        {
            question: 'What is the probability of being dealt pocket aces?',
            choices: ['1/221', '1/169', '1/52', '1/100'],
            answer: '1/221',
            category: 'poker',
            difficulty: 'hard',
        },
        {
            question: 'In PLO, how many hole cards do you get?',
            choices: ['4', '2', '5', '3'],
            answer: '4',
            category: 'poker',
            difficulty: 'hard',
        },
    ];
    let filtered = allQuestions;
    if (category) {
        filtered = filtered.filter((q) => q.category === category);
    }
    if (difficulty) {
        filtered = filtered.filter((q) => q.difficulty === difficulty);
    }
    return filtered.length > 0 ? filtered : allQuestions;
}
/**
 * Validate if AI generation is available
 * Future: Check for API keys and model availability
 */
export function isAIAvailable() {
    // TODO: Check for OPENAI_API_KEY or VERCEL_AI_SDK config
    return false; // Currently using static bank only
}
//# sourceMappingURL=ai-questions.js.map