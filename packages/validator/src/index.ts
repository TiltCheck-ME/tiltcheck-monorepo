/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @tiltcheck/validator
 * 
 * Shared validation functions used across the TiltCheck ecosystem.
 */

/**
 * Validates a Solana wallet address
 * Uses regex for basic format validation (Base58, 32-44 characters)
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address) return false;
  // Solana addresses are Base58 encoded and 32-44 characters long
  const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return solanaRegex.test(address);
}

/**
 * Validates a Discord ID (snowflake)
 * Snowflakes are 17-20 digit numeric strings
 */
export function isValidDiscordId(id: string): boolean {
  if (!id) return false;
  const discordIdRegex = /^\d{17,20}$/;
  return discordIdRegex.test(id);
}

/**
 * Validates if a string is a valid URL
 */
export function isValidURL(url: string): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a URL belongs to a known casino or is likely a casino link
 */
export function isCasinoURL(url: string): boolean {
  if (!isValidURL(url)) return false;
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  
  const knownCasinos = [
    'stake.com',
    'roobet.com',
    'rollbit.com',
    'duelbits.com',
    'bc.game',
    'gamdom.com',
    'betfury.io',
  ];
  
  return knownCasinos.some(casino => hostname === casino || hostname.endsWith('.' + casino));
}

/**
 * Validates a crypto amount
 */
export function isValidAmount(amount: number | string): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0;
}

/**
 * Validates a username format
 * 2-32 characters, alphanumeric plus underscores/dots
 */
export function isValidUsername(username: string): boolean {
  if (!username) return false;
  const usernameRegex = /^[a-zA-Z0-9._]{2,32}$/;
  return usernameRegex.test(username);
}

/**
 * Basic input sanitization to prevent XSS and injection
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
}
