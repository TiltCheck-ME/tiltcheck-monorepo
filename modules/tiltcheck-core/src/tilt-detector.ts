/**
 * Tilt Detector
 * Main service that monitors activity and emits tilt.detected events
 */

import { eventRouter } from '@tiltcheck/event-router';
import { analyzeMessages, calculateTiltScore } from './message-analyzer.js';
import { startCooldown, isOnCooldown, recordViolation, getCooldownStatus } from './cooldown-manager.js';
import type { UserActivity, TiltSignal } from './types.js';

const userActivities = new Map<string, UserActivity>();

/**
 * Track a user message
 */
export function trackMessage(userId: string, content: string, channelId: string): void {
  let activity = userActivities.get(userId);
  
  if (!activity) {
    activity = {
      userId,
      messages: [],
      lossStreak: 0,
      cooldownViolations: 0,
    };
    userActivities.set(userId, activity);
  }
  
  // Add message to history
  activity.messages.push({
    content,
    timestamp: Date.now(),
    channelId,
  });
  
  // Keep last 20 messages only
  if (activity.messages.length > 20) {
    activity.messages = activity.messages.slice(-20);
  }
  
  // Check if user is on cooldown
  if (isOnCooldown(userId)) {
    recordViolation(userId);
    return; // Don't analyze further if on cooldown
  }
  
  // Analyze messages for tilt signals
  const signals = analyzeMessages(activity.messages, userId);
  
  if (signals.length > 0) {
    processTiltSignals(userId, signals);
  }
}

/**
 * Track a loss event (from poker, tips, etc.)
 */
export function trackLoss(userId: string, amount: number, context?: Record<string, any>): void {
  let activity = userActivities.get(userId);
  
  if (!activity) {
    activity = {
      userId,
      messages: [],
      lossStreak: 0,
      cooldownViolations: 0,
    };
    userActivities.set(userId, activity);
  }
  
  activity.lastLoss = Date.now();
  activity.lossStreak++;
  
  // Loss streaks trigger tilt detection
  if (activity.lossStreak >= 3) {
    const signal: TiltSignal = {
      userId,
      signalType: 'loss-streak',
      severity: Math.min(5, activity.lossStreak),
      confidence: 0.85,
      context: { lossStreak: activity.lossStreak, amount, ...context },
      detectedAt: Date.now(),
    };
    
    processTiltSignals(userId, [signal]);
  }
}

/**
 * Reset loss streak (on win or successful cooldown)
 */
export function resetLossStreak(userId: string): void {
  const activity = userActivities.get(userId);
  if (activity) {
    activity.lossStreak = 0;
  }
}

/**
 * Process tilt signals and emit events
 */
function processTiltSignals(userId: string, signals: TiltSignal[]): void {
  const tiltScore = calculateTiltScore(signals);
  
  // Tilt score > 3.0 triggers cooldown recommendation
  if (tiltScore >= 3.0) {
    const primarySignal = signals.reduce((prev, curr) => 
      curr.severity > prev.severity ? curr : prev
    );
    
    // Emit tilt.detected event
    void eventRouter.publish(
      'tilt.detected',
      'tiltcheck-core',
      {
        userId,
        reason: primarySignal.signalType,
        severity: Math.ceil(tiltScore),
        tiltScore,
        signals: signals.map(s => ({
          type: s.signalType,
          severity: s.severity,
          confidence: s.confidence,
        })),
        timestamp: Date.now(),
      }
    );
    
    console.log(`[TiltCheck] Tilt detected for ${userId}: ${primarySignal.signalType} (score: ${tiltScore.toFixed(2)})`);
    
    // Auto-start cooldown for severe tilt (score >= 4)
    if (tiltScore >= 4.0 && !isOnCooldown(userId)) {
      const duration = Math.min(30, Math.ceil(tiltScore * 5)) * 60 * 1000; // 5-30 minutes
      startCooldown(userId, `Tilt detected: ${primarySignal.signalType}`, duration);
    }
  }
}

/**
 * Manually trigger cooldown (from Discord command)
 */
export function triggerCooldown(
  userId: string,
  reason: string = 'User requested',
  durationMinutes: number = 15
): void {
  startCooldown(userId, reason, durationMinutes * 60 * 1000);
}

/**
 * Check if user should be warned
 */
export function shouldWarnUser(userId: string): boolean {
  const activity = userActivities.get(userId);
  if (!activity) return false;
  
  // Warn on loss streak
  if (activity.lossStreak >= 2) return true;
  
  // Warn if recent tilt signals
  const recentMessages = activity.messages.filter(m => 
    Date.now() - m.timestamp < 5 * 60 * 1000 // Last 5 minutes
  );
  const signals = analyzeMessages(recentMessages, userId);
  
  return signals.length > 0 && calculateTiltScore(signals) >= 2.0;
}

/**
 * Get user tilt status
 */
export function getUserTiltStatus(userId: string): {
  lossStreak: number;
  onCooldown: boolean;
  cooldownInfo?: ReturnType<typeof getCooldownStatus>;
  recentSignals: TiltSignal[];
} {
  const activity = userActivities.get(userId);
  const cooldownInfo = getCooldownStatus(userId);
  
  const recentMessages = activity?.messages.filter(m => 
    Date.now() - m.timestamp < 10 * 60 * 1000
  ) || [];
  
  const recentSignals = analyzeMessages(recentMessages, userId);
  
  return {
    lossStreak: activity?.lossStreak || 0,
    onCooldown: isOnCooldown(userId),
    cooldownInfo: cooldownInfo || undefined,
    recentSignals,
  };
}

// Subscribe to game/tip events to track losses
eventRouter.subscribe('tip.failed', (event) => {
  const { userId, amount } = event.data;
  trackLoss(userId, amount, { source: 'tip-failed' });
}, 'tiltcheck-core');

eventRouter.subscribe('game.completed', (_event) => {
  // Track losses for non-winners
  // TODO: Implementation depends on game result structure
}, 'tiltcheck-core');

console.log('[TiltCheck] Tilt Detection Core initialized');
