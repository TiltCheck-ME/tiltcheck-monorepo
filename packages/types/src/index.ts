// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * @tiltcheck/types
 * 
 * Unified Type System for TiltCheck Ecosystem
 * This is the SINGLE SOURCE OF TRUTH for all TypeScript interfaces.
 * All packages and apps import types from here.
 */



// ============================================
// Identity & Auth Types
// ============================================

/**
 * Unified user identity structure
 */
export interface Identity {
  userId: string;
  discordId?: string;
  username?: string;
  linkedWallet?: string;
  roles: string[];
  analytics?: UserAnalytics;
  redeemThreshold?: number;
}

/**
 * User-specific behavioral and profit metrics
 */
export interface UserAnalytics {
  totalJuice: number; // SOL
  totalTipsCaught: number; // SOL
  eventCount: number;
  redeemWins: number;
  totalRedeemed: number; // USD/Token equivalent
  lastRedeemAt?: number;
}

/**
 * Session types supported by the auth system
 */
export type SessionType = 'user' | 'admin' | 'service';

/**
 * User roles
 */
export type UserRole = 'user' | 'admin' | 'moderator' | 'partner' | 'bot' | 'service';

/**
 * JWT Payload for user sessions
 */
export interface JWTPayload {
  sub: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  jti?: string;
  type: SessionType;
  roles?: string[];
  [key: string]: unknown;
}

/**
 * JWT configuration options
 */
export interface JWTConfig {
  secret: string;
  issuer: string;
  audience: string;
  expiresIn: string;
  algorithm?: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'ES256';
}

/**
 * Result of JWT verification
 */
export interface JWTVerifyResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * Cookie configuration for subdomain-wide sessions
 */
export interface CookieConfig {
  name: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
}

/**
 * Session cookie data (stored in JWT)
 */
export interface SessionData {
  userId: string;
  type: SessionType;
  discordId?: string;
  discordUsername?: string;
  walletAddress?: string;
  roles?: string[];
  createdAt: number;
}

/**
 * Cookie options for setting/clearing
 */
export interface CookieOptions {
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  expires?: Date;
}

/**
 * Authenticated request context
 */
export interface AuthContext {
  userId: string;
  sessionType: SessionType;
  discordId?: string;
  walletAddress?: string;
  roles: string[];
  isAdmin: boolean;
  session: SessionData;
}

/**
 * Middleware options
 */
export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
  sessionType?: SessionType;
  cookieName?: string;
  onUnauthorized?: (error: AuthError) => void;
}

/**
 * Authentication error
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  status: number;
}

/**
 * Authentication error codes
 */
export type AuthErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'SESSION_NOT_FOUND'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'INVALID_SIGNATURE'
  | 'OAUTH_ERROR'
  | 'SERVICE_ERROR';

/**
 * Generic result type for auth operations
 */
export interface AuthResult<T> {
  success: boolean;
  data?: T;
  error?: AuthError;
}

// ============================================
// Discord OAuth Types
// ============================================

/**
 * Discord OAuth configuration
 */
export interface DiscordOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * Discord user data from OAuth
 */
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  globalName?: string;
  avatar?: string;
  email?: string;
  verified?: boolean;
  flags?: number;
  premiumType?: number;
}

/**
 * Discord OAuth tokens
 */
export interface DiscordTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  scope: string;
}

/**
 * Discord OAuth verification result
 */
export interface DiscordVerifyResult {
  valid: boolean;
  user?: DiscordUser;
  tokens?: DiscordTokens;
  error?: string;
}

// ============================================
// Solana/Wallet Types
// ============================================

/**
 * Solana signature verification request
 */
export interface SolanaSignatureRequest {
  message: string;
  signature: string;
  publicKey: string;
}

/**
 * Solana signature verification result
 */
export interface SolanaVerifyResult {
  valid: boolean;
  publicKey?: string;
  error?: string;
}

/**
 * Solana sign-in message template
 */
export interface SolanaSignInMessage {
  domain: string;
  address: string;
  statement: string;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  requestId?: string;
  chainId?: string;
  resources?: string[];
}

// ============================================
// Service-to-Service Types
// ============================================

/**
 * Service token configuration
 */
export interface ServiceTokenConfig {
  secret: string;
  serviceId: string;
  allowedServices: string[];
  expiresIn: string;
}

/**
 * Service token payload
 */
export interface ServiceTokenPayload {
  serviceId: string;
  targetService: string;
  iat: number;
  exp: number;
  type: 'service';
  context?: Record<string, unknown>;
}

/**
 * Service token verification result
 */
export interface ServiceVerifyResult {
  valid: boolean;
  serviceId?: string;
  targetService?: string;
  context?: Record<string, unknown>;
  error?: string;
}

// ============================================
// Admin Session Types
// ============================================

