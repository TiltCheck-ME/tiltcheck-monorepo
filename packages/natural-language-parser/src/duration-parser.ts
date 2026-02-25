/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Duration Parser
 * Parses natural language time duration inputs
 * Examples: "15s", "30 seconds", "5m", "1 hour", "all day"
 */

import type { ParsedDuration, ParseResult } from './types.js';

// Time unit patterns
const SECOND_PATTERNS = /(\d+)\s*(?:s|sec|secs|second|seconds)/i;
const MINUTE_PATTERNS = /(\d+)\s*(?:m|min|mins|minute|minutes)/i;
const HOUR_PATTERNS = /(\d+)\s*(?:h|hr|hrs|hour|hours)/i;
const DAY_PATTERNS = /(\d+)?\s*(?:d|day|days|all\s*day)/i;

/**
 * Parse duration from natural language input
 */
export function parseDuration(input: string): ParseResult<ParsedDuration> {
  const trimmed = input.trim().toLowerCase();

  // Check for "all day" special case
  if (/^(all\s*day|whole\s*day)$/i.test(trimmed)) {
    return {
      success: true,
      data: {
        milliseconds: 24 * 60 * 60 * 1000,
        originalInput: input,
        unit: 'days',
        confidence: 1.0,
      },
    };
  }

  // Try matching different time units (in order of specificity)
  let match: RegExpMatchArray | null;
  
  // Seconds
  if ((match = trimmed.match(SECOND_PATTERNS))) {
    const value = parseInt(match[1]);
    return createDurationResult(value, 'seconds', input);
  }

  // Minutes
  if ((match = trimmed.match(MINUTE_PATTERNS))) {
    const value = parseInt(match[1]);
    return createDurationResult(value, 'minutes', input);
  }

  // Hours
  if ((match = trimmed.match(HOUR_PATTERNS))) {
    const value = parseInt(match[1]);
    return createDurationResult(value, 'hours', input);
  }

  // Days
  if ((match = trimmed.match(DAY_PATTERNS))) {
    const value = match[1] ? parseInt(match[1]) : 1;
    return createDurationResult(value, 'days', input);
  }

  // Try parsing as just a number (assume seconds for small values, minutes for larger)
  const numMatch = trimmed.match(/^(\d+)$/);
  if (numMatch) {
    const value = parseInt(numMatch[1]);
    
    // Heuristic: <= 90 likely seconds, > 90 likely minutes
    if (value <= 90) {
      return {
        success: true,
        data: {
          milliseconds: value * 1000,
          originalInput: input,
          unit: 'seconds',
          confidence: 0.7, // Lower confidence due to ambiguity
        },
        needsConfirmation: value >= 15,
        confirmationPrompt: value >= 15 
          ? `Did you mean **${value} seconds** or **${value} minutes**?`
          : undefined,
      };
    } else {
      return {
        success: true,
        data: {
          milliseconds: value * 60 * 1000,
          originalInput: input,
          unit: 'minutes',
          confidence: 0.7,
        },
        needsConfirmation: true,
        confirmationPrompt: `Did you mean **${value} minutes** or **${value} seconds**?`,
      };
    }
  }

  return {
    success: false,
    error: 'Could not parse duration',
    suggestions: ['Examples: "15s", "30 seconds", "5m", "1 hour", "all day"'],
  };
}

/**
 * Helper to create duration result
 */
function createDurationResult(
  value: number,
  unit: 'seconds' | 'minutes' | 'hours' | 'days',
  originalInput: string
): ParseResult<ParsedDuration> {
  const multipliers = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };

  const milliseconds = value * multipliers[unit];

  // Validate reasonable ranges
  if (milliseconds < 5000) {
    return {
      success: false,
      error: 'Duration must be at least 5 seconds',
    };
  }

  if (milliseconds > 7 * 24 * 60 * 60 * 1000) {
    return {
      success: false,
      error: 'Duration cannot exceed 7 days',
    };
  }

  return {
    success: true,
    data: {
      milliseconds,
      originalInput,
      unit,
      confidence: 0.95,
    },
  };
}

/**
 * Format duration for display
 */
export function formatDuration(duration: ParsedDuration): string {
  const { milliseconds } = duration;
  
  const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
  const hours = Math.floor((milliseconds % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((milliseconds % (60 * 1000)) / 1000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join(' ') || '0s';
}
