// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01
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
  intervention_type: 'VIBE_CHECK' | 'REALITY_BRIDGE' | 'KILL_SWITCH' | 'SHIT_TALK';
}

// THE RELUCTANT BABYSITTER: TOUGH LOVE AUDIT STRINGS
// Voice guide: humor escalates DOWN as severity escalates UP.
// Gentle = chatty. Moderate = raised eyebrow. Firm = pointed. CRITICAL = no jokes, just truth.
const NUDGE_MESSAGES: Record<string, NudgeMessage[]> = {
  'rapid-messages': [
    { text: "Slow down, Turbo. Those buttons aren't going anywhere, but your balance is.", severity: 'gentle', category: 'pacing', symbol: '[AUDIT]', intervention_type: 'SHIT_TALK' },
    { text: "Bold of you to keep that pace up. Anyway, your bet velocity is peaking. The math noticed.", severity: 'moderate', category: 'pacing', symbol: '[SPEED]', intervention_type: 'SHIT_TALK' },
    { text: "10 bets in 2 minutes. How's that going for you statistically? Yeah. Thought so. Stop.", severity: 'firm', category: 'pacing', symbol: '[RINSE]', intervention_type: 'REALITY_BRIDGE' },
  ],
  'loss-streak': [
    { text: "3 losses in a row. The RNG doesn't care about your feelings. Take a breather — we'll be here.", severity: 'moderate', category: 'loss', symbol: '[AUDIT]', intervention_type: 'VIBE_CHECK' },
    { text: "The house has officially entered its winning streak era. Revenge betting is their favorite thing. Don't give them the satisfaction.", severity: 'firm', category: 'loss', symbol: '[ALERT]', intervention_type: 'REALITY_BRIDGE' },
    { text: "You cannot outrun the math. We say this with love. Walk away with what you've got left.", severity: 'CRITICAL', category: 'loss', symbol: '[CRITICAL]', intervention_type: 'KILL_SWITCH' },
  ],
  'large-bet': [
    { text: "That's a big bet. Like, a real chunk of your bag. Just making sure that was on purpose.", severity: 'moderate', category: 'bankroll', symbol: '[RISK]', intervention_type: 'VIBE_CHECK' },
    { text: "You're betting like you've already won. You haven't. Audit your logic before the next one.", severity: 'firm', category: 'bankroll', symbol: '[CASH]', intervention_type: 'REALITY_BRIDGE' },
  ],
  'playtime-exhaustion': [
    { text: "Three hours in. Your brain is cooked whether you feel it or not. Go eat something. We'll still be here.", severity: 'moderate', category: 'time', symbol: '[TIME]', intervention_type: 'VIBE_CHECK' },
    { text: "The longer you play, the better the odds look to you and the worse they actually get. That's not a coincidence. Go outside.", severity: 'firm', category: 'time', symbol: '[NATURE]', intervention_type: 'REALITY_BRIDGE' },
  ],
  'martingale': [
    { text: "Oh, doubling down again? Bold strategy. Let's see if it pays off. (Narrator: It won't.)", severity: 'moderate', category: 'bankroll', symbol: '[MATH]', intervention_type: 'SHIT_TALK' },
    { text: "Three consecutive double-ups. That's not a strategy, that's a prayer. The math has no sympathy.", severity: 'firm', category: 'bankroll', symbol: '[MATH]', intervention_type: 'REALITY_BRIDGE' },
    { text: "Martingale detected. The theoretical infinite loss is approaching the practical one. Stop.", severity: 'CRITICAL', category: 'bankroll', symbol: '[CRITICAL]', intervention_type: 'KILL_SWITCH' },
  ],
  'drain-rate': [
    { text: "Half your deposit in under 10 minutes. The math is currently beating you like a drum. Take 5 before you're eating ramen all week.", severity: 'firm', category: 'drain', symbol: '[DRAIN]', intervention_type: 'SHIT_TALK' },
    { text: "50% gone in 10 minutes is a velocity problem, not a luck problem. Mandatory stop.", severity: 'CRITICAL', category: 'drain', symbol: '[CRITICAL]', intervention_type: 'KILL_SWITCH' },
  ],
};

