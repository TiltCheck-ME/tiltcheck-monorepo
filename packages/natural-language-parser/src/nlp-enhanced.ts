/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Enhanced Natural Language Parser
 * Handles comprehensive NL input for JustTheTip bot
 */

import { parseAmount, formatAmount } from './amount-parser.js';
import { parseDuration, formatDuration } from './duration-parser.js';
import { parseTarget } from './target-parser.js';
import type { ParseResult, ParsedAmount, ParsedDuration } from './types.js';

// Word to number mapping
const WORD_NUMBERS: Record<string, number> = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
  'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
  'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
  'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
  'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'thirty': 30, 'forty': 40, 'fifty': 50,
  'hundred': 100,
  'a': 1, 'an': 1,
};

// Fraction mappings
const FRACTIONS: Record<string, number> = {
  'half': 0.5, 'quarter': 0.25, 'third': 0.333,
  'half a': 0.5, 'a half': 0.5,
};

// Informal amount phrases
const INFORMAL_AMOUNTS: Record<string, { value: number; currency: 'SOL' | 'USD' }> = {
  'a few bucks': { value: 5, currency: 'USD' },
  'few bucks': { value: 5, currency: 'USD' },
  'couple bucks': { value: 2, currency: 'USD' },
  'a couple bucks': { value: 2, currency: 'USD' },
  'a buck': { value: 1, currency: 'USD' },
  'a dollar': { value: 1, currency: 'USD' },
  'some sol': { value: 0.1, currency: 'SOL' },
  'a little sol': { value: 0.05, currency: 'SOL' },
  'a bit': { value: 0.01, currency: 'SOL' },
};

// Category aliases for trivia
const CATEGORY_ALIASES: Record<string, string> = {
  // Crypto
  'crypto': 'crypto', 'cryptocurrency': 'crypto', 'bitcoin': 'crypto',
  'solana': 'crypto', 'blockchain': 'crypto', 'defi': 'crypto',
  'web3': 'crypto', 'nft': 'crypto', 'tokens': 'crypto',
  
  // Poker
  'poker': 'poker', 'cards': 'poker', 'texas holdem': 'poker',
  'hold em': 'poker', 'holdem': 'poker', 'card games': 'poker',
  'blackjack': 'poker', 'gambling': 'poker', 'casino games': 'poker',
  
  // Sports
  'sports': 'sports', 'sport': 'sports', 'football': 'sports',
  'basketball': 'sports', 'soccer': 'sports', 'baseball': 'sports',
  'nfl': 'sports', 'nba': 'sports', 'mlb': 'sports',
  
  // General
  'general': 'general', 'random': 'general', 'anything': 'general',
  'misc': 'general', 'trivia': 'general', 'mixed': 'general',
};

/**
 * Convert word numbers to digits
 * "five" -> 5, "twenty five" -> 25
 */
export function wordsToNumber(input: string): number | null {
  const lower = input.toLowerCase().trim();
  
  // Direct match
  if (WORD_NUMBERS[lower] !== undefined) {
    return WORD_NUMBERS[lower];
  }
  
  // Try compound numbers like "twenty five"
  const parts = lower.split(/[\s-]+/);
  if (parts.length === 2) {
    const tens = WORD_NUMBERS[parts[0]];
    const ones = WORD_NUMBERS[parts[1]];
    if (tens !== undefined && ones !== undefined && tens >= 20) {
      return tens + ones;
    }
  }
  
  return null;
}

/**
 * Enhanced amount parser with word support
 */
