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
// Voice guide: humor escalates DOWN as severity escalates UP.
// Gentle = chatty. Moderate = raised eyebrow. Firm = pointed. CRITICAL = no jokes, just truth.
const NUDGE_MESSAGES: Record<string, NudgeMessage[]> = {
  'rapid-messages': [
    { text: "You're clicking fast. Like, really fast. The house loves this energy. Maybe slow down?", severity: 'gentle', category: 'pacing', symbol: '[AUDIT]' },
    { text: "Bold of you to keep that pace up. Anyway, your bet velocity is peaking. The math noticed.", severity: 'moderate', category: 'pacing', symbol: '[SPEED]' },
    { text: "10 bets in 2 minutes. How's that going for you statistically? Yeah. Thought so. Stop.", severity: 'firm', category: 'pacing', symbol: '[RINSE]' },
  ],
  'loss-streak': [
    { text: "3 losses in a row. The RNG doesn't care about your feelings. Take a breather — we'll be here.", severity: 'moderate', category: 'loss', symbol: '[AUDIT]' },
    { text: "The house has officially entered its winning streak era. Revenge betting is their favorite thing. Don't give them the satisfaction.", severity: 'firm', category: 'loss', symbol: '[ALERT]' },
    { text: "You cannot outrun the math. We say this with love. Walk away with what you've got left.", severity: 'CRITICAL', category: 'loss', symbol: '[CRITICAL]' },
  ],
  'large-bet': [
    { text: "That's a big bet. Like, a real chunk of your bag. Just making sure that was on purpose.", severity: 'moderate', category: 'bankroll', symbol: '[RISK]' },
    { text: "You're betting like you've already won. You haven't. Audit your logic before the next one.", severity: 'firm', category: 'bankroll', symbol: '[CASH]' },
  ],
  'playtime-exhaustion': [
    { text: "Three hours in. Your brain is cooked whether you feel it or not. Go eat something. We'll still be here.", severity: 'moderate', category: 'time', symbol: '[TIME]' },
    { text: "The longer you play, the better the odds look to you and the worse they actually get. That's not a coincidence. Go outside.", severity: 'firm', category: 'time', symbol: '[NATURE]' },
  ]
};

const GENERIC_NUDGES: NudgeMessage[] = [
  { text: "Two hours in. How you feeling? The math says... moderate chaos.", severity: 'gentle', category: 'general', symbol: '[HELLO]' },
  { text: "Still here? The house noticed. They sent a thank-you card. Maybe cash out while you're ahead.", severity: 'moderate', category: 'general', symbol: '[PROFIT]' },
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
  return `🔒 **Session locked for 15 minutes.** Not a punishment — the system is doing its job. You crossed your own line. Check your balance, breathe, and come back when you're ready.`;
}

/**
 * Get a violation message for when a user ignores earlier nudges
 */
export function getViolationMessage(): string {
  return `🚨 **We've been telling you.** This is the third time we've flagged this session. We're looping in your accountability partner now. Seriously — walk away.`;
}
