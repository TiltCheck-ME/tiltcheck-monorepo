/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

export interface MessageRecord {
  content: string;
  timestamp: number;
  channelId: string;
}

export interface BetRecord {
  amount: number;
  game: string;
  timestamp: number;
  result?: 'win' | 'loss';
  won?: boolean;
  gameType?: string;
}

export interface UserActivity {
  userId: string;
  messages: MessageRecord[];
  lossStreak: number;
  cooldownViolations: number;
  recentBets: BetRecord[];
  lastLoss?: number;
  lastCooldownTime?: number;
  currentBalance?: number;
  peakBalance?: number;
  initialDeposit?: number;
  betVelocity?: number;
  baselineBetSize?: number;
  /** Rolling 5-minute baseline bets-per-minute used for velocity spike detection */
  baselineBetVelocity?: number;
  /** Unix ms timestamp of when the current gambling session started */
  sessionStartTime?: number;
}

export interface TiltSignal {
  userId: string;
  signalType: 'loss-streak' | 'bet-escalation' | 'message-sentiment' | 'rapid-losses' | 'cooldown-violation' | 'rapid-messages' | 'caps-spam' | 'rage-quit' | 'loan-request' | 'ai-detected' | 'bet-sizing' | 'bad-beat' | 'martingale' | 'drain-rate';
  severity: number; // 0-10
  confidence: number; // 0-1
  context: Record<string, any>;
  detectedAt: number;
}

export interface CooldownStatus {
  userId: string;
  startedAt: number;
  endsAt: number;
  reason: string;
  violations?: number;
  active: boolean;
  violationCount: number;
}

export interface MessageActivity extends MessageRecord {
}

export interface GameCompletedEvent {
  userId: string;
  gameId: string;
  game: string;
  amount: number;
  result: 'win' | 'loss';
  timestamp: number;
}

export interface TiltEvent {
    type: string;
    data: {
        reason: string;
        userId: string;
        severity: number;
        signals?: { type: string }[];
    };
}