const GENERIC_NUDGES: NudgeMessage[] = [
  { text: "Two hours in. How you feeling? The math says... moderate chaos.", severity: 'gentle', category: 'general', symbol: '[HELLO]', intervention_type: 'VIBE_CHECK' },
  { text: "Still here? The house noticed. They sent a thank-you card. Maybe cash out while you're ahead.", severity: 'moderate', category: 'general', symbol: '[PROFIT]', intervention_type: 'VIBE_CHECK' },
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
  // Add bolding and intensity indicators — no emojis per brand law
  const prefix = nudge.severity === 'CRITICAL' ? '[!!!] ' : '[>>] ';
  return `${prefix}**${nudge.symbol} ${nudge.text}**`;
}

/**
 * Get the Vibe Check message (Flashbang)
 */
export function getVibeCheckAlert(userId: string): string {
  return `**[VIBE CHECK] SNAP OUT OF IT <@${userId}>**\n\n**The Audit is Crimson. Your current betting velocity is giving major rinse vibes.** Your Tether has been notified. We are moving you to voice to Audit your head.`;
}

/**
 * Get a sequence of increasingly severe nudges
 */
export function getEscalatedNudges(userId: string): string[] {
  return [
    `[AUDIT] <@${userId}>, slow down. Momentum is a house advantage.`,
    `[SPEED] Betting velocity is peaking. This is where you donate the bag.`,
    `[RINSE] STOP. Your probability of recovery is near zero. End the session.`
  ];
}

/**
 * Get a message specifically for when a user enters cooldown
 */
export function getCooldownMessage(): string {
  return `**[LOCKED] Session locked for 15 minutes.** Not a punishment — the system is doing its job. You crossed your own line. Check your balance, breathe, and come back when you're ready.`;
}

/**
 * Get a violation message for when a user ignores earlier nudges
 */
export function getViolationMessage(): string {
  return `**[ESCALATED] We've been telling you.** This is the third time we've flagged this session. We're looping in your accountability partner now. Seriously — walk away.`;
}

// ============================================================
// Legal Trigger: RTP Discrepancy -> Regulatory Action
// ============================================================

/**
 * Known regulatory licensing bodies and their complaint/contact URLs.
 * Keyed by normalized authority name as it appears in casino license records.
 */
const REGULATOR_REGISTRY: Record<string, { name: string; contactUrl: string; complaintUrl: string }> = {
  'malta gaming authority': {
    name: 'Malta Gaming Authority (MGA)',
    contactUrl: 'https://www.mga.org.mt/player-hub/',
    complaintUrl: 'https://www.mga.org.mt/player-hub/submit-a-complaint/',
  },
  'mga': {
    name: 'Malta Gaming Authority (MGA)',
    contactUrl: 'https://www.mga.org.mt/player-hub/',
    complaintUrl: 'https://www.mga.org.mt/player-hub/submit-a-complaint/',
  },
  'uk gambling commission': {
    name: 'UK Gambling Commission (UKGC)',
    contactUrl: 'https://www.gamblingcommission.gov.uk/contact-us',
    complaintUrl: 'https://www.gamblingcommission.gov.uk/consumers/how-to-complain-about-a-gambling-business',
  },
  'ukgc': {
    name: 'UK Gambling Commission (UKGC)',
    contactUrl: 'https://www.gamblingcommission.gov.uk/contact-us',
    complaintUrl: 'https://www.gamblingcommission.gov.uk/consumers/how-to-complain-about-a-gambling-business',
  },
  'curacao': {
    name: 'Curacao eGaming',
    contactUrl: 'https://www.curacao-egaming.com/contact',
    complaintUrl: 'https://www.curacao-egaming.com/dispute-resolution',
  },
  'curacao egaming': {
    name: 'Curacao eGaming',
    contactUrl: 'https://www.curacao-egaming.com/contact',
    complaintUrl: 'https://www.curacao-egaming.com/dispute-resolution',
  },
  'kahnawake': {
    name: 'Kahnawake Gaming Commission (KGC)',
    contactUrl: 'https://www.kahnawake.com/gambling/dispute.asp',
    complaintUrl: 'https://www.kahnawake.com/gambling/dispute.asp',
  },
  'gibraltar regulatory authority': {
    name: 'Gibraltar Regulatory Authority',
    contactUrl: 'https://www.gra.gi/gambling/contact',
    complaintUrl: 'https://www.gra.gi/gambling/complaints',
  },
  'isle of man': {
    name: 'Isle of Man Gambling Supervision Commission',
    contactUrl: 'https://www.iomgsc.im/contact',
    complaintUrl: 'https://www.iomgsc.im/players/make-complaint',
  },
  'alderney': {
    name: 'Alderney Gambling Control Commission (AGCC)',
    contactUrl: 'https://www.agcc.gg/contact-us',
    complaintUrl: 'https://www.agcc.gg/player-protection',
  },
  'antillephone': {
    name: 'Antillephone N.V. (Curacao)',
    contactUrl: 'https://antillephone.com/contact/',
    complaintUrl: 'https://antillephone.com/dispute-resolution/',
  },
};

