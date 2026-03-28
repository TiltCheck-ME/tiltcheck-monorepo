/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Edge Equalizer Nudge Generator
 * Blunt, surgical, "Tough Love" audit strings.
 */

import type { TiltSignal } from './types.js';

export interface NudgeMessage {
  text: string;
  severity: 'gentle' | 'moderate' | 'firm' | 'CRITICAL';
  category: string;
  symbol: string;
}

// THE RELUCTANT BABYSITTER: TOUGH LOVE AUDIT STRINGS
const NUDGE_MESSAGES: Record<string, NudgeMessage[]> = {
  'rapid-messages': [
    { text: "Slow down. Your bet velocity is peaking. It's giving rinse vibes.", severity: 'gentle', category: 'pacing', symbol: '[AUDIT]' },
    { text: "You're clicking faster than the page can even register. The house loves this momentum. STOP.", severity: 'moderate', category: 'pacing', symbol: '[SPEED]' },
    { text: "Audit your head. 10 bets in 2 minutes? The house is printing while you f*** around.", severity: 'firm', category: 'pacing', symbol: '[RINSE]' },
  ],
  'loss-streak': [
    { text: "3 losses in a row. The RNG doesn't care about your feelings. Take a breather.", severity: 'moderate', category: 'loss', symbol: '[AUDIT]' },
    { text: "Loss streak detected. Revenge betting is a house strategy. Don't be their donator.", severity: 'firm', category: 'loss', symbol: '[ALERT]' },
    { text: "VIBE CHECK INBOUND. You literally cannot outrun the math. Walk away with what's left.", severity: 'CRITICAL', category: 'loss', symbol: '[CRITICAL]' },
  ],
  'large-bet': [
    { text: "You just rolled a massive bet. That's a huge chunk of your bag. Audit your logic.", severity: 'firm', category: 'bankroll', symbol: '[RISK]' },
    { text: "Over-leveraged. You're betting like you've already won. You haven't. Audit now.", severity: 'moderate', category: 'bankroll', symbol: '[CASH]' },
  ],
  'playtime-exhaustion': [
    { text: "You've been in the arena for 3 hours. Go touch grass while you still have a balance.", severity: 'moderate', category: 'time', symbol: '[TIME]' },
    { text: "Audit says your probability of keeping this bag is dropping every minute. Go outside.", severity: 'firm', category: 'time', symbol: '[NATURE]' },
  ]
};

const GENERIC_NUDGES: NudgeMessage[] = [
  { text: "Audit check. You still have your wits about you?", severity: 'gentle', category: 'general', symbol: '[HELLO]' },
  { text: "The math is clear: Secure the profit now or it's gone in 5 mins.", severity: 'moderate', category: 'general', symbol: '[PROFIT]' },
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
  
  // Choose random message from appropriate severity level
  const severityThreshold = primarySignal.severity / 5;
  const appropriateMessages = messages.filter(m => {
    if (severityThreshold >= 0.8) return m.severity === 'firm' || m.severity === 'CRITICAL';
    if (severityThreshold >= 0.5) return m.severity === 'moderate' || m.severity === 'firm';
    return m.severity === 'gentle' || m.severity === 'moderate';
  });

  const pool = appropriateMessages.length > 0 ? appropriateMessages : messages;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Format a nudge for Discord (Markdown)
 */
export function formatNudge(nudge: NudgeMessage): string {
  // Add bolding and intensity symbols
  const prefix = nudge.severity === 'CRITICAL' ? '🚀 [!!!] ' : '📊 ';
  return `${prefix}**${nudge.symbol} ${nudge.text}**`;
}

/**
 * Get the Vibe Check message (Flashbang)
 */
export function getVibeCheckAlert(userId: string): string {
  return `🚀 **[VIBE CHECK] SNAP OUT OF IT <@${userId}>** 🚀\n\n**The Audit is Crimson. Your current betting velocity is giving major rinse vibes.** Your Tether has been notified. We are moving you to voice to Audit your head.`;
}

/**
 * Get a sequence of increasingly severe nudges
 */
export function getEscalatedNudges(userId: string): string[] {
  return [
    `📊 [AUDIT] <@${userId}>, slow down. Momentum is a house advantage.`,
    `⚠️ [SPEED] Betting velocity is peaking. This is where you donate the bag.`,
    `🛑 [RINSE] STOP. Your probability of recovery is near zero. End the session.`
  ];
}

/**
 * Get a message specifically for when a user enters cooldown
 */
export function getCooldownMessage(): string {
  return `🔒 **[COOLDOWN] ACCESS DENIED.** You have crossed the risk threshold. The arena is locked for 15 minutes while you Audit your head. Secure whatever balance you have left.`;
}

/**
 * Get a violation message for when a user ignores earlier nudges
 */
export function getViolationMessage(): string {
  return `🚨 **[VIOLATION] CRITICAL RISK DETECTED.** You are actively ignoring the math. We are escalating this to your emergency contact. WALKING AWAY IS MANDATORY.`;
}
