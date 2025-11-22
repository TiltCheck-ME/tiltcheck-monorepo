/**
 * AI Service - Natural Language Understanding
 * Parse user messages into structured commands
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const IntentSchema = z.enum([
  'tip',
  'register_wallet',
  'balance',
  'analyze',
  'help',
  'trivia',
  'leaderboard',
  'unknown'
]);

export const EntitySchema = z.object({
  recipient: z.string().optional(),
  amount: z.number().optional(),
  currency: z.enum(['USD', 'SOL', 'USDC', 'BONK']).optional(),
  casino: z.string().optional(),
  wallet_type: z.enum(['phantom', 'magic', 'solflare']).optional(),
  category: z.string().optional()
});

export const NLUResultSchema = z.object({
  intent: IntentSchema,
  entities: EntitySchema,
  confidence: z.number().min(0).max(1),
  suggested_command: z.string().optional()
});

export type Intent = z.infer<typeof IntentSchema>;
export type Entities = z.infer<typeof EntitySchema>;
export type NLUResult = z.infer<typeof NLUResultSchema>;

const AI_ENABLED = !!process.env.OPENAI_API_KEY;

/**
 * Parse natural language input into structured command
 */
export async function parseNaturalLanguage(
  text: string,
  userId?: string
): Promise<NLUResult> {
  if (!AI_ENABLED) {
    return fallbackParser(text);
  }

  try {
    const sanitizedText = sanitizeInput(text);
    
    const systemPrompt = `You are a command parser for TiltCheck Discord bot.

Available commands:
- /tip: Send SOL/USD to another user (e.g., "tip @alice 5 USD")
- /register-magic: Register Magic Eden wallet
- /register-phantom: Register Phantom wallet
- /balance: Check balance
- /play-analyze: Start gameplay analysis (e.g., "analyze stake-us")
- /triviadrop: Start trivia game
- /leaderboard: View trivia rankings
- /help: Get help

Parse the user message and return ONLY valid JSON:
{
  "intent": "tip|register_wallet|balance|analyze|help|trivia|leaderboard|unknown",
  "entities": {
    "recipient": "user mention or name",
    "amount": number,
    "currency": "USD|SOL|USDC|BONK",
    "casino": "casino identifier",
    "wallet_type": "phantom|magic|solflare",
    "category": "trivia category"
  },
  "confidence": 0-1,
  "suggested_command": "the slash command to execute"
}

Examples:
"tip alice 10 bucks" -> { "intent": "tip", "entities": { "recipient": "alice", "amount": 10, "currency": "USD" }, "confidence": 0.95, "suggested_command": "/tip user:@alice amount:10 currency:USD" }
"send bob 5 sol" -> { "intent": "tip", "entities": { "recipient": "bob", "amount": 5, "currency": "SOL" }, "confidence": 0.98, "suggested_command": "/tip user:@bob amount:5 currency:SOL" }
"what's my balance" -> { "intent": "balance", "entities": {}, "confidence": 0.99, "suggested_command": "/balance" }
"analyze stake" -> { "intent": "analyze", "entities": { "casino": "stake-us" }, "confidence": 0.85, "suggested_command": "/play-analyze casino:stake-us" }
"register phantom" -> { "intent": "register_wallet", "entities": { "wallet_type": "phantom" }, "confidence": 0.95, "suggested_command": "/register-phantom" }
"trivia about crypto" -> { "intent": "trivia", "entities": { "category": "crypto" }, "confidence": 0.9, "suggested_command": "/triviadrop start category:crypto" }`;

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: sanitizedText }
      ],
      maxRetries: 2,
      temperature: 0.1 // Low temperature for consistent parsing
    });

    const parsed = JSON.parse(result.text);
    
    // Validate with Zod
    const validated = NLUResultSchema.parse(parsed);
    
    console.log('[NLU] Parsed:', { input: sanitizedText, result: validated });
    
    return validated;
  } catch (error) {
    console.error('[NLU] Parse error:', error);
    return fallbackParser(text);
  }
}

