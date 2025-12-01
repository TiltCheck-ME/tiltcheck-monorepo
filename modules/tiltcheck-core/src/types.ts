/**
 * Tilt Detection Core
 * Analyzes behavior patterns to detect tilt signals
 * Integrates with Degen Trust Engine
 */

export interface TiltSignal {
  userId: string;
  signalType: 'rapid-messages' | 'caps-spam' | 'loan-request' | 'rage-quit' | 'bad-beat' | 'loss-streak' | 'ai-detected';
  severity: number; // 1-5
  confidence: number; // 0-1
  context?: Record<string, any>;
  detectedAt: number;
}

export interface UserActivity {
  userId: string;
  messages: MessageActivity[];
  lastTipRequest?: number;
  lastLoss?: number;
  lossStreak: number;
  cooldownViolations: number;
  lastCooldownViolation?: number;
}

export interface MessageActivity {
  content: string;
  timestamp: number;
  channelId: string;
}

export interface CooldownStatus {
  userId: string;
  active: boolean;
  reason?: string;
  startedAt?: number;
  endsAt?: number;
  violationCount: number;
}