/**
 * Tier classification for an RTP discrepancy.
 *
 * | Delta          | Level     | Action                        |
 * | 0.5% - 1.0%   | monitor   | Track next 500 spins          |
 * | 1.1% - 3.0%   | alert     | Request Game History Export   |
 * | > 3.0%        | breach    | File regulatory complaint     |
 *
 * NOTE: "breach" is only returned when the discrepancy is statistically
 * confirmed (p < 0.05) via RtpConfidenceResult. Raw delta alone is not enough.
 */
export type RtpDiscrepancyLevel = 'monitor' | 'alert' | 'breach';

export interface LegalTrigger {
  discrepancyLevel: RtpDiscrepancyLevel;
  /** RTP delta in percentage points (e.g. 4.5 means platform is 4.5pp below provider max) */
  rtpDelta: number;
  casinoName: string;
  message: string;
  suggestedAction: 'MONITOR' | 'REQUEST_HISTORY' | 'REGULATORY_COMPLAINT';
  /** The regulatory body that licenses this casino, if known */
  regulatoryBody?: string;
  /** Direct URL to the regulator's player portal */
  regulatoryContactUrl?: string;
  /** Direct URL to the regulator's complaint submission page */
  regulatoryComplaintUrl?: string;
  /**
   * Statistical confidence result attached to this trigger.
   * Consumers MUST surface this to the user on the "Review Evidence" screen.
   * A LegalTrigger without a confidence result should not be presented as actionable.
   */
  confidence?: import('@tiltcheck/types').RtpConfidenceResult;
}

/**
 * Evaluate whether an RTP discrepancy warrants a legal/regulatory nudge.
 *
 * Statistical gating rules (prevents hallucinated legal claims):
 *   - "breach" is only returned when confidence.confidenceTier is 'likely_nerf' or 'confirmed_nerf'
 *     (p < 0.05, sample >= minimum required). Raw delta alone never triggers regulatory complaint.
 *   - "alert" requires at least 'plausible_variance' tier with delta >= 1.1pp.
 *   - "monitor" is the lowest tier and requires no statistical threshold.
 *
 * @param rtpDelta         - Percentage-point gap between provider max RTP and platform setting.
 * @param casinoName       - Human-readable casino name (e.g. 'Roobet').
 * @param licenseAuthority - The casino's licensing body string (e.g. 'Curacao', 'MGA').
 * @param confidence       - Optional RtpConfidenceResult from assessRtpConfidence().
 *                           If omitted, "breach" will never be returned (data not validated).
 *
 * @returns LegalTrigger, or null if delta is below noise floor (< 0.5pp).
 *
 * @example
 * // With statistical confirmation (p < 0.01, 50,000 spins)
 * const conf = assessRtpConfidence(89.5, 96.5, 50000);
 * const trigger = evaluateRtpLegalTrigger(7.0, 'Roobet', 'Curacao', conf);
 * // => { discrepancyLevel: 'breach', suggestedAction: 'REGULATORY_COMPLAINT', ... }
 *
 * @example
 * // Without enough data — capped at 'alert', not 'breach'
 * const conf = assessRtpConfidence(89.5, 96.5, 50); // only 50 spins
 * const trigger = evaluateRtpLegalTrigger(7.0, 'Roobet', 'Curacao', conf);
 * // => { discrepancyLevel: 'alert', suggestedAction: 'REQUEST_HISTORY', ... }
 */
