// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Nudge Generator
 * Generates friendly, humorous nudge messages for users showing tilt signals
 */

import type { TiltSignal } from './types.js';

/**
 * Nudge message with metadata
 */
export interface NudgeMessage {
  text: string;
  severity: 'gentle' | 'moderate' | 'firm';
  category: string;
  emoji: string;
}

// Nudge messages categorized by signal type
const NUDGE_MESSAGES: Record<string, NudgeMessage[]> = {
  'rapid-messages': [
    { text: "Slow down there, speed racer. Take a breath.", severity: 'gentle', category: 'pacing', emoji: '🏎️' },
    { text: "Your keyboard is begging for mercy. Maybe chill for a sec?", severity: 'gentle', category: 'pacing', emoji: '⌨️' },
    { text: "Chat's not going anywhere. Neither should you (to another bet).", severity: 'moderate', category: 'pacing', emoji: '💬' },
  ],
  'caps-spam': [
    { text: "WE CAN HEAR YOU. No need for all caps, friend.", severity: 'gentle', category: 'tone', emoji: '📢' },
    { text: "Caps lock is cruise control for cool, but maybe ease off.", severity: 'gentle', category: 'tone', emoji: '😎' },
    { text: "The slots can't hear you yelling. Trust me, I've tried.", severity: 'moderate', category: 'tone', emoji: '🎰' },
  ],
  'rage-quit': [
    { text: "Breathing room recommended. Seriously.", severity: 'moderate', category: 'cooldown', emoji: '🧘' },
    { text: "The games aren't going anywhere. But your mental health might be.", severity: 'moderate', category: 'cooldown', emoji: '💆' },
    { text: "Maybe walk away for 5 min? Get some water. Touch grass.", severity: 'firm', category: 'cooldown', emoji: '🌱' },
    { text: "Tilt detected. This is your friendly reminder that revenge betting never works.", severity: 'firm', category: 'cooldown', emoji: '🚨' },
  ],
  'loan-request': [
    { text: "Asking for loans is usually a sign it's time to step back.", severity: 'firm', category: 'safety', emoji: '🚩' },
    { text: "If you're asking for money, you probably shouldn't be playing right now.", severity: 'firm', category: 'safety', emoji: '💸' },
    { text: "Real talk: take a break. Loans lead to more losses.", severity: 'firm', category: 'safety', emoji: '❤️' },
  ],
  'loss-streak': [
    { text: "Three losses in a row? Slots are acting cold. Cooldown time.", severity: 'moderate', category: 'strategy', emoji: '❄️' },
    { text: "Loss streak detected. The RNG gods are not pleased today.", severity: 'moderate', category: 'strategy', emoji: '🎲' },
    { text: "Maybe today's not your day. There's always tomorrow.", severity: 'moderate', category: 'strategy', emoji: '📅' },
    { text: "Chasing losses is like chasing a mirage. Take five.", severity: 'firm', category: 'strategy', emoji: '🏜️' },
  ],
  'bad-beat': [
    { text: "Ouch, that one hurt. But it's just variance, not karma.", severity: 'gentle', category: 'support', emoji: '🤕' },
    { text: "Bad beats happen. Don't let it cloud your judgment.", severity: 'moderate', category: 'support', emoji: '🌧️' },
  ],
};

// Generic fallback nudges
const GENERIC_NUDGES: NudgeMessage[] = [
  { text: "Hey, checking in. You good?", severity: 'gentle', category: 'general', emoji: '👋' },
  { text: "Remember: gambling is for fun, not for fixing problems.", severity: 'moderate', category: 'general', emoji: '🎭' },
  { text: "Just a friendly reminder to gamble responsibly.", severity: 'gentle', category: 'general', emoji: '🙏' },
];

/**
 * Get a nudge message based on tilt signals
 */
export function getNudgeMessage(signals: TiltSignal[]): NudgeMessage {
  if (signals.length === 0) {
    return GENERIC_NUDGES[Math.floor(Math.random() * GENERIC_NUDGES.length)];
  }

  // Find the most severe signal
  const primarySignal = signals.reduce((prev, curr) =>
    curr.severity > prev.severity ? curr : prev
  );

  const messages = NUDGE_MESSAGES[primarySignal.signalType] || GENERIC_NUDGES;

  // Select message based on severity
  const severityThreshold = primarySignal.severity / 5;
  const appropriateMessages = messages.filter(m => {
    if (severityThreshold >= 0.8) return m.severity === 'firm';
    if (severityThreshold >= 0.5) return m.severity !== 'gentle';
    return true;
  });

  const pool = appropriateMessages.length > 0 ? appropriateMessages : messages;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get a formatted nudge string with emoji
 */
export function formatNudge(nudge: NudgeMessage): string {
  return `${nudge.emoji} ${nudge.text}`;
}

/**
 * Get multiple nudge messages for severe tilt
 */
export function getEscalatedNudges(signals: TiltSignal[]): NudgeMessage[] {
  const nudges: NudgeMessage[] = [];

  // Get primary nudge
  nudges.push(getNudgeMessage(signals));

  // For severe tilt, add a secondary message
  const tiltScore = signals.reduce((sum, s) => sum + s.severity, 0);
  if (tiltScore >= 8) {
    const firmNudges = Object.values(NUDGE_MESSAGES)
      .flat()
      .filter(n => n.severity === 'firm');
    if (firmNudges.length > 0) {
      nudges.push(firmNudges[Math.floor(Math.random() * firmNudges.length)]);
    }
  }

  return nudges;
}

/**
 * Get cooldown-specific messages
 */
export function getCooldownMessage(remainingMinutes: number): string {
  if (remainingMinutes <= 1) {
    return "⏰ Almost there! Just a bit more cooldown time.";
  }
  if (remainingMinutes <= 5) {
    return `⏰ Cooldown: ${remainingMinutes} minutes left. Use this time wisely.`;
  }
  if (remainingMinutes <= 15) {
    return `⏰ You're on a ${remainingMinutes}-minute cooldown. Go touch grass.`;
  }
  return `⏰ Extended cooldown: ${remainingMinutes} minutes. Maybe grab some food?`;
}

/**
 * Get violation warning message
 */
export function getViolationMessage(violationCount: number): string {
  switch (violationCount) {
    case 1:
      return "⚠️ First violation. The cooldown is there for your own good.";
    case 2:
      return "⚠️ Second violation. Seriously, take a break.";
    case 3:
      return "⚠️ Third violation. Cooldown extended. Time to step away.";
    default:
      return `⚠️ ${violationCount} violations. Your cooldown keeps getting longer. Please stop.`;
  }
}
