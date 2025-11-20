/**
 * Amount Parser
 * Parses natural language amount inputs
 * Examples: "5 sol", "$5", "5 bucks", "all", "everything"
 */

import type { ParsedAmount, ParseResult } from './types.js';

// Common currency synonyms
const USD_PATTERNS = /\$|usd|dollar|dollars|buck|bucks|cash/i;
const SOL_PATTERNS = /sol|solana/i;
const ALL_PATTERNS = /^(all|everything|max|full balance)$/i;

/**
 * Parse amount from natural language input
 */
export function parseAmount(input: string): ParseResult<ParsedAmount> {
  const trimmed = input.trim();
  
  // Check for "all" variations
  if (ALL_PATTERNS.test(trimmed)) {
    return {
      success: true,
      data: {
        value: 0, // Will be calculated at execution time
        currency: 'SOL',
        isAll: true,
        originalInput: input,
        confidence: 1.0,
      },
    };
  }

  // Extract numeric value
  const numMatch = trimmed.match(/(\d+\.?\d*)/);
  if (!numMatch) {
    return {
      success: false,
      error: 'Could not find a numeric amount',
      suggestions: ['Examples: "5 sol", "$10", "0.5 SOL", "all"'],
    };
  }

  const value = parseFloat(numMatch[1]);
  
  if (isNaN(value) || value <= 0) {
    return {
      success: false,
      error: 'Amount must be a positive number',
    };
  }

  // Determine currency
  let currency: 'SOL' | 'USD' = 'SOL'; // Default to SOL
  let confidence = 0.7; // Medium confidence for implicit SOL

  if (USD_PATTERNS.test(trimmed)) {
    currency = 'USD';
    confidence = 0.95;
  } else if (SOL_PATTERNS.test(trimmed)) {
    currency = 'SOL';
    confidence = 0.95;
  }

  // Check for ambiguity - if just a number with no currency indicator
  const hasExplicitCurrency = USD_PATTERNS.test(trimmed) || SOL_PATTERNS.test(trimmed);
  const needsConfirmation = !hasExplicitCurrency && value >= 5;

  return {
    success: true,
    data: {
      value,
      currency,
      isAll: false,
      originalInput: input,
      confidence,
    },
    needsConfirmation,
    confirmationPrompt: needsConfirmation
      ? `Did you mean **${value} SOL** or **$${value} USD**?`
      : undefined,
  };
}

/**
 * Format amount for display
 */
export function formatAmount(amount: ParsedAmount): string {
  if (amount.isAll) {
    return 'your full balance';
  }
  
  if (amount.currency === 'USD') {
    return `$${amount.value.toFixed(2)} USD`;
  }
  
  return `${amount.value.toFixed(amount.value < 1 ? 6 : 2)} SOL`;
}
