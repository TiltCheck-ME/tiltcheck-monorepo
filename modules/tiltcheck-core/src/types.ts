/**
 * Tilt Detection Core
 * Analyzes behavior patterns to detect tilt signals
 * Integrates with Degen Trust Engine
 */

export interface TiltSignal {
  userId: string;
  signalType: 'rapid-messages' | 'caps-spam' | 'loan-request' | 'rage-quit' | 'bad-beat' | 'loss-streak' | 'bet-sizing' | 'ai-detected';
  severity: number; // 1-5
  confidence: number; // 0-1
  context?: Record<string, any>;
  detectedAt: number;
}

/**
 * Tracks a single bet for bet sizing analysis
 */
export interface BetRecord {
  amount: number;
  timestamp: number;
  gameType: string;
  won: boolean;
}

export interface UserActivity {
  userId: string;
  messages: MessageActivity[];
  lastTipRequest?: number;
  lastLoss?: number;
  lossStreak: number;
  cooldownViolations: number;
  lastCooldownViolation?: number;
  /** Recent bets for bet sizing analysis (last 10) */
  recentBets: BetRecord[];
  /** Baseline average bet size (rolling average) */
  baselineBetSize?: number;
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

/**
 * Game completion event data structure
 */
export interface GameCompletedEvent {
  gameId: string;
  channelId: string;
  result: {
    winners: Array<{
      userId: string;
      username: string;
      winnings: number;
    }>;
    pot: number;
    badBeat?: {
      loserId: string;
      probability: number;
    };
  };
  /** All participants in the game */
  participants?: string[];
  duration: number;
}
