// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * AI Question Generation for TriviaDrops
 * Integrates with AI Gateway for infinite question generation
 * Falls back to Vercel AI SDK or static bank when gateway is unavailable
 */

import type { TriviaQuestion, TriviaCategory } from './index.js';

// Try to use AI Gateway first, then Vercel AI SDK
let aiClient: any = null;

async function getAIGatewayClient() {
  if (!aiClient) {
    try {
      const module = await import('@tiltcheck/ai-client');
      aiClient = module.aiClient;
      console.log('[TriviaDrops] AI Gateway client loaded');
    } catch {
      console.log('[TriviaDrops] AI Gateway client not available');
    }
  }
  return aiClient;
}

// Vercel AI SDK imports (fallback)
let generateText: any = null;
let openaiProvider: any = null;

async function getVercelAI() {
  if (!generateText) {
    try {
      const aiModule = await import('ai');
      const openaiModule = await import('@ai-sdk/openai');
      generateText = aiModule.generateText;
      openaiProvider = openaiModule.openai;
    } catch {
      console.log('[TriviaDrops] Vercel AI SDK not available');
    }
  }
  return { generateText, openai: openaiProvider };
}

interface AIQuestionRequest {
  category?: TriviaCategory;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
}

const AI_ENABLED = !!process.env.OPENAI_API_KEY || !!process.env.AI_GATEWAY_URL;

/**
 * Generate a trivia question using AI
 * Tries AI Gateway first, then Vercel AI SDK, then falls back to static bank
 */
export async function generateAIQuestionAsync(
  request: AIQuestionRequest
): Promise<Omit<TriviaQuestion, 'id' | 'createdAt'>> {
  if (!AI_ENABLED) {
    return generateAIQuestion(request);
  }

  // Try AI Gateway first
  const gatewayClient = await getAIGatewayClient();
  if (gatewayClient) {
    try {
      const result = await gatewayClient.getSupport(
        `Generate a ${request.difficulty || 'medium'} trivia question about ${request.category || 'general'}${request.topic ? ` focusing on ${request.topic}` : ''}. Return as JSON with question, choices (4 options), answer, category, difficulty.`,
        { type: 'trivia-generation' }
      );

      if (result.success && result.data?.answer) {
        try {
          // Parse JSON from the AI response
          const parsed = JSON.parse(result.data.answer);
          if (parsed.question && Array.isArray(parsed.choices) && parsed.choices.length === 4 && parsed.answer) {
            return {
              question: parsed.question,
              choices: parsed.choices,
              answer: parsed.answer,
              category: request.category || 'general',
              difficulty: request.difficulty || 'medium',
            };
          }
        } catch {
          console.log('[TriviaDrops] Failed to parse AI Gateway response');
        }
      }
    } catch (error) {
      console.log('[TriviaDrops] AI Gateway failed:', error);
    }
  }

  // Fallback to Vercel AI SDK
  try {
    const { generateText: genText, openai: openaiProv } = await getVercelAI();

    if (genText && openaiProv) {
      const categoryPrompt = request.category ? ` about ${request.category}` : '';
      const difficultyPrompt = request.difficulty ? ` at ${request.difficulty} difficulty` : '';
      const topicPrompt = request.topic ? ` focusing on ${request.topic}` : '';

      const prompt = `Generate a multiple choice trivia question${categoryPrompt}${difficultyPrompt}${topicPrompt}.

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "question": "The question text",
  "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
  "answer": "The exact text of the correct choice",
  "category": "${request.category || 'general'}",
  "difficulty": "${request.difficulty || 'medium'}"
}

Rules:
- Make the question clear and unambiguous
- Provide exactly 4 choices
- Only one choice should be correct
- The answer must match one of the choices exactly
- Keep questions appropriate and educational`;

      const result = await genText({
        model: openaiProv('gpt-4o-mini'),
        prompt,
        maxRetries: 2,
      });

      const parsed = JSON.parse(result.text);

      if (parsed.question && Array.isArray(parsed.choices) && parsed.choices.length === 4 && parsed.answer) {
        return {
          question: parsed.question,
          choices: parsed.choices,
          answer: parsed.answer,
          category: request.category || 'general',
          difficulty: request.difficulty || 'medium',
        };
      }
    }
  } catch (error) {
    console.error('[TriviaDrops] Vercel AI generation failed:', error);
  }

  // Final fallback to static bank
  return generateAIQuestion(request);
}

