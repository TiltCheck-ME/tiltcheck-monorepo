/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * TiltCheck Sidebar Companion Types
 * 
 * A persistent sidebar that runs alongside casino gameplay providing:
 * - Real-time stats and RTP tracking
 * - Anomaly notifications
 * - Auto-vault balance protection
 * - Support bot chat
 * - Phone-a-friend accountability
 * - Cooldown/self-exclusion controls
 */

/**
 * Sidebar display mode
 */
export type SidebarMode = 'compact' | 'expanded' | 'minimized';

/**
 * Sidebar panel types
 */
export type SidebarPanel = 
  | 'stats'
  | 'notifications'
  | 'vault'
  | 'chat'
  | 'accountability'
  | 'cooldown'
  | 'settings';

/**
 * Main sidebar state
 */
export interface SidebarState {
  /** Current display mode */
  mode: SidebarMode;
  /** Active panel */
  activePanel: SidebarPanel;
  /** Whether sidebar is pinned open */
  pinned: boolean;
  /** User preferences */
  preferences: SidebarPreferences;
  /** Current session data */
  session: SessionStats;
  /** Active notifications */
  notifications: SidebarNotification[];
  /** Vault status */
  vault: VaultStatus;
  /** Chat state */
  chat: ChatState;
  /** Accountability buddy status */
  accountability: AccountabilityState;
  /** Cooldown status */
  cooldown: CooldownState;
}

/**
 * User preferences for sidebar
 */
export interface SidebarPreferences {
  /** Auto-show on game detection */
  autoShow: boolean;
  /** Sound notifications */
  soundEnabled: boolean;
  /** Vibration on mobile */
  vibrationEnabled: boolean;
  /** Default panel on open */
  defaultPanel: SidebarPanel;
  /** Auto-vault threshold (0 = disabled) */
  autoVaultThreshold: number;
  /** Auto-vault percentage to lock */
  autoVaultPercentage: number;
  /** Cooldown warning thresholds */
  cooldownWarnings: {
    lossStreak: number;    // Warn after N consecutive losses
    sessionTime: number;   // Warn after N minutes
    lossAmount: number;    // Warn after losing $N
  };
}

/**
 * Real-time session statistics
 */
export interface SessionStats {
  /** Session start time */
  startedAt: number;
  /** Current casino */
  casinoId: string;
  /** Current game */
  gameId: string;
  /** Total bets this session */
  totalBets: number;
  /** Total wagered */
  totalWagered: number;
  /** Total payout received */
  totalPayout: number;
  /** Current session RTP */
  sessionRTP: number;
  /** Profit/loss this session */
  profitLoss: number;
  /** Current win/loss streak */
  streak: {
    type: 'win' | 'loss' | 'none';
    count: number;
  };
  /** Highest balance this session */
  peakBalance: number;
  /** Current balance */
  currentBalance: number;
  /** Time since last break */
  timeSinceBreak: number;
}

/**
 * Sidebar notification
 */
export interface SidebarNotification {
  id: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  category: 'anomaly' | 'vault' | 'cooldown' | 'accountability' | 'system';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  /** Action button */
  action?: {
    label: string;
    handler: string; // Action identifier
  };
  /** Auto-dismiss after ms (0 = manual) */
  autoDismiss: number;
}

/**
 * Vault status and controls
 */
export interface VaultStatus {
  /** Whether vault is enabled */
  enabled: boolean;
  /** Current locked amount */
  lockedAmount: number;
  /** Lock expiry time (0 = manual unlock) */
  lockExpiry: number;
  /** Auto-vault settings */
  autoVault: {
    enabled: boolean;
    threshold: number;      // Lock when balance exceeds
    percentage: number;     // Percentage to lock
    lastTriggered?: number; // Last auto-vault time
  };
  /** Vault history */
  history: VaultTransaction[];
}

/**
 * Vault transaction record
 */
export interface VaultTransaction {
  id: string;
  type: 'lock' | 'unlock' | 'auto-lock';
  amount: number;
  timestamp: number;
  trigger: 'manual' | 'threshold' | 'cooldown' | 'accountability';
}

/**
 * Support bot chat state
 */
