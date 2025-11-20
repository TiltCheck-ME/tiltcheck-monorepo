/**
 * Message Pattern Analyzer
 * Detects tilt signals from Discord message patterns
 */

import type { TiltSignal, MessageActivity } from './types.js';

const TILT_KEYWORDS = [
  'fuck', 'shit', 'scam', 'rigged', 'bullshit', 'wtf', 'fml',
  'kill myself', 'done', 'quit', 'never again', 'last time',
  'this is bullshit', 'fucking rigged', 'im done', 'fuck this',
];

const LOAN_KEYWORDS = [
  'loan', 'borrow', 'need money', 'spot me', 'can someone',
  'please send', 'im broke', 'lost everything', 'need help',
  'emergency', 'desperate',
];

/**
 * Analyze recent messages for tilt patterns
 */
export function analyzeMessages(messages: MessageActivity[], userId: string): TiltSignal[] {
  const signals: TiltSignal[] = [];
  
  if (messages.length === 0) return signals;

  // Check for rapid messaging (5+ messages in 30 seconds)
  const rapidSignal = detectRapidMessaging(messages, userId);
  if (rapidSignal) signals.push(rapidSignal);

  // Check for ALL CAPS spam
  const capsSignal = detectCapsSpam(messages, userId);
  if (capsSignal) signals.push(capsSignal);

  // Check for tilt keywords
  const rageSignal = detectRageKeywords(messages, userId);
  if (rageSignal) signals.push(rageSignal);

  // Check for loan requests (desperation indicator)
  const loanSignal = detectLoanRequests(messages, userId);
  if (loanSignal) signals.push(loanSignal);

  return signals;
}

function detectRapidMessaging(messages: MessageActivity[], userId: string): TiltSignal | null {
  const now = Date.now();
  const recentMessages = messages.filter(m => now - m.timestamp < 30_000);
  
  if (recentMessages.length >= 5) {
    return {
      userId,
      signalType: 'rapid-messages',
      severity: Math.min(5, Math.floor(recentMessages.length / 2)),
      confidence: 0.7,
      context: { messageCount: recentMessages.length, windowSeconds: 30 },
      detectedAt: now,
    };
  }
  
  return null;
}

function detectCapsSpam(messages: MessageActivity[], userId: string): TiltSignal | null {
  const recentMessages = messages.slice(-5);
  let capsCount = 0;
  
  for (const msg of recentMessages) {
    const words = msg.content.split(/\s+/);
    const capsWords = words.filter(w => w === w.toUpperCase() && w.length > 2);
    if (capsWords.length / words.length > 0.5) {
      capsCount++;
    }
  }
  
  if (capsCount >= 3) {
    return {
      userId,
      signalType: 'caps-spam',
      severity: 3,
      confidence: 0.6,
      context: { capsMessageCount: capsCount },
      detectedAt: Date.now(),
    };
  }
  
  return null;
}

function detectRageKeywords(messages: MessageActivity[], userId: string): TiltSignal | null {
  const recentMessages = messages.slice(-10);
  let matchCount = 0;
  let severitySum = 0;
  
  for (const msg of recentMessages) {
    const lowerContent = msg.content.toLowerCase();
    for (const keyword of TILT_KEYWORDS) {
      if (lowerContent.includes(keyword)) {
        matchCount++;
        // More severe keywords get higher weight
        if (keyword.includes('kill') || keyword.includes('done') || keyword.includes('rigged')) {
          severitySum += 2;
        } else {
          severitySum += 1;
        }
      }
    }
  }
  
  if (matchCount >= 2) {
    return {
      userId,
      signalType: 'rage-quit',
      severity: Math.min(5, Math.ceil(severitySum / 2)),
      confidence: 0.8,
      context: { keywordMatches: matchCount },
      detectedAt: Date.now(),
    };
  }
  
  return null;
}

function detectLoanRequests(messages: MessageActivity[], userId: string): TiltSignal | null {
  const recentMessages = messages.slice(-5);
  
  for (const msg of recentMessages) {
    const lowerContent = msg.content.toLowerCase();
    for (const keyword of LOAN_KEYWORDS) {
      if (lowerContent.includes(keyword)) {
        return {
          userId,
          signalType: 'loan-request',
          severity: 4, // Loan requests are serious tilt indicators
          confidence: 0.9,
          context: { messageContent: msg.content.substring(0, 100) },
          detectedAt: Date.now(),
        };
      }
    }
  }
  
  return null;
}

/**
 * Calculate aggregate tilt score from multiple signals
 */
export function calculateTiltScore(signals: TiltSignal[]): number {
  if (signals.length === 0) return 0;
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const signal of signals) {
    const weight = signal.confidence;
    weightedSum += signal.severity * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
