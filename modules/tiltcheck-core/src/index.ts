/**
 * TiltCheck Core - Tilt Detection & Cooldown Management
 * Monitors user behavior and prevents tilt-driven decisions
 */

export * from './types.js';
export * from './message-analyzer.js';
export * from './cooldown-manager.js';
export * from './tilt-detector.js';

export {
  trackMessage,
  trackLoss,
  resetLossStreak,
  triggerCooldown,
  shouldWarnUser,
  getUserTiltStatus,
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