export interface ChatState {
  /** Chat enabled */
  enabled: boolean;
  /** Chat messages */
  messages: ChatMessage[];
  /** Is bot typing */
  botTyping: boolean;
  /** Suggested quick replies */
  quickReplies: string[];
  /** Chat context for AI */
  context: {
    currentGame: string;
    sessionStats: SessionStats;
    recentAnomalies: string[];
    userMood?: 'calm' | 'frustrated' | 'tilted';
  };
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'bot' | 'system';
  content: string;
  timestamp: number;
  /** Suggested actions from bot */
  actions?: ChatAction[];
}

/**
 * Actionable suggestion from chat bot
 */
export interface ChatAction {
  type: 'vault' | 'cooldown' | 'call-friend' | 'break' | 'link';
  label: string;
  payload?: Record<string, unknown>;
}

/**
 * Accountability buddy state
 */
export interface AccountabilityState {
  /** Feature enabled */
  enabled: boolean;
  /** Connected buddies */
  buddies: AccountabilityBuddy[];
  /** Active screen share session */
  activeSession?: ScreenShareSession;
  /** Pending buddy requests */
  pendingRequests: BuddyRequest[];
}

/**
 * Accountability buddy
 */
export interface AccountabilityBuddy {
  id: string;
  name: string;
  /** Discord/phone identifier */
  contact: string;
  contactType: 'discord' | 'phone' | 'email';
  /** Online status */
  online: boolean;
  /** Last active */
  lastSeen: number;
  /** Permissions granted */
  permissions: {
    viewStats: boolean;
    receiveAlerts: boolean;
    triggerCooldown: boolean;
    viewBalance: boolean;
  };
}

/**
 * Screen share session for accountability
 */
export interface ScreenShareSession {
  id: string;
  buddyId: string;
  startedAt: number;
  /** WebRTC peer connection state */
  connectionState: 'connecting' | 'connected' | 'disconnected';
  /** Whether audio is shared */
  audioEnabled: boolean;
  /** Whether buddy can see balance */
  balanceVisible: boolean;
}

/**
 * Buddy request
 */
export interface BuddyRequest {
  id: string;
  from: {
    id: string;
    name: string;
    contact: string;
  };
  requestedAt: number;
  message?: string;
}

/**
 * Cooldown/self-exclusion state
 */
export interface CooldownState {
  /** Currently in cooldown */
  active: boolean;
  /** Cooldown end time */
  endsAt?: number;
  /** Cooldown type */
  type?: 'break' | 'session-limit' | 'loss-limit' | 'buddy-triggered' | 'self-exclusion';
  /** Who triggered (if buddy) */
  triggeredBy?: string;
  /** Reason for cooldown */
  reason?: string;
  /** Session limits */
  limits: {
    maxSessionTime?: number;     // Max minutes per session
    maxDailyLoss?: number;       // Max daily loss amount
    maxDailyWager?: number;      // Max daily wager amount
    requiredBreakInterval?: number; // Force break every N minutes
  };
  /** Cooldown history */
  history: CooldownRecord[];
}

/**
 * Cooldown history record
 */
export interface CooldownRecord {
  id: string;
  type: CooldownState['type'];
  startedAt: number;
  endedAt: number;
  triggeredBy: 'self' | 'buddy' | 'system';
  reason: string;
  /** Was cooldown completed or bypassed */
  completed: boolean;
}

/**
 * Sidebar event types for communication
 */
export type SidebarEvent =
  | { type: 'GAME_DETECTED'; payload: { casinoId: string; gameId: string } }
  | { type: 'BET_RECORDED'; payload: { wager: number; payout: number } }
  | { type: 'ANOMALY_DETECTED'; payload: { anomalyType: string; severity: string } }
  | { type: 'BALANCE_UPDATED'; payload: { balance: number } }
  | { type: 'VAULT_TRIGGERED'; payload: { amount: number; trigger: string } }
  | { type: 'COOLDOWN_STARTED'; payload: { type: string; duration: number } }
  | { type: 'BUDDY_ALERT'; payload: { buddyId: string; message: string } }
  | { type: 'CHAT_MESSAGE'; payload: { message: string } };
