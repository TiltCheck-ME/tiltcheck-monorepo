/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Input validation utilities for Discord commands
 */

/**
 * Validate a URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a Discord user ID
 */
export function isValidUserId(id: string): boolean {
  return /^\d{17,19}$/.test(id);
}

/**
 * Validate a Discord channel ID
 */
export function isValidChannelId(id: string): boolean {
  return /^\d{17,19}$/.test(id);
}

/**
 * Validate a Discord role ID
 */
export function isValidRoleId(id: string): boolean {
  return /^\d{17,19}$/.test(id);
}

/**
 * Validate a numeric amount
 */
export function isValidAmount(
  value: string,
  min = 0,
  max = Infinity
): { valid: boolean; value?: number; error?: string } {
  const num = parseFloat(value);

  if (isNaN(num)) {
    return { valid: false, error: 'Invalid number format' };
  }

  if (num < min) {
    return { valid: false, error: `Amount must be at least ${min}` };
  }

  if (num > max) {
    return { valid: false, error: `Amount must be at most ${max}` };
  }

  return { valid: true, value: num };
}

/**
 * Sanitize user input (remove Discord markdown)
 */
export function sanitizeInput(text: string): string {
  return text
    .replace(/[*_~`|]/g, '') // Remove markdown
    .replace(/@(everyone|here)/g, '@ $1') // Disable @everyone/@here
    .trim();
}

/**
 * Validate a casino domain
 */
export function isKnownCasino(url: string): boolean {
  const knownCasinos = [
    'stake.com',
    'rollbit.com',
    'bc.game',
    'roobet.com',
    'shuffle.com',
    'duelbits.com',
  ];

  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return knownCasinos.includes(hostname);
  } catch {
    return false;
  }
}

/**
 * Extract URLs from text
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

/**
 * Check if string contains Discord mentions
 */
export function containsMentions(text: string): boolean {
  return /<@[!&]?\d+>/.test(text) || /@(everyone|here)/.test(text);
}

/**
 * Validate command arguments
 */
export function validateArgs(
  args: string[],
  required: number,
  max?: number
): { valid: boolean; error?: string } {
  if (args.length < required) {
    return {
      valid: false,
      error: `Not enough arguments. Expected at least ${required}, got ${args.length}`,
    };
  }

  if (max !== undefined && args.length > max) {
    return {
      valid: false,
      error: `Too many arguments. Expected at most ${max}, got ${args.length}`,
    };
  }

  return { valid: true };
}
