/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Cooldown Manager
 * Tracks cooldown periods and violations
 */
import type { CooldownStatus } from './types.js';
/**
 * Start a cooldown period for a user
 */
export declare function startCooldown(userId: string, reason: string, durationMs?: number): CooldownStatus;
/**
 * End a cooldown period
 */
export declare function endCooldown(userId: string): void;
/**
 * Check if a user is on cooldown
 */
export declare function isOnCooldown(userId: string): boolean;
/**
 * Get cooldown status for a user
 */
export declare function getCooldownStatus(userId: string): CooldownStatus | null;
/**
 * Record a cooldown violation
 */
export declare function recordViolation(userId: string): void;
/**
 * Get violation history for a user (last 24 hours)
 */
export declare function getViolationHistory(userId: string): number;
/**
 * Clear old violation history (cleanup task)
 */
export declare function cleanupOldViolations(): void;