export function parseAmountNL(input: string): ParseResult<ParsedAmount> {
  const lower = input.toLowerCase().trim();
  
  // Check informal phrases first
  for (const [phrase, amount] of Object.entries(INFORMAL_AMOUNTS)) {
    if (lower.includes(phrase)) {
      return {
        success: true,
        data: {
          value: amount.value,
          currency: amount.currency,
          isAll: false,
          originalInput: input,
          confidence: 0.85,
        },
      };
    }
  }
  
  // Check for fractions like "half a sol"
  for (const [frac, value] of Object.entries(FRACTIONS)) {
    if (lower.includes(frac)) {
      const isUsd = /\$|usd|dollar|buck/i.test(lower);
      return {
        success: true,
        data: {
          value: value,
          currency: isUsd ? 'USD' : 'SOL',
          isAll: false,
          originalInput: input,
          confidence: 0.9,
        },
      };
    }
  }
  
  // Try to replace word numbers with digits
  let processed = lower;
  for (const [word, num] of Object.entries(WORD_NUMBERS)) {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    processed = processed.replace(regex, num.toString());
  }
  
  // Now use the standard parser
  return parseAmount(processed);
}

/**
 * Enhanced duration parser with word support
 */
export function parseDurationNL(input: string): ParseResult<ParsedDuration> {
  const lower = input.toLowerCase().trim();
  
  // Replace word numbers
  let processed = lower;
  for (const [word, num] of Object.entries(WORD_NUMBERS)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    processed = processed.replace(regex, num.toString());
  }
  
  // Handle informal time expressions
  if (/half\s*(a\s*)?(min|minute)/i.test(processed)) {
    return {
      success: true,
      data: {
        milliseconds: 30 * 1000,
        originalInput: input,
        unit: 'seconds',
        confidence: 0.9,
      },
    };
  }
  
  if (/quarter\s*(of\s*)?(an?\s*)?(hour)/i.test(processed)) {
    return {
      success: true,
      data: {
        milliseconds: 15 * 60 * 1000,
        originalInput: input,
        unit: 'minutes',
        confidence: 0.9,
      },
    };
  }
  
  // Use standard parser
  return parseDuration(processed);
}

/**
 * Parse category from natural language
 */
export function parseCategory(input: string): string {
  const lower = input.toLowerCase().trim();
  
  // Check aliases
  for (const [alias, category] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.includes(alias)) {
      return category;
    }
  }
  
  // Default to random selection
  return '';
}

/**
 * Parse a complete trivia command from natural language
 * Examples:
 * - "$5 15s crypto"
 * - "five dollars thirty seconds poker"
 * - "0.1 sol 1 min"
 */
export interface ParsedTriviaCommand {
  prize: ParsedAmount;
  duration: ParsedDuration;
  category: string;
}

export function parseTriviaCommand(input: string): ParseResult<ParsedTriviaCommand> {
  const lower = input.toLowerCase().trim();
  
  // Try to extract components
  // This is a best-effort parser for natural input
  
  // Find category first (it's usually at the end or a distinct word)
  const category = parseCategory(lower);
  
  // Remove category from input for amount/duration parsing
  let remaining = lower;
  if (category) {
    for (const [alias, cat] of Object.entries(CATEGORY_ALIASES)) {
      if (cat === category) {
        remaining = remaining.replace(new RegExp(`\\b${alias}\\b`, 'gi'), '').trim();
      }
    }
  }
  
  // Try to find duration patterns
  const durationPatterns = [
    /(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes)/i,
    /(half\s*(a\s*)?(min|minute))/i,
    /(a\s+minute)/i,
  ];
  
  let durationMatch: string | null = null;
  for (const pattern of durationPatterns) {
    const match = remaining.match(pattern);
    if (match) {
      durationMatch = match[0];
      remaining = remaining.replace(match[0], '').trim();
      break;
    }
  }
  
  // The rest should be the amount
  const amountResult = parseAmountNL(remaining || '$5'); // Default $5
  if (!amountResult.success || !amountResult.data) {
    return {
      success: false,
      error: amountResult.error || 'Could not parse prize amount',
      suggestions: ['Examples: "$5 15s", "0.1 sol 30 seconds crypto"'],
    };
  }
  
  const durationResult = parseDurationNL(durationMatch || '15s'); // Default 15s
  if (!durationResult.success || !durationResult.data) {
    return {
      success: false,
      error: durationResult.error || 'Could not parse duration',
      suggestions: ['Examples: "15s", "30 secs", "1 min"'],
    };
  }
  
  return {
    success: true,
    data: {
      prize: amountResult.data,
      duration: durationResult.data,
      category: category || '', // Empty means random
    },
  };
}