/**
 * Sanitize user input to prevent prompt injection
 */
function sanitizeInput(text: string): string {
  return text
    .replace(/\{system\}/gi, '')
    .replace(/\{assistant\}/gi, '')
    .replace(/\{user\}/gi, '')
    .slice(0, 500) // Max 500 chars
    .trim();
}

/**
 * Fallback parser using regex patterns (when AI unavailable)
 */
function fallbackParser(text: string): NLUResult {
  const lower = text.toLowerCase().trim();
  
  // Tip patterns
  const tipMatch = lower.match(/(?:tip|send|give)\s+(?:@)?(\w+)\s+(\d+(?:\.\d+)?)\s*(sol|usd|usdc|bonk|bucks?|dollars?)?/i);
  if (tipMatch) {
    const [, recipient, amount, currencyRaw] = tipMatch;
    const currency = normalizeCurrency(currencyRaw);
    return {
      intent: 'tip',
      entities: { 
        recipient, 
        amount: parseFloat(amount), 
        currency 
      },
      confidence: 0.8,
      suggested_command: `/tip user:@${recipient} amount:${amount} currency:${currency}`
    };
  }
  
  // Balance
  if (/balance|wallet|funds/i.test(lower)) {
    return {
      intent: 'balance',
      entities: {},
      confidence: 0.9,
      suggested_command: '/balance'
    };
  }
  
  // Analyze
  const analyzeMatch = lower.match(/(?:analyze|check|audit)\s+(?:casino:)?(\S+)/i);
  if (analyzeMatch) {
    return {
      intent: 'analyze',
      entities: { casino: analyzeMatch[1] },
      confidence: 0.7,
      suggested_command: `/play-analyze casino:${analyzeMatch[1]}`
    };
  }
  
  // Register wallet
  const registerMatch = lower.match(/register|setup|connect.*(?:phantom|magic|solflare)/i);
  if (registerMatch) {
    const walletType = lower.includes('phantom') ? 'phantom' : 
                       lower.includes('magic') ? 'magic' : 'solflare';
    return {
      intent: 'register_wallet',
      entities: { wallet_type: walletType },
      confidence: 0.85,
      suggested_command: `/register-${walletType}`
    };
  }
  
  // Trivia
  if (/trivia|quiz|question/i.test(lower)) {
    const categoryMatch = lower.match(/(?:about|category:?)\s*(\w+)/i);
    return {
      intent: 'trivia',
      entities: categoryMatch ? { category: categoryMatch[1] } : {},
      confidence: 0.8,
      suggested_command: categoryMatch 
        ? `/triviadrop start category:${categoryMatch[1]}`
        : '/triviadrop start'
    };
  }
  
  // Leaderboard
  if (/leaderboard|rankings?|top\s*\d*/i.test(lower)) {
    return {
      intent: 'leaderboard',
      entities: {},
      confidence: 0.9,
      suggested_command: '/triviadrop leaderboard'
    };
  }
  
  // Help
  if (/help|commands?|how to/i.test(lower)) {
    return {
      intent: 'help',
      entities: {},
      confidence: 0.95,
      suggested_command: '/help'
    };
  }
  
  return {
    intent: 'unknown',
    entities: {},
    confidence: 0.0
  };
}

/**
 * Normalize currency mentions
 */
function normalizeCurrency(raw?: string): 'USD' | 'SOL' | 'USDC' | 'BONK' {
  if (!raw) return 'USD';
  const lower = raw.toLowerCase();
  if (lower.includes('sol')) return 'SOL';
  if (lower.includes('usdc')) return 'USDC';
  if (lower.includes('bonk')) return 'BONK';
  return 'USD';
}

/**
 * Check if AI is available
 */
export function isAIEnabled(): boolean {
  return AI_ENABLED;
}