/**
 * Admin session data
 */
export interface AdminSession {
  adminId: string;
  email: string;
  roles: string[];
  permissions: string[];
  createdAt: number;
  lastActivity: number;
}

/**
 * Admin authentication method
 */
export type AdminAuthMethod = 'magic_link' | 'admin_token';

/**
 * Magic link request
 */
export interface MagicLinkRequest {
  email: string;
  redirectUrl?: string;
}

/**
 * Magic link verification result
 */
export interface MagicLinkVerifyResult {
  valid: boolean;
  adminId?: string;
  email?: string;
  error?: string;
}

// ============================================
// Database Entity Types
// ============================================

/**
 * User record in the database
 */
export interface DBUser {
  id: string;
  discord_id: string | null;
  discord_username: string | null;
  discord_avatar: string | null;
  wallet_address: string | null;
  email: string | null;
  roles: string[];
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

/**
 * User creation payload
 */
export interface CreateUserPayload {
  discord_id?: string;
  discord_username?: string;
  discord_avatar?: string;
  wallet_address?: string;
  email?: string;
  roles?: string[];
}

/**
 * User update payload
 */
export interface UpdateUserPayload {
  discord_id?: string;
  discord_username?: string;
  discord_avatar?: string;
  wallet_address?: string;
  email?: string;
  roles?: string[];
  last_login_at?: Date;
}

/**
 * Admin record in the database
 */
export interface DBAdmin {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

/**
 * Magic link record
 */
export interface DBMagicLink {
  id: string;
  email: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

/**
 * Session record in the database
 */
export interface DBSession {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  ip_address: string | null;
  user_agent: string | null;
}

/**
 * Tip record in the database
 */
export interface DBTip {
  id: string;
  sender_id: string;
  recipient_discord_id: string;
  recipient_wallet: string | null;
  amount: string;
  currency: string;
  status: TipStatus;
  tx_signature: string | null;
  message: string | null;
  created_at: Date;
  completed_at: Date | null;
}

export type TipStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

/**
 * Create tip payload
 */
export interface CreateTipPayload {
  sender_id: string;
  recipient_discord_id: string;
  recipient_wallet?: string;
  amount: string;
  currency: string;
  message?: string;
}

/**
 * Casino record in the database
 */
export interface DBCasino {
  id: string;
  name: string;
  slug: string;
  domain: string;
  trust_score: number | null;
  grade: string | null;
  is_verified: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Casino grade record
 */
export interface DBCasinoGrade {
  id: string;
  casino_id: string;
  admin_id: string;
  grade: string;
  notes: string | null;
  created_at: Date;
}

// ============================================
// Query & Pagination Types
// ============================================

/**
 * Generic query result
 */
export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

/**
 * Single row result
 */
export interface SingleResult<T> {
  row: T | null;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ============================================
// Rate Limiting Types
// ============================================

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: unknown) => string;
}

// ============================================
// Event System Types
// ============================================

export type EventType =
  | 'tip.requested'
  | 'tip.initiated'
  | 'tip.pending'
  | 'tip.pending.resolved'
  | 'tip.sent'
  | 'tip.confirmed'
  | 'tip.completed'
  | 'tip.failed'
  | 'tip.expired'
  | 'tip.ready'
  | 'airdrop.requested'
  | 'airdrop.confirmed'
  | 'airdrop.completed'
  | 'airdrop.failed'
  | 'swap.requested'
  | 'swap.quote'
  | 'swap.completed'
  | 'swap.failed'
  | 'wallet.registered'
  | 'wallet.disconnected'
  | 'price.updated'
  | 'link.scanned'
  | 'link.flagged'
  | 'link.feedback'
  | 'promo.submitted'
  | 'promo.approved'
  | 'promo.denied'
  | 'bonus.logged'
  | 'bonus.nerfed'
  | 'bonus.claimed'
  | 'bonus.updated'
  | 'bonus.nerf.detected'
  | 'bonus.prediction.generated'
  | 'trust.casino.updated'
  | 'trust.domain.updated'
  | 'trust.degen.updated'
  | 'trust.domain.rollup'
  | 'trust.casino.rollup'
  | 'trust.state.requested'
  | 'trust.state.snapshot'
  | 'tilt.detected'
  | 'tilt.cooldown.requested'
  | 'cooldown.violated'
  | 'scam.reported'
  | 'accountability.success'
  | 'user.profile.updated'
  | 'survey.completed'
  | 'survey.profile.created'
  | 'survey.profile.updated'
  | 'survey.added'
  | 'survey.matched'
  | 'survey.result.recorded'
  | 'survey.withdrawal.requested'
  | 'game.started'
  | 'game.completed'
  | 'game.created'
  | 'game.player.joined'
  | 'game.player.left'
  | 'game.card.played'
  | 'game.round.ended'
  | 'vault.locked'
  | 'vault.unlocked'
  | 'vault.extended'
  | 'vault.expired'
  | 'vault.reload_due'
  | 'vault.auto_withdraw_requested'
  | 'transaction.created'
  | 'transaction.approved'
  | 'transaction.submitted'
  | 'transaction.confirmed'
  | 'transaction.failed'
  | 'fairness.pump.detected'
  | 'fairness.cluster.detected'
  | 'prize.created'
  | 'prize.distributed'
  | 'prize.failed'
  | 'credit.deposited'
  | 'credit.tip_sent'
  | 'credit.airdrop_sent'
  | 'credit.withdrawn'
  | 'credit.refunded'
  | 'credit.pending_tip_created'
  | 'code.detected'
  | 'telegram.message.received'
  | 'user.balance.depleted'
  | 'trivia.started'
  | 'trivia.round.start'
  | 'trivia.round.reveal'
  | 'trivia.completed'
  | 'trivia.player.reinstated'
  | 'dad.game.completed'
  | 'user.discord_linked'
  | 'safety.intervention.triggered'
  | 'trust.degen-intel.ingested'
  | 'trust.casino.metric.snapshot'
  | 'trust.casino.tos.changed'
  | 'trust.audit.trigger'
  | 'activity.launched'
  | 'activity.action'
  | 'activity.completed'
  | 'activity.paused'
  | 'activity.resumed'
  | 'activity.error'
  | 'activity.message';

/**
 * Event-specific data interfaces
 */


export interface DegenIntelIngestedEventData {
  source: string;
  reportExcerpt?: string;
  severity: number;
  communityUserId: string;
  trustLevel: TrustLevel;
  casinoName?: string; // Optional: targets a specific casino record if identified
}

export interface LinkFlaggedEventData {
  url: string;
  riskLevel: string; // Using string instead of RiskLevel temporarily for cross-service compatibility
  source?: string;
  userId?: string; // Standardized with other events
  actorId?: string;
  reason?: string;
  channelId?: string;
  guildId?: string;
}

export interface BonusNerfDetectedEventData {
  casinoName: string;
  percentDrop: number;
  bonusType?: string;
  reason?: string;
}

export interface CasinoRollupData {
  totalDelta: number;
  events: number;
  externalData?: {
    fairnessDelta?: number;
    payoutDelta?: number;
    bonusDelta?: number;
    complianceDelta?: number;
    supportDelta?: number;
  };
}

export interface TrustCasinoRollupEventData {
  casinos: Record<string, CasinoRollupData>;
  source: string;
}

export interface DomainRollupData {
  totalDelta: number;
  events: number;
  lastSeverity?: number;
}

export interface TrustDomainRollupEventData {
  domains: Record<string, DomainRollupData>;
}

export interface TipCompletedEventData {
  fromUserId: string;
  toUserId: string;
  amount: number;
  tipId?: string;
  currency?: string;
}

export interface GameResult {
  winners: {
    userId: string;
    username: string;
    hand: HandEvaluation; // HandEvaluationResult
    winnings: number;
  }[];
  pot: number;
  badBeat?: {
    loserId: string;
    loserHand: HandEvaluation; // HandEvaluationResult
    winnerHand: HandEvaluation; // HandEvaluationResult
    probability: number;
  };
}

export interface GameCompletedEventData {
  gameId: string;
  channelId: string;
  participants?: string[];
  result: GameResult;
  duration: number;
  type: 'dad' | 'poker';
  platform: 'web' | 'discord';
  playerIds: string[];
  winnerId?: string;
}

export interface TipFailedEventData {
  userId: string;
  amount: number;
  reason?: string;
}

export interface TiltDetectedEventData {
  userId: string;
  severity: number;
  reason: string;
  tiltScore: number;
  indicators?: string[];
  reportExcerpt?: string;
  messageCount?: number;
  channelId?: string;
  guildId?: string;
  sessionMetrics?: {
    pnl: number;
    currentStreak: { wins: number; losses: number };
    rtp: number;
    timeInSession: number;
  };
}

export interface CooldownViolatedEventData {
  userId: string;
  severity: number;
  violationCount: number;
  expiresAt?: number;
  channelId?: string;
  action?: string;
  newDuration?: number;
  guildId?: string;
}

export interface ScamReportedEventData {
  reporterId: string;
  accusedId: string;
  userId: string; // Accused User ID for standardization
  verified: boolean;
  falseReport: boolean;
  reason?: string;
  description?: string;
  channelId?: string;
  guildId?: string;
}

export interface AccountabilitySuccessEventData {
  userId: string;
  action: string;
}

export interface PromoSubmittedEventData {
  url: string;
}

export interface LinkFeedbackEventData {
  url: string;
  userReportedRisk: RiskLevel;
  actualStatus: 'safe' | 'malicious';
  comments?: string;
}

export interface DadGameCompletedEventData {
  gameId: string;
  winnerId?: string;
  finalScores: {
    userId: string;
    username: string;
    score: number;
  }[];
}

// ============================================
// Trivia Event Types
// ============================================

export interface TriviaGameSettings {
  startTime: number;
  category: string;
  theme: string;
  totalRounds: number;
  prizePool: number;
}

export interface TriviaQuestion {
    id: string;
    question: string;
    choices: string[];
    category: string;
    theme?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
}

export interface TriviaStartedEventData extends TriviaGameSettings {
  gameId: string;
}

export interface TriviaRoundStartEventData {
  question: TriviaQuestion;
  roundNumber: number;
  totalRounds: number;
  endsAt: number; // Timestamp
}

export interface TriviaRoundRevealEventData {
  questionId: string;
  correctChoice: string;
  explanation?: string;
  stats: Record<string, { count: number; correct: boolean }>; // choice -> { count, correct }
}

export interface TriviaWinner {
  userId: string;
  username: string;
  score: number;
  rank: number;
  prize?: number;
}

export interface TriviaCompletedEventData {
  gameId: string;
  winners: TriviaWinner[];
  finalScores: { userId: string; username: string; score: number }[];
}

export interface TriviaPlayerReinstatedEventData {
  gameId: string;
  userId: string;
  username: string;
}

export interface UserDiscordLinkedEventData {
  userId: string;
  discordId: string;
  username?: string;
}

export interface SafetyInterventionTriggeredEventData {
  userId: string;
  riskScore: number; // 0-100
  interventionLevel: 'CAUTION' | 'WARNING' | 'CRITICAL';
  action: 'OVERLAY_MESSAGE' | 'COOLDOWN_LOCK' | 'SELF_EXCLUDE_PROMPT' | 'PHONE_FRIEND' | 'PROFITS_VAULTED';
  displayText: string;
  telemetrySnapshot?: {
    balance: number;
    peak: number;
    velocity: number; // bets/min or similar
    sentiment: 'neutral' | 'positive_tilt' | 'chase' | 'crisis';
  };
  metadata?: Record<string, any>;
}

export interface VaultExpiredEventData {
  userId: string;
  id: string;
  address: string;
  amountSOL: number;
}

export interface VaultLockedEventData {
  userId: string;
  id: string;
  vaultType: 'disposable' | 'magic';
  vaultAddress: string;
  amountSOL: number;
  unlockAt: number;
}

export interface VaultReloadDueEventData {
  userId: string;
  amountRaw: string;
  interval: string;
}

export interface ActivityLaunchedEventData {
  activityId: string;
  userId: string;
  activityType: 'trivia' | 'poker' | 'slots' | 'blackjack';
  channelId: string;
  messageId: string;
}

export interface ActivityActionEventData {
  activityId: string;
  userId: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface ActivityCompletedEventData {
  activityId: string;
  userId: string;
  result?: Record<string, unknown>;
  duration: number;
}

export interface ActivityPausedEventData {
  activityId: string;
  userId: string;
}

export interface ActivityResumedEventData {
  activityId: string;
  userId: string;
}

export interface ActivityErrorEventData {
  activityId: string;
  userId: string;
  error: string;
  code?: string;
}

/**
 * Map event types to their data structures
 */
export interface EventDataMap {
  'promo.submitted': PromoSubmittedEventData;
  'link.feedback': LinkFeedbackEventData;
  'link.flagged': LinkFlaggedEventData;
  'bonus.nerf.detected': BonusNerfDetectedEventData;
  'trust.casino.rollup': TrustCasinoRollupEventData;
  'trust.domain.rollup': TrustDomainRollupEventData;
  'tip.completed': TipCompletedEventData;
  'game.completed': GameCompletedEventData;
  'dad.game.completed': DadGameCompletedEventData;
  'tip.failed': TipFailedEventData;
  'tilt.detected': TiltDetectedEventData;
  'cooldown.violated': CooldownViolatedEventData;
  'scam.reported': ScamReportedEventData;
  'accountability.success': AccountabilitySuccessEventData;
  'price.updated': PriceUpdateEvent;
  'trust.casino.updated': TrustCasinoUpdateEvent;
  'trust.degen.updated': TrustDegenUpdateEvent;
  'trust.domain.updated': TrustDomainUpdateEvent;
  'trivia.started': TriviaStartedEventData;
  'trivia.round.start': TriviaRoundStartEventData;
  'trivia.round.reveal': TriviaRoundRevealEventData;
  'trivia.completed': TriviaCompletedEventData;
  'trivia.player.reinstated': TriviaPlayerReinstatedEventData;
  'user.discord_linked': UserDiscordLinkedEventData;
  'safety.intervention.triggered': SafetyInterventionTriggeredEventData;
  'trust.degen-intel.ingested': DegenIntelIngestedEventData;
  'vault.expired': VaultExpiredEventData;
  'vault.locked': VaultLockedEventData;
  'vault.reload_due': VaultReloadDueEventData;
  'trust.casino.metric.snapshot': CasinoMetricSnapshot;
  'trust.casino.tos.changed': { casinoName: string; changeSummary?: string; contentHash: string };
  'trust.audit.trigger': { timestamp: number; reason: string };
  'rtp.report.submitted': RtpReportSubmittedEvent;
  'rtp.nerf.detected': RtpNerfDetectedEvent;
  'activity.launched': ActivityLaunchedEventData;
  'activity.action': ActivityActionEventData;
  'activity.completed': ActivityCompletedEventData;
  'activity.paused': ActivityPausedEventData;
  'activity.resumed': ActivityResumedEventData;
  'activity.error': ActivityErrorEventData;
  'fairness.pump.detected': GameplayAnomalyEvent;
  'fairness.cluster.detected': GameplayAnomalyEvent;
  'fairness.drift.detected': GameplayAnomalyEvent;
}

export interface TiltCheckEvent<K extends EventType> {
  id: string;
  type: K;
  timestamp: number;
  source: ModuleId;
  userId?: string;
  data: K extends keyof EventDataMap ? EventDataMap[K] : unknown;
  metadata?: Record<string, unknown>;
}

export type ModuleId =
  | 'tiltcheck'
  | 'tiltcheck-core'
  | 'suslink'
  | 'collectclock'
  | 'justthetip'
  | 'dad'
  | 'trust-engine-casino'
  | 'trust-engine-degen'
  | 'trust-rollup'
  | 'poker-module'
  | 'discord-bot'
  | 'lockvault'
  | 'game-arena'
  | 'wallet-service'
  | 'identity-core'
  | 'gameplay-analyzer'
  | 'linkguard'
  | 'test-suite'
  | 'telegram-code-ingest'
  | 'trust-engine-global'
  | 'trust-engine-api';


// ============================================
// User & Identity Types
// ============================================

export interface User {
  id: string; // Discord ID
  walletAddress?: string;
  createdAt: Date;
  updatedAt: Date;
  trustScore: number; // 0-100
  nftId?: string;
  notes?: string;
  /** Display name shown in UI (falls back to Discord username if not set) */
  displayName?: string;
  /** Avatar URL (CDN or Discord avatar URL) */
  avatar?: string;
}

export interface WalletMapping {
  discordId: string;
  walletAddress: string;
  provider: 'magic' | 'user-supplied';
  createdAt: Date;
}

// ============================================
// Trust Engine Types
// ============================================

/**
 * Trust levels for both users and casinos
 */
export type TrustLevel = 'very-high' | 'high' | 'neutral' | 'low' | 'high-risk';

/**
 * Detailed trust event for history tracking and auditing
 */
export interface TrustEvent {
  timestamp: number;
  delta: number;
  reason: string;
  category: string; // 'financial' | 'fairness' | 'promotional' | 'operational' | 'community' | 'degen'
  severity?: number; // 1-5 scaled impact
  source?: string; // emitter module id
  metadata?: Record<string, unknown>;
  id?: number | string;
  userId?: string;
  casinoName?: string;
}

/**
 * Pillar-based scoring for Casino Trust (The Five Pillars)
 * Weighted Total = (P1 * 0.40) + (P2 * 0.25) + (P3 * 0.15) + (P4 * 0.10) + (P5 * 0.10)
 */
export interface CasinoTrustPillars {
  financialPayouts: number;     // Pillar 1 (40%): Withdrawal speed/success, transparency, complaints
  fairnessTransparency: number;  // Pillar 2 (25%): RTP delta, Provably Fair, ToS volatility, providers
  promotionalHonesty: number;    // Pillar 3 (15%): Wagering, bonus clarity, silent nerfing
  operationalSupport: number;    // Pillar 4 (10%): Licensing, support speed, dispute resolution
  communityReputation: number;   // Pillar 5 (10%): Sentiment, forum rep, RG tools
}

/**
 * Full record for a casino's trust state
 */
export interface CasinoTrustRecord extends CasinoTrustPillars {
  score: number;
  history: TrustEvent[];
  lastUpdated: number;
}

/**
 * Historical snapshot of raw metrics for auditing (The "Proof")
 */
export interface CasinoMetricSnapshot {
  casinoName: string;
  timestamp: number;

