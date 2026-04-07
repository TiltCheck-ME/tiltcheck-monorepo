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
/**
 * Get a nudge message based on tilt signals
 */
export declare function getNudgeMessage(signals: TiltSignal[]): NudgeMessage;
/**
 * Format a nudge for Discord (Markdown)
 */
export declare function formatNudge(nudge: NudgeMessage): string;
/**
 * Get the Vibe Check message (Flashbang)
 */
export declare function getVibeCheckAlert(userId: string): string;
/**
 * Get a sequence of increasingly severe nudges
 */
export declare function getEscalatedNudges(userId: string): string[];
/**
 * Get a message specifically for when a user enters cooldown
 */
export declare function getCooldownMessage(): string;
/**
 * Get a violation message for when a user ignores earlier nudges
 */
export declare function getViolationMessage(): string;
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
export declare function evaluateRtpLegalTrigger(rtpDelta: number, casinoName: string, licenseAuthority?: string, confidence?: import('@tiltcheck/types').RtpConfidenceResult): LegalTrigger | null;
