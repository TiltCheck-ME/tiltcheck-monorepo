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
  | 'credit.pending_tip_created';

export interface TiltCheckEvent<T = any> {
  id: string;
  type: EventType;
  timestamp: number;
  source: ModuleId;
  userId?: string;
  data: T;
  metadata?: Record<string, any>;
}

export type ModuleId =
  | 'tiltcheck'
  | 'tiltcheck-core'
  | 'suslink'
  | 'collectclock'
  | 'freespinscan'
  | 'justthetip'
  | 'qualifyfirst'
  | 'dad'
  | 'pricing-oracle'
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
  | 'test-suite';

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

export interface TrustEvent {
  id: number;
  userId?: string;
  casinoName?: string; // canonical casino identifier
  eventType: string;
  delta?: number; // For degen trust adjustments
  severity?: number; // 1-5 scaled impact severity (nerfs, risk events)
  previousScore?: number; // prior casino score when applicable
  newScore?: number; // new casino score when applicable
  reason: string; // human readable summary
  source: string; // emitter module id
  details?: string;
  createdAt: Date;
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
  metadata?: Record<string, any>;
}

// User/degen trust updates (non-casino scoped)
export interface TrustDegenUpdateEvent {
  userId: string;
  previousScore?: number;
  newScore?: number;
  delta?: number;
  severity?: number;
  reason: string; // e.g. 'tip:sent', 'tip:received'
  source: string; // emitter module id e.g. 'justthetip'
  metadata?: Record<string, any>; // contextual details (tipId, amounts, etc.)
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
  metadata?: Record<string, any>; // contextual details (actor, scan artifacts, redirect chain)
}

export interface TrustScore {
  score: number;
  level: 'very-high' | 'high' | 'neutral' | 'low' | 'high-risk';
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
  routePlan?: any; // Placeholder for Jupiter route plan structure
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
// Promo Types (FreeSpinScan)
// ============================================

export interface PromoSubmission {
  id: number;
  url: string;
  userId: string;
  casinoName: string;
  bonusType: string;
  notes?: string;
  suslinkScore?: number;
  status: 'pending' | 'approved' | 'denied';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
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

export interface GameplayAnomalyEvent {
  userId: string;
  casinoId: string;
  anomalyType: 'pump' | 'win_clustering' | 'rtp_drift';
  severity: 'warning' | 'critical';
  confidence: number; // 0-1
  metadata: Record<string, any>;
  reason: string;
  timestamp: number;
}

// ============================================
// API Response Types
// ============================================

export interface APIResponse<T = any> {
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
  options?: Record<string, any>;
  timestamp: Date;
}

// ============================================
// Event Handler Types
// ============================================

export type EventHandler<T = any> = (event: TiltCheckEvent<T>) => Promise<void> | void;

export interface EventSubscription {
  eventType: EventType;
  handler: EventHandler;
  moduleId: ModuleId;
}
