/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Tilt Detector
 * Main service that monitors activity and emits tilt.detected events
 */
import { getCooldownStatus } from './cooldown-manager.js';
import type { UserActivity, TiltSignal } from './types.js';
/**
 * Track a user message
 */
export declare function trackMessage(userId: string, content: string, channelId: string): void;
/**
 * Track a loss event (from poker, tips, etc.)
 */
export declare function trackLoss(userId: string, amount: number, context?: Record<string, any>): void;
/**
 * Reset loss streak (on win or successful cooldown)
 */
export declare function resetLossStreak(userId: string): void;
/**
 * Track a bet for bet sizing analysis
 * @param userId - User who placed the bet
 * @param amount - Bet amount
 * @param gameType - Type of game (poker, blackjack, etc.)
 * @param won - Whether the bet was won
 */
export declare function trackBet(userId: string, amount: number, gameType: string, won: boolean): void;
/**
 * Manually trigger cooldown (from Discord command)
 */
export declare function triggerCooldown(userId: string, reason?: string, durationMinutes?: number): void;
/**
 * Check if user should be warned
 */
export declare function shouldWarnUser(userId: string): boolean;
/**
 * Get user tilt status
 */
export declare function getUserTiltStatus(userId: string): {
    lossStreak: number;
    onCooldown: boolean;
    cooldownInfo?: ReturnType<typeof getCooldownStatus>;
    recentSignals: TiltSignal[];
};
/**
 * Get user activity (for admin/debug purposes)
 */
export declare function getUserActivity(userId: string): UserActivity | undefined;
