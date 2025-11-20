/**
 * TiltCheck Shared Types
 * Core type definitions used across the ecosystem
 */

// ============================================
// Event System Types
// ============================================

export type EventType =
  | 'tip.requested'
  | 'tip.initiated'
  | 'tip.pending.resolved'
  | 'tip.completed'
  | 'tip.failed'
  | 'airdrop.requested'
  | 'airdrop.completed'
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
  | 'survey.matched'
  | 'game.started'
  | 'game.completed';

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
  | 'suslink'
  | 'collectclock'
  | 'freespinscan'
  | 'justthetip'
  | 'pricing-oracle'
  | 'trust-engine-casino'
  | 'trust-engine-degen'
  | 'trust-rollup'
  | 'poker-module'
  | 'discord-bot';

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
