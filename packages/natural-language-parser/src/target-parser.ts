/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Target Parser
 * Parses natural language user targeting
 * Examples: "3 poor people", "random active users", "5 people active last day"
 */

import type { ParsedTarget, ParseResult } from './types.js';

// Target type patterns
const RANDOM_PATTERNS = /random|any|anyone/i;
const ACTIVE_PATTERNS = /active|online|recent/i;
const POOR_PATTERNS = /poor|broke|lowest|poorest/i;

// Criteria patterns
const LAST_DAY_PATTERNS = /last\s*(24h|day|24\s*hours)/i;
const LAST_WEEK_PATTERNS = /last\s*(week|7\s*days)/i;
const LAST_HOUR_PATTERNS = /last\s*(hour|60\s*min)/i;

/**
 * Parse target from natural language input
 */
export function parseTarget(input: string, mentionedUserIds?: string[]): ParseResult<ParsedTarget> {
  const trimmed = input.trim();

  // If user IDs mentioned, use those
  if (mentionedUserIds && mentionedUserIds.length > 0) {
    return {
      success: true,
      data: {
        type: 'user',
        userIds: mentionedUserIds,
        originalInput: input,
        confidence: 1.0,
      },
    };
  }

  // Extract count if present
  const countMatch = trimmed.match(/(\d+)\s+/);
  const count = countMatch ? parseInt(countMatch[1]) : undefined;

  // Determine target type
  let type: ParsedTarget['type'] = 'random';
  let criteria: string | undefined;
  let confidence = 0.8;

  if (POOR_PATTERNS.test(trimmed)) {
    type = 'poor';
    criteria = 'lowest balance';
    confidence = 0.9;
  } else if (ACTIVE_PATTERNS.test(trimmed)) {
    type = 'active';
    
    // Determine activity window
    if (LAST_HOUR_PATTERNS.test(trimmed)) {
      criteria = 'active last hour';
    } else if (LAST_DAY_PATTERNS.test(trimmed)) {
      criteria = 'active last 24h';
    } else if (LAST_WEEK_PATTERNS.test(trimmed)) {
      criteria = 'active last week';
    } else {
      criteria = 'active last 24h'; // Default
    }
    confidence = 0.85;
  } else if (RANDOM_PATTERNS.test(trimmed)) {
    type = 'random';
    criteria = 'random selection';
    confidence = 0.9;
  }

  // Validate count
  if (count !== undefined) {
    if (count < 1) {
      return {
        success: false,
        error: 'Count must be at least 1',
      };
    }
    if (count > 100) {
      return {
        success: false,
        error: 'Cannot target more than 100 users at once',
      };
    }
  }

  const needsConfirmation = count === undefined;

  return {
    success: true,
    data: {
      type,
      count,
      criteria,
      originalInput: input,
      confidence,
    },
    needsConfirmation,
    confirmationPrompt: needsConfirmation
      ? `How many ${type} users would you like to target?`
      : undefined,
  };
}

/**
 * Format target for display
 */
export function formatTarget(target: ParsedTarget): string {
  if (target.type === 'user' && target.userIds) {
    return `${target.userIds.length} specific user${target.userIds.length === 1 ? '' : 's'}`;
  }

  const count = target.count || 'all';
  const criteria = target.criteria || '';
  
  return `${count} ${target.type} users${criteria ? ` (${criteria})` : ''}`;
}