/**
 * Parse a tip command from natural language
 * Examples:
 * - "@user $5"
 * - "send five bucks to @friend"
 * - "tip @degen 0.1 sol"
 */
export interface ParsedTipCommand {
  target: string; // User ID or mention
  amount: ParsedAmount;
}

export function parseTipCommand(input: string): ParseResult<ParsedTipCommand> {
  // Extract user mention
  const mentionMatch = input.match(/<@!?(\d+)>/);
  if (!mentionMatch) {
    return {
      success: false,
      error: 'Could not find a user mention',
      suggestions: ['Include @user in your message, e.g., "@friend $5"'],
    };
  }
  
  const targetId = mentionMatch[1];
  
  // Remove the mention and parse the rest as amount
  const remaining = input.replace(mentionMatch[0], '').trim();
  
  // Remove common filler words
  const cleaned = remaining
    .replace(/\b(send|tip|give|to|for)\b/gi, '')
    .trim();
  
  const amountResult = parseAmountNL(cleaned);
  if (!amountResult.success || !amountResult.data) {
    return {
      success: false,
      error: amountResult.error || 'Could not parse amount',
      suggestions: ['Examples: "$5", "0.1 sol", "five bucks"'],
    };
  }
  
  return {
    success: true,
    data: {
      target: targetId,
      amount: amountResult.data,
    },
  };
}

/**
 * Parse vault lock command from natural language
 * Examples:
 * - "$100 24h"
 * - "lock fifty bucks for a day"
 * - "0.5 sol 1 week anti-tilt"
 */
export interface ParsedVaultCommand {
  amount: ParsedAmount;
  duration: ParsedDuration;
  reason?: string;
}

export function parseVaultCommand(input: string): ParseResult<ParsedVaultCommand> {
  const lower = input.toLowerCase().trim();
  
  // Check for reason phrases
  const reasonPatterns = [
    /(?:for|because|reason:?)\s+(.+)$/i,
    /(anti[- ]?tilt|savings?|break|cooldown)$/i,
  ];
  
  let reason: string | undefined;
  let remaining = lower;
  
  for (const pattern of reasonPatterns) {
    const match = remaining.match(pattern);
    if (match) {
      reason = match[1].trim();
      remaining = remaining.replace(match[0], '').trim();
      break;
    }
  }
  
  // Find duration
  const durationPatterns = [
    /(\d+)\s*(h|hr|hrs|hour|hours|d|day|days|w|week|weeks|m|min|mins|minute|minutes)/i,
    /(a\s+(day|week|hour))/i,
    /(all\s*day)/i,
  ];
  
  let durationMatch: string | null = null;
  for (const pattern of durationPatterns) {
    const match = remaining.match(pattern);
    if (match) {
      durationMatch = match[0];
      remaining = remaining.replace(match[0], '').trim();
      break;
    }
  }
  
  // Rest is amount
  const amountResult = parseAmountNL(remaining || 'all');
  if (!amountResult.success || !amountResult.data) {
    return {
      success: false,
      error: amountResult.error || 'Could not parse amount',
    };
  }
  
  const durationResult = parseDurationNL(durationMatch || '24h');
  if (!durationResult.success || !durationResult.data) {
    return {
      success: false,
      error: durationResult.error || 'Could not parse duration',
    };
  }
  
  return {
    success: true,
    data: {
      amount: amountResult.data,
      duration: durationResult.data,
      reason,
    },
  };
}

// Re-export standard parsers
export { parseAmount, formatAmount, parseDuration, formatDuration, parseTarget };