  // Financial Pillar Raw Data
  avgWithdrawalHours?: number;
  withdrawalSuccessRate?: number; // 0.0 - 1.0

  // Fairness Pillar Raw Data
  advertisedRtp?: number;
  actualRtp?: number;
  rtpDelta?: number;
  sampleSize?: number;
  tosHash?: string;
  provablyFairUrl?: string;
  providerReputationTier?: 'reputable' | 'unknown' | 'shady';

  // Provider-level RTP tracking (differentiates same provider across platforms)
  providerName?: string; // e.g. 'Pragmatic Play', 'Hacksaw'
  gameTitle?: string;    // e.g. 'Gates of Olympus'

  // Operational Raw Data
  supportResponseTimeMinutes?: number;
  licenseVerified?: boolean;
}

/**
 * Community-submitted RTP report from the game info panel on a specific platform.
 * Players (or the extension) report the theoretical RTP they see in the slot UI.
 */
export interface RtpReportSubmittedEvent {
  /** The casino/platform domain where the RTP was observed (e.g. 'stake.com') */
  platformUrl: string;
  /** Human-readable platform name (e.g. 'Stake') */
  platformName: string;
  /** Game provider name (e.g. 'Pragmatic Play') */
  providerName: string;
  /** Slot/game title (e.g. 'Gates of Olympus') */
  gameTitle: string;
  /**
   * RTP percentage as reported in the game info panel (e.g. 96.5).
   * This is the theoretical value toggled by the operator, not the observed session value.
   */
  reportedRtp: number;
  /** Source of the report: 'extension' (scraped automatically) or 'community' (manual) */
  source: 'extension' | 'community';
  /** Discord user ID of the reporter, if available */
  reportedByUserId?: string;
  /** Unix epoch ms when the report was submitted */
  reportedAt: number;
}

/**
 * Emitted when a platform's RTP setting for a given provider/game drops below the
 * provider's known maximum RTP by more than the configured nerf threshold.
 *
 * This is the slot-math equivalent of the bonus nerf detected by CollectClock.
 */
export interface RtpNerfDetectedEvent {
  platformUrl: string;
  platformName: string;
  providerName: string;
  gameTitle: string;
  /** The provider's documented maximum (fairest) RTP setting */
  providerMaxRtp: number;
  /** The RTP currently configured on this platform */
  currentPlatformRtp: number;
  /** Absolute delta: providerMaxRtp - currentPlatformRtp (positive = nerfed) */
  nerfDelta: number;
  /** nerfDelta expressed as a fraction of providerMaxRtp (0-1) */
  nerfPercent: number;
  detectedAt: number;
}

/**
 * Unified per-provider, per-platform RTP performance record.
 *
 * This is the "Provider-Platform Performance Table" entry used by the
 * Casino Trust Engine to calculate discrepancy scores and flag nerfed platforms.
 *
 * - `advertisedRtp`       - The RTP reported in the game info panel on this platform
 * - `observedRtpAggregate`- Average actual return calculated from aggregated session events
 * - `discrepancyScore`    - advertisedRtp - observedRtpAggregate (positive = platform paying less than advertised)
 */
export interface ProviderPlatformPerformance {
  id?: string;
  providerName: string;
  gameTitle: string;
  platformUrl: string;
  platformName: string;
  /** RTP as shown in the game info panel on this platform (operator-toggled setting) */
  advertisedRtp: number;
  /** Aggregate observed return from community session data (null until sufficient sample) */
  observedRtpAggregate: number | null;
  /** advertisedRtp - observedRtpAggregate; null if observedRtpAggregate not yet available */
  discrepancyScore: number | null;
  /** Number of individual session data points feeding observedRtpAggregate */
  sampleSize: number;
  /** Number of community members who reported the advertisedRtp figure */
  reportedByCount: number;
  lastReportedAt: number;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Historical record of pillar scores over time
 */
export interface CasinoScoreHistory extends CasinoTrustPillars {
  casinoName: string;
  overallScore: number;
  timestamp: number;
}

/**
 * Track changes to Terms of Service
 */
export interface CasinoTosVersion {
  casinoName: string;
  contentHash: string;
  rawContentExcerpt?: string;
  changeSummary?: string;
  detectedAt: number;
}

/**
 * Full record for a degen's (community user) trust state
 */
export interface DegenTrustRecord {
  score: number;
  tiltIndicators: number; // Temporary drops for tilt
  behaviorScore: number;
  scamFlags: number;
  accountabilityBonus: number;
  communityReports: number;
  history: TrustEvent[];
  lastUpdated: number;
  recoveryScheduledAt?: number;
}

// Unified payload for trust.casino.updated events
export interface TrustCasinoUpdateEvent {
  casinoName: string;
  previousScore?: number;
  newScore?: number;
  severity?: number; // optional if event is a pure score update without severity context
  delta?: number; // newScore - previousScore (can be negative)
  reason: string;
  source: string; // 'collectclock' | 'trust-engine-casino' | other emitter
  metadata?: Record<string, unknown>;
}

// User/degen trust updates (non-casino scoped)
export interface TrustDegenUpdateEvent {
  userId: string;
  previousScore?: number;
  newScore?: number;
  delta?: number;
  severity?: number;
  level: TrustLevel;
  reason: string; // e.g. 'tip:sent', 'tip:received'
  source: string; // emitter module id e.g. 'justthetip'
  metadata?: Record<string, unknown>; // contextual details (tipId, amounts, etc.)
}

// Domain trust update events (LinkGuard / SusLink)
export type DomainRiskCategory = 'safe' | 'unknown' | 'suspicious' | 'unsafe' | 'malicious';

export interface TrustDomainUpdateEvent {
  domain: string; // raw domain canonicalized (lowercase, no subdomain unless significant)
  previousScore?: number; // 0-100 prior trust/risk score
  newScore?: number; // 0-100 updated score
  severity?: number; // scaled severity (1-5) derived from delta magnitude
  delta?: number; // newScore - previousScore (can be negative)
  category: DomainRiskCategory; // mapped risk category
  reason: string; // human readable summary e.g. 'risk:malicious' or 'override:safe'
  source: string; // expected: 'suslink' or 'linkguard'
  metadata?: Record<string, unknown>; // contextual details (actor, scan artifacts, redirect chain)
}

export interface TrustScore {
  score: number;
  level: TrustLevel;
  lastUpdated: Date;
  explanation?: string;
}

// ============================================
// Financial Types (JustTheTip)
// ============================================

export interface TipRequest {
  fromUser: string;
  toUser: string;
  amount: number;
  token: string;
}

export interface TipResult {
  success: boolean;
  fee: number;
  txSignature?: string;
  error?: string;
}

export interface SwapRequest {
  userId: string;
  fromToken: string; // Mint address or symbol
  toToken: string;   // Mint address or symbol
  amount: number;    // Input token amount (natural units simplified)
}

export interface SwapQuote {
  userId: string;
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  estimatedOutputAmount: number;
  rate: number; // output per input
  slippageBps: number;
  generatedAt: number;
  routePlan?: unknown; // Placeholder for Jupiter route plan structure
  // Hardened fields
  minOutputAmount: number; // After slippage
  platformFeeBps: number;
  networkFeeLamports: number;
  finalOutputAfterFees: number; // minOutput - fees
}

export interface SwapExecution {
  quote: SwapQuote;
  txId: string;
  status: 'pending' | 'completed' | 'failed';
  completedAt?: number;
}

export interface PriceUpdateEvent {
  token: string;
  oldPrice?: number;
  newPrice: number;
  updatedAt: number;
  stale?: boolean;
}

export const FLAT_FEE = 0.07; // USD equivalent

// ============================================
// Link Scanning Types (SusLink)
// ============================================

export type RiskLevel = 'safe' | 'suspicious' | 'high' | 'critical';

export interface LinkScanResult {
  url: string;
  riskLevel: RiskLevel;
  redirectChain?: string[];
  domainAgeDays?: number;
  reason: string;
  scannedAt: Date;
}

// ============================================
// Bonus Types (CollectClock)
// ============================================

export interface Bonus {
  id: number;
  casinoName: string;
  userId: string;
  amount: number;
  timestamp: Date;
  nerfed: boolean;
  notes?: string;
}

export interface BonusPrediction {
  casinoName: string;
  predictedTimestamp: Date;
  confidence: number; // 0-1
  createdAt: Date;
}

export interface BonusClaimEvent {
  casinoName: string;
  userId: string;
  amount: number;
  claimedAt: number;
  nextEligibleAt: number;
}

export interface BonusUpdateEvent {
  casinoName: string;
  oldAmount?: number;
  newAmount: number;
  updatedAt: number;
}

export interface BonusNerfDetectedEvent {
  casinoName: string;
  previousAmount: number;
  newAmount: number;
  delta: number; // negative change
  percentDrop: number; // 0-1
  detectedAt: number;
}

export interface BonusPredictionGeneratedEvent {
  casinoName: string;
  predictedAmount: number;
  confidence: number;
  basisSampleSize: number;
  generatedAt: number;
  volatility?: number; // standard deviation of window
  volatilityScore?: number; // normalized 0-1 (higher = more volatile)
}



// ============================================
// Tilt Detection Types
// ============================================

export interface TiltSignal {
  userId: string;
  signalType: 'speed' | 'rage' | 'loan-request' | 'aggressive-chat';
  severity: number; // 1-5
  createdAt: Date;
}

export interface Cooldown {
  userId: string;
  reason: string;
  startedAt: Date;
  endsAt: Date;
}

// ============================================
// Gameplay & Fairness Types
// ============================================

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // 2-14 (Ace high)
}

export type HandRank =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

export interface HandEvaluation {
  rank: HandRank;
  value: number; // For comparison
  cards: Card[]; // Best 5-card hand
  description: string;
}

export interface GameplayAnomalyEvent {
  userId: string;
  casinoId: string;
  anomalyType: 'pump' | 'win_clustering' | 'rtp_drift';
  severity: 'warning' | 'critical';
  confidence: number; // 0-1
  metadata: Record<string, unknown>;
  reason: string;
  timestamp: number;
}

// ============================================
// API Response Types
// ============================================

export interface APIResponse<T = unknown> {
  status: 'ok' | 'error';
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// Discord Types
// ============================================

export interface DiscordCommand {
  name: string;
  userId: string;
  guildId?: string;
  channelId: string;
  options?: Record<string, unknown>;
  timestamp: Date;
}

// ============================================
// Event Handler Types
// ============================================

export type EventHandler<T extends EventType> = (event: TiltCheckEvent<T>) => Promise<void> | void;

export interface EventSubscription<T extends EventType> {
  eventType: T;
  handler: EventHandler<T>;
  moduleId: ModuleId;
}

// ============================================
// Branded Primitive Types
// ============================================

/**
 * Branded string type for wallet addresses (Solana base58 or EVM hex).
 * Prevents accidental assignment of arbitrary strings in wallet-sensitive code.
 *
 * @example
 * const addr = '4Nd1m...' as WalletAddress;
 * function transfer(to: WalletAddress) { ... }
 */
export type WalletAddress = string & { readonly __brand: 'WalletAddress' };

/**
 * Helper to cast a raw string to WalletAddress.
 * Use at trust boundaries (e.g. after on-chain validation or user input parsing).
 */
export function toWalletAddress(raw: string): WalletAddress {
  return raw as WalletAddress;
}

// ============================================
// Domain Session Type
// ============================================

/**
 * Application-level session (not the DB row, not the JWT payload).
 * Used by session-store consumers and cross-package session passing.
 *
 * - `id`        - Unique session identifier (UUID)
 * - `userId`    - The owner's user ID
 * - `createdAt` - When the session was created
 * - `expiresAt` - When the session expires
 * - `data`      - Arbitrary session metadata (e.g. nonce, csrf, preferences)
 */
export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  data?: Record<string, unknown>;
}

// ============================================
// Price / Oracle Types
// ============================================

/**
 * A single price observation for a token at a point in time.
 * Distinct from PriceUpdateEvent (which is an event-bus message);
 * PricePoint is a plain data snapshot suitable for caching, storage, and charting.
 *
 * - `symbol`    - Token symbol (e.g. 'SOL', 'BONK', 'USDC')
 * - `price`     - USD price as a number
 * - `timestamp` - Unix epoch milliseconds when the price was observed
 * - `source`    - Optional data source identifier (e.g. 'jupiter', 'coingecko')
 */
export interface PricePoint {
  symbol: string;
  price: number;
  timestamp: number;
  source?: string;
}

// ============================================
// Generic Event Payload Wrapper
// ============================================

/**
 * Lightweight generic envelope for event payloads.
 * Useful for transport layers, webhooks, and non-TiltCheckEvent contexts
 * where the full TiltCheckEvent structure is unnecessary.
 *
 * @template T - The payload type
 *
 * @example
 * const msg: EventPayload<PricePoint> = {
 *   event: 'price.updated',
 *   payload: { symbol: 'SOL', price: 142.5, timestamp: Date.now() },
 *   timestamp: Date.now(),
 * };
 */
export interface EventPayload<T> {
  /** Event name / discriminator (e.g. 'price.updated', 'user.created') */
  event: string;
  /** The event data */
  payload: T;
  /** Unix epoch milliseconds when the payload was produced */
  timestamp: number;
}

// ============================================
// UI & Extension Types
// ============================================

/**
 * User onboarding state for the extension or dashboard.
 */
export interface OnboardingStatus {
  userId: string;
  onboardingCompleted: boolean;
  tutorialCompleted: boolean;
  lastStepCompleted?: number;
  riskLevel?: 'conservative' | 'moderate' | 'degen';
  quizResults?: Record<string, string | number | boolean>;
  updatedAt: number;
}

export interface RiskQuizQuestion {
  id: string;
  text: string;
  options: {
    label: string;
    value: string | number;
    riskWeight: number; // -1 to 1 (conservative to degen)
  }[];
}

/**
 * Represents a predicted window for a social media drop (Insta, Twitter, etc).
 */
export interface DropPredictionWindow {
  id: string;
  source: 'instagram' | 'x' | 'telegram';
  label: string;
  estimatedAt: number;
  confidence: number;
}