export function evaluateRtpLegalTrigger(
  rtpDelta: number,
  casinoName: string,
  licenseAuthority?: string,
  confidence?: import('@tiltcheck/types').RtpConfidenceResult
): LegalTrigger | null {
  if (rtpDelta < 0.5) return null; // Below noise floor — no action

  const regulator = licenseAuthority
    ? REGULATOR_REGISTRY[licenseAuthority.toLowerCase().trim()]
    : undefined;

  // Statistical gate: only escalate to "breach" when data supports it
  const isStatisticallyConfirmed = confidence?.isStatisticallySignificant === true;
  const isHighConfidence = confidence?.confidenceTier === 'confirmed_nerf';
  const hasInsufficientData = confidence?.confidenceTier === 'insufficient_data';

  // A "breach" without statistical backing is legally indefensible — cap at "alert"
  const canTriggerBreach = rtpDelta >= 3.0 && isStatisticallyConfirmed;
  // An "alert" without enough data is premature — cap at "monitor"
  const canTriggerAlert = rtpDelta >= 1.1 && !hasInsufficientData;

  const confidenceNote = confidence
    ? ` Based on ${confidence.sampleSize.toLocaleString()} community spins (p=${(confidence.pValue * 100).toFixed(2)}%).`
    : ' Insufficient session data — result is unverified.';

  if (canTriggerBreach) {
    const certaintyLabel = isHighConfidence ? '99%' : '95%';
    return {
      discrepancyLevel: 'breach',
      rtpDelta,
      casinoName,
      suggestedAction: 'REGULATORY_COMPLAINT',
      message: `Mathematical deviation of ${rtpDelta.toFixed(2)}pp confirmed on ${casinoName} at ${certaintyLabel} statistical confidence.${confidenceNote} `
        + (regulator
            ? `Action: File a Fairness Dispute with the ${regulator.name}.`
            : `Action: File a Fairness Dispute with the casino's licensing authority. `
              + `Request your full game history and session logs as supporting evidence.`),
      regulatoryBody: regulator?.name,
      regulatoryContactUrl: regulator?.contactUrl,
      regulatoryComplaintUrl: regulator?.complaintUrl,
      confidence,
    };
  }

  if (canTriggerAlert) {
    return {
      discrepancyLevel: 'alert',
      rtpDelta,
      casinoName,
      suggestedAction: 'REQUEST_HISTORY',
      message: `Significant RTP deviation of ${rtpDelta.toFixed(2)}pp on ${casinoName}.${confidenceNote} `
        + `Request a Game History Export from the operator's support team. `
        + `Document session IDs for potential escalation.`,
      regulatoryBody: regulator?.name,
      regulatoryContactUrl: regulator?.contactUrl,
      confidence,
    };
  }

  // 0.5 - 1.0pp, or insufficient data at any delta
  return {
    discrepancyLevel: 'monitor',
    rtpDelta,
    casinoName,
    suggestedAction: 'MONITOR',
    message: hasInsufficientData
      ? `RTP variance of ${rtpDelta.toFixed(2)}pp detected on ${casinoName}.${confidenceNote} `
          + `Minimum ${confidence?.minimumRequiredSample?.toLocaleString() ?? 'unknown'} spins required for a valid assessment. Keep tracking.`
      : `Minor RTP variance of ${rtpDelta.toFixed(2)}pp detected on ${casinoName}.${confidenceNote} `
          + `Within standard volatility range but worth tracking. Monitor the next 500 spins.`,
    regulatoryBody: regulator?.name,
    regulatoryContactUrl: regulator?.contactUrl,
    confidence,
  };
}
