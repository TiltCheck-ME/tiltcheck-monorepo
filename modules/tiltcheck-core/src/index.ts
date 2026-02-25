/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * TiltCheck Core - Tilt Detection & Cooldown Management
 * Monitors user behavior and prevents tilt-driven decisions
 */

export * from './types.js';
export * from './message-analyzer.js';
export * from './cooldown-manager.js';
export * from './tilt-detector.js';
export * from './nudge-generator.js';

export {
  trackMessage,
  trackLoss,
  trackBet,
  resetLossStreak,
  triggerCooldown,
  shouldWarnUser,
  getUserTiltStatus,
  getUserActivity,
} from './tilt-detector.js';

export {
  startCooldown,
  endCooldown,
  isOnCooldown,
  getCooldownStatus,
  getViolationHistory,
} from './cooldown-manager.js';

export {
  analyzeMessages,
  calculateTiltScore,
} from './message-analyzer.js';

export {
  getNudgeMessage,
  formatNudge,
  getEscalatedNudges,
  getCooldownMessage,
  getViolationMessage,
  type NudgeMessage,
} from './nudge-generator.js';
