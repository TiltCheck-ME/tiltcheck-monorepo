// v0.1.0 — 2026-02-25
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

import { eventRouter } from '@tiltcheck/event-router';
import type { CooldownStatus } from './types.js';

const activeCooldowns = new Map<string, CooldownStatus>();
const cooldownHistory = new Map<string, number[]>(); // userId -> violation timestamps

const DEFAULT_COOLDOWN_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Start a cooldown period for a user
 */
export function startCooldown(
  userId: string,
  reason: string,
  durationMs: number = DEFAULT_COOLDOWN_DURATION_MS
): CooldownStatus {
  const now = Date.now();
  const endsAt = now + durationMs;
  
  const status: CooldownStatus = {
    userId,
    active: true,
    reason,
    startedAt: now,
    endsAt,
    violationCount: 0,
  };
  
  activeCooldowns.set(userId, status);
  
  // Auto-end cooldown after duration
  setTimeout(() => {
    endCooldown(userId);
  }, durationMs);
  
  console.log(`[TiltCheck] Cooldown started for ${userId}: ${reason} (${durationMs / 60000} min)`);
  
  return status;
}

/**
 * End a cooldown period
 */
export function endCooldown(userId: string): void {
  const status = activeCooldowns.get(userId);
  if (status) {
    status.active = false;
    activeCooldowns.delete(userId);
    console.log(`[TiltCheck] Cooldown ended for ${userId}`);
  }
}

/**
 * Check if a user is on cooldown
 */
export function isOnCooldown(userId: string): boolean {
  const status = activeCooldowns.get(userId);
  if (!status) return false;
  
  // Double-check if cooldown should have expired
  if (status.endsAt && Date.now() > status.endsAt) {
    endCooldown(userId);
    return false;
  }
  
  return status.active;
}

/**
 * Get cooldown status for a user
 */
export function getCooldownStatus(userId: string): CooldownStatus | null {
  return activeCooldowns.get(userId) || null;
}

/**
 * Record a cooldown violation
 */
export function recordViolation(userId: string): void {
  const status = activeCooldowns.get(userId);
  if (!status) return;
  
  status.violationCount++;
  
  // Track violation history
  if (!cooldownHistory.has(userId)) {
    cooldownHistory.set(userId, []);
  }
  cooldownHistory.get(userId)!.push(Date.now());
  
  // Emit violation event
  void eventRouter.publish(
    'cooldown.violated',
    'tiltcheck-core',
    {
      userId,
      violationCount: status.violationCount,
      cooldownReason: status.reason,
      timestamp: Date.now(),
    }
  );
  
  console.log(`[TiltCheck] Cooldown violation by ${userId} (count: ${status.violationCount})`);
  
  // Extend cooldown on repeated violations
  if (status.violationCount >= 3 && status.endsAt) {
    const extension = 10 * 60 * 1000; // 10 more minutes
    status.endsAt += extension;
    console.log(`[TiltCheck] Extended cooldown for ${userId} by 10 minutes`);
  }
}

/**
 * Get violation history for a user (last 24 hours)
 */
export function getViolationHistory(userId: string): number {
  const history = cooldownHistory.get(userId) || [];
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return history.filter(ts => ts > dayAgo).length;
}

/**
 * Clear old violation history (cleanup task)
 */
export function cleanupOldViolations(): void {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  for (const [userId, timestamps] of cooldownHistory.entries()) {
    const recent = timestamps.filter(ts => ts > weekAgo);
    if (recent.length === 0) {
      cooldownHistory.delete(userId);
    } else {
      cooldownHistory.set(userId, recent);
    }
  }
}

// Cleanup old violations daily
setInterval(cleanupOldViolations, 24 * 60 * 60 * 1000);
