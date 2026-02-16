/**
 * Code Detector - Extracts and validates Stake promo codes from text
 */

/**
 * Regex patterns for detecting Stake promo codes
 * Stake codes typically follow patterns like: STAKE123, FREEDROP50, etc.
 */
const CODE_PATTERNS = [
  /\b([A-Z0-9]{6,20})\b/g, // Basic alphanumeric code
  /\bSTAKE[A-Z0-9]{3,15}\b/gi, // STAKE prefix codes
  /\b(?:FREE|BONUS|DROP)[A-Z0-9]{2,15}\b/gi, // Common promo prefixes
];

/**
 * Keywords that suggest a message contains promo codes
 */
const CODE_KEYWORDS = [
  'code',
  'promo',
  'bonus',
  'claim',
  'free',
  'drop',
  'reload',
  'deposit',
];

/**
 * Detects potential promo codes in message text
 * @param text - Message text to analyze
 * @returns Array of detected code strings
 */
export function detectCodes(text: string): string[] {
  const codes = new Set<string>();

  // Check if message likely contains codes
  const lowerText = text.toLowerCase();
  const hasKeyword = CODE_KEYWORDS.some((kw) => lowerText.includes(kw));

  if (!hasKeyword) {
    return [];
  }

  // Apply each pattern
  for (const pattern of CODE_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const code = match[0].toUpperCase();
      if (isValidCode(code)) {
        codes.add(code);
      }
    }
  }

  return Array.from(codes);
}

/**
 * Validates if a detected string is likely a valid promo code
 * @param code - Code to validate
 * @returns true if code passes validation
 */
export function isValidCode(code: string): boolean {
  // Must be 6-20 characters
  if (code.length < 6 || code.length > 20) {
    return false;
  }

  // Must be alphanumeric
  if (!/^[A-Z0-9]+$/.test(code)) {
    return false;
  }

  // Filter out common false positives
  const falsePositives = [
    'TELEGRAM',
    'CHANNEL',
    'SUBSCRIBE',
    'FOLLOW',
    'TWITTER',
    'DISCORD',
    'YOUTUBE',
  ];

  return !falsePositives.includes(code);
}

/**
 * Extracts wager requirement from message text if present
 * @param text - Message text
 * @returns Wager amount or undefined
 */
export function extractWagerRequirement(text: string): number | undefined {
  const wagerPatterns = [
    /\$(\d+(?:\.\d{2})?)\s*(?:wager|wagering|playthrough)/i,
    /(?:wager|wagering|playthrough).*?\$(\d+(?:\.\d{2})?)/i,
    /(\d+)x\s*(?:wager|wagering|playthrough)/i,
  ];

  for (const pattern of wagerPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      if (!isNaN(amount)) {
        return amount;
      }
    }
  }

  return undefined;
}
