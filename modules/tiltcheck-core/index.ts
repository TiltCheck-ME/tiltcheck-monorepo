/**
 * TiltCheck Core Module
 * Tilt detection and cooldown management
 */

// Re-export everything from src/
export * from './src/index.js';

// Legacy TiltEvent interface for backwards compatibility
export interface TiltEvent {
  userId: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Detect tilt for a user based on their activity history.
 * Uses loss streaks, message sentiment, and behavior patterns to determine tilt risk.
 * 
 * @param userId - The user ID to check for tilt
 * @returns TiltEvent if tilt is detected, null otherwise
 */
export function detectTilt(userId: string): TiltEvent | null {
  // Import the actual tilt status from the detector
  // Using dynamic import to avoid circular dependency issues
  const { getUserTiltStatus } = require('./src/tilt-detector.js');
  
  const status = getUserTiltStatus(userId);
  
  // No signals detected
  if (status.recentSignals.length === 0 && status.lossStreak < 2) {
    return null;
  }
  
  // Calculate severity based on loss streak and signal count
  let severity: 'low' | 'medium' | 'high' = 'low';
  
  // High severity: on cooldown, 4+ loss streak, or multiple severe signals
  if (
    status.onCooldown ||
    status.lossStreak >= 4 ||
    status.recentSignals.some(s => s.severity >= 4)
  ) {
    severity = 'high';
  }
  // Medium severity: 2-3 loss streak or any tilt signals detected
  else if (
    status.lossStreak >= 2 ||
    status.recentSignals.length > 0
  ) {
    severity = 'medium';
  }
  
  return {
    userId,
    timestamp: Date.now(),
    severity,
  };
}