/**
 * Synchronous fallback using static question bank
 */
export function generateAIQuestion(
  request: AIQuestionRequest
): Omit<TriviaQuestion, 'id' | 'createdAt'> {
  const questions = getExpandedQuestionBank(request.category, request.difficulty);
  const selected = questions[Math.floor(Math.random() * questions.length)];

  return selected;
}

function getExpandedQuestionBank(
  category?: TriviaCategory,
  difficulty?: string
): Omit<TriviaQuestion, 'id' | 'createdAt'>[] {
  const allQuestions: Omit<TriviaQuestion, 'id' | 'createdAt'>[] = [
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

    // Sports - Easy
    {
      question: 'How many players are on a basketball team on the court?',
      choices: ['5', '6', '7', '11'],
      answer: '5',
      category: 'sports',
      difficulty: 'easy',
    },
    {
      question: 'Which sport uses a puck?',
      choices: ['Hockey', 'Basketball', 'Soccer', 'Baseball'],
      answer: 'Hockey',
      category: 'sports',
      difficulty: 'easy',
    },
    {
      question: 'How many points is a touchdown worth in American football?',
      choices: ['6', '7', '3', '5'],
      answer: '6',
      category: 'sports',
      difficulty: 'easy',
    },

    // Sports - Medium
    {
      question: 'What does NBA stand for?',
      choices: ['National Basketball Association', 'North American Basketball', 'National Ball Association', 'New Basketball Alliance'],
      answer: 'National Basketball Association',
      category: 'sports',
      difficulty: 'medium',
    },
    {
      question: 'How long is a marathon?',
      choices: ['26.2 miles', '20 miles', '30 miles', '25 miles'],
      answer: '26.2 miles',
      category: 'sports',
      difficulty: 'medium',
    },

    // Science - Easy
    {
      question: 'What planet is known as the Red Planet?',
      choices: ['Mars', 'Venus', 'Jupiter', 'Mercury'],
      answer: 'Mars',
      category: 'science',
      difficulty: 'easy',
    },
    {
      question: 'What is H2O commonly known as?',
      choices: ['Water', 'Oxygen', 'Hydrogen', 'Salt'],
      answer: 'Water',
      category: 'science',
      difficulty: 'easy',
    },
    {
      question: 'How many bones are in the adult human body?',
      choices: ['206', '150', '300', '180'],
      answer: '206',
      category: 'science',
      difficulty: 'easy',
    },

    // Science - Medium
    {
      question: 'What is the speed of light?',
      choices: ['299,792 km/s', '150,000 km/s', '500,000 km/s', '200,000 km/s'],
      answer: '299,792 km/s',
      category: 'science',
      difficulty: 'medium',
    },
    {
      question: 'What is the chemical symbol for gold?',
      choices: ['Au', 'Ag', 'Gd', 'Go'],
      answer: 'Au',
      category: 'science',
      difficulty: 'medium',
    },

    // History - Easy
    {
      question: 'Who was the first President of the United States?',
      choices: ['George Washington', 'Thomas Jefferson', 'Abraham Lincoln', 'John Adams'],
      answer: 'George Washington',
      category: 'history',
      difficulty: 'easy',
    },
    {
      question: 'In what year did World War II end?',
      choices: ['1945', '1944', '1946', '1943'],
      answer: '1945',
      category: 'history',
      difficulty: 'easy',
    },

    // History - Medium
    {
      question: 'What ancient wonder was located in Alexandria?',
      choices: ['Lighthouse', 'Pyramids', 'Colossus', 'Hanging Gardens'],
      answer: 'Lighthouse',
      category: 'history',
      difficulty: 'medium',
    },

    // General - Easy
    {
      question: 'What is the capital of France?',
      choices: ['Paris', 'London', 'Berlin', 'Rome'],
      answer: 'Paris',
      category: 'general',
      difficulty: 'easy',
    },
    {
      question: 'How many continents are there?',
      choices: ['7', '5', '6', '8'],
      answer: '7',
      category: 'general',
      difficulty: 'easy',
    },

    // General - Medium
    {
      question: 'What is the largest ocean on Earth?',
      choices: ['Pacific', 'Atlantic', 'Indian', 'Arctic'],
      answer: 'Pacific',
      category: 'general',
      difficulty: 'medium',
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
 */
export function isAIAvailable(): boolean {
  return AI_ENABLED;
}
