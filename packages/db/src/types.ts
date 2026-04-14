/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * @tiltcheck/db - Type Definitions
 * Database types for the TiltCheck ecosystem
 */

// ============================================================================
// User Types
// ============================================================================

/**
 * User record in the database
 */
export interface User {
  id: string;
  discord_id: string | null;
  discord_username: string | null;
  discord_avatar: string | null;
  wallet_address: string | null;
  email: string | null;
  hashed_password: string | null;
  roles: string[];
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  redeem_threshold: number | null;
  redeem_wins: number;
  total_redeemed: number;
  tier: 'free' | 'elite' | string;
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
  hashed_password?: string;
  roles?: string[];
  tier?: 'free' | 'elite' | string;
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
  hashed_password?: string;
  roles?: string[];
  last_login_at?: Date;
  redeem_threshold?: number | null;
  redeem_wins?: number;
  total_redeemed?: number;
  updated_at?: Date;
  tier?: 'free' | 'elite' | string;
}

// ============================================================================
// Admin Types
// ============================================================================

/**
 * Admin record in the database
 */
export interface Admin {
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
export interface MagicLink {
  id: string;
  email: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
  last_attempt_at: Date;
}

// ============================================================================
// Identity & Trust Types
// ============================================================================

/**
 * Trust signal cross-referenced by origin (e.g. Discord Server, Partner App)
 */
export interface TrustSignal {
  id: string;
  user_id: string;
  discord_id: string;
  origin_id: string;
  origin_type: 'discord_guild' | 'partner_app' | 'manual';
  signal_type: string;
  delta: number;
  metadata: Record<string, unknown>;
  created_at: Date;
}

/**
 * Summary of user trust across all origins
 */
export interface UserTrustSummary {
  discord_id: string;
  total_score: number;
  signals_count: number;
  origins_count: number;
  top_risk_factors: string[];
  last_activity: Date | null;
}

/**
 * Create trust signal payload
 */
export interface CreateTrustSignalPayload {
  user_id: string;
  discord_id: string;
  origin_id: string;
  origin_type: 'discord_guild' | 'partner_app' | 'manual';
  signal_type: string;
  delta: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Recovery Application Types
// ============================================================================

export type RecoveryApplicationStatus =
  | 'pending_support'
  | 'under_review'
  | 'approved'
  | 'paid'
  | 'rejected'
  | 'cancelled';

export interface RecoveryApplication {
  id: string;
  discord_user_id: string;
  discord_username: string;
  hardship: string;
  steps: string;
  support_contact: string;
  support_discord_id: string | null;
  support_confirmed: boolean;
  review_message_id: string | null;
  review_channel_id: string | null;
  community_votes: number;
  status: RecoveryApplicationStatus;
  rejection_reason: string | null;
  approved_by: string | null;
  applied_at: Date;
  updated_at: Date;
}

export interface CreateRecoveryApplicationPayload {
  id: string;
  discord_user_id: string;
  discord_username: string;
  hardship: string;
  steps: string;
  support_contact: string;
  support_discord_id?: string | null;
  support_confirmed: boolean;
  review_message_id?: string | null;
  review_channel_id?: string | null;
  community_votes?: number;
  status: RecoveryApplicationStatus;
  rejection_reason?: string | null;
  approved_by?: string | null;
}

export interface UpdateRecoveryApplicationPayload {
  discord_username?: string;
  hardship?: string;
  steps?: string;
  support_contact?: string;
  support_discord_id?: string | null;
  support_confirmed?: boolean;
  review_message_id?: string | null;
  review_channel_id?: string | null;
  community_votes?: number;
  status?: RecoveryApplicationStatus;
  rejection_reason?: string | null;
  approved_by?: string | null;
  updated_at?: Date;
}

// ============================================================================
// Beta Access Types
// ============================================================================

export type BetaApplicationPath = 'discord' | 'site';

export type BetaContactMethod = 'discord' | 'email';

export type BetaSignupStatus = 'pending' | 'approved' | 'rejected' | 'waitlisted';

export interface BetaEntitlements {
  beta_access_web: boolean;
  beta_access_dashboard: boolean;
  beta_access_extension: boolean;
  beta_access_discord: boolean;
  beta_access_community: boolean;
}

export interface BetaSignup extends BetaEntitlements {
  id: string;
  user_id: string | null;
  email: string;
  application_path: BetaApplicationPath;
  contact_method: BetaContactMethod;
  status: BetaSignupStatus;
  discord_id: string | null;
  discord_username: string | null;
  notification_email: string | null;
  notification_discord_id: string | null;
  interests: string[] | null;
  experience_level: string | null;
  feedback_preference: string | null;
  referral_source: string | null;
  reviewer_notes: string | null;
  review_message_id: string | null;
  review_channel_id: string | null;
  approved_at: Date | null;
  rejected_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBetaSignupPayload extends Partial<BetaEntitlements> {
  user_id?: string | null;
  email: string;
  application_path: BetaApplicationPath;
  contact_method: BetaContactMethod;
  status?: BetaSignupStatus;
  discord_id?: string | null;
  discord_username?: string | null;
  notification_email?: string | null;
  notification_discord_id?: string | null;
  interests?: string[] | null;
  experience_level?: string | null;
  feedback_preference?: string | null;
  referral_source?: string | null;
  reviewer_notes?: string | null;
  review_message_id?: string | null;
  review_channel_id?: string | null;
  approved_at?: Date | null;
  rejected_at?: Date | null;
}

export interface UpdateBetaSignupPayload extends Partial<CreateBetaSignupPayload> {
  updated_at?: Date;
}

// ============================================================================
// Buddy & Accountability Types
// ============================================================================

/**
 * Buddy alert thresholds
 */
export interface BuddyAlertThresholds {
  tilt_score_exceeds?: number;
  losses_in_24h_sol?: number;
  zero_balance_reached?: boolean;
}

/**
 * Buddy relationship in the database
 */
export interface UserBuddy {
  id: string;
  user_id: string;
  buddy_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'removed';
  alert_thresholds: BuddyAlertThresholds;
  created_at: Date;
  updated_at: Date;
}

/**
 * Buddy creation payload
 */
export interface CreateBuddyPayload {
  user_id: string;
  buddy_id: string;
  alert_thresholds?: BuddyAlertThresholds;
}

/**
 * Buddy update payload
 */
export interface UpdateBuddyPayload {
  status?: UserBuddy['status'];
  alert_thresholds?: BuddyAlertThresholds;
  updated_at?: Date;
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * Session record in the database
 */
export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  ip_address: string | null;
  user_agent: string | null;
}

// ============================================================================
// Tip Types (JustTheTip)
// ============================================================================

/**
 * Tip record in the database
 */
export interface Tip {
  id: string;
  sender_id: string;
  recipient_discord_id: string;
  recipient_wallet: string | null;
  amount: string; // Stored as string for precision
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

// ============================================================================
// Casino Types
// ============================================================================

/**
 * Casino record in the database
 */
export interface Casino {
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
export interface CasinoGrade {
  id: string;
  casino_id: string;
  admin_id: string;
  grade: string;
  notes: string | null;
  created_at: Date;
}

// ============================================================================
// Audit Log Types
// ============================================================================

/**
 * Audit log record in the database
 */
export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: Date;
}

/**
 * Create audit log payload
 */
export interface CreateAuditLogPayload {
  admin_id: string;
  action: string;
  target_type: string;
  target_id?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
}

// ============================================================================
// Onboarding Types
// ============================================================================

/**
 * User onboarding record
 */
export interface UserOnboarding {
  discord_id: string;
  is_onboarded: boolean;
  has_accepted_terms: boolean;
  risk_level: 'conservative' | 'moderate' | 'degen';
  cooldown_enabled: boolean;
  voice_intervention_enabled: boolean;
  share_message_contents: boolean;
  share_financial_data: boolean;
  share_session_telemetry: boolean;
  notify_nft_identity_ready: boolean;
  daily_limit: number | null;
  quiz_scores: string | null;
  tutorial_completed: boolean;
  notifications_tips: boolean;
  notifications_trivia: boolean;
  notifications_promos: boolean;
  redeem_threshold: number | null;
  redeem_wins: number;
  total_redeemed: number;
  compliance_bypass: boolean;
  joined_at: Date;
  updated_at: Date;
}

/**
 * Onboarding update payload
 */
export interface UpsertOnboardingPayload {
  discord_id: string;
  is_onboarded?: boolean;
  has_accepted_terms?: boolean;
  risk_level?: 'conservative' | 'moderate' | 'degen';
  cooldown_enabled?: boolean;
  voice_intervention_enabled?: boolean;
  share_message_contents?: boolean;
  share_financial_data?: boolean;
  share_session_telemetry?: boolean;
  notify_nft_identity_ready?: boolean;
  daily_limit?: number | null;
  quiz_scores?: string | null;
  tutorial_completed?: boolean;
  notifications_tips?: boolean;
  notifications_trivia?: boolean;
  notifications_promos?: boolean;
  redeem_threshold?: number | null;
  redeem_wins?: number;
  total_redeemed?: number;
  compliance_bypass?: boolean;
}

// ============================================================================
// Partner & Webhook Types
// ============================================================================

/**
 * Partner record for API access
 */
export interface Partner {
  id: string;
  name: string;
  website_url: string | null;
  app_id: string;
  secret_key: string; // Used for HMAC signatures
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Webhook registration for a partner
 */
export interface Webhook {
  id: string;
  partner_id: string;
  target_url: string;
  events: string[]; // e.g. ["tilt.detected", "link.flagged"]
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Log of webhook deliveries
 */
export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  duration_ms: number;
  attempt_count: number;
  last_attempt_at: Date;
  created_at: Date;
}

/**
 * Create partner payload
 */
export interface CreatePartnerPayload {
  name: string;
  website_url?: string;
  app_id: string;
  secret_key: string;
}

/**
 * Create webhook payload
 */
export interface CreateWebhookPayload {
  partner_id: string;
  target_url: string;
  events: string[];
}

// ============================================================================
// Identity & Trust Types
// ============================================================================

/**
 * Trust signal cross-referenced by origin (e.g. Discord Server, Partner App)
 */
export interface TrustSignal {
  id: string;
  user_id: string;
  discord_id: string;
  origin_id: string;
  origin_type: 'discord_guild' | 'partner_app' | 'manual';
  signal_type: string;
  delta: number;
  metadata: Record<string, unknown>;
  created_at: Date;
}

/**
 * Summary of user trust across all origins
 */
export interface UserTrustSummary {
  discord_id: string;
  total_score: number;
  signals_count: number;
  origins_count: number;
  top_risk_factors: string[];
  last_activity: Date | null;
}

/**
 * Create trust signal payload
 */
export interface CreateTrustSignalPayload {
  user_id: string;
  discord_id: string;
  origin_id: string;
  origin_type: 'discord_guild' | 'partner_app' | 'manual';
  signal_type: string;
  delta: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Query Result Types
// ============================================================================

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

// ============================================================================
// Blog Types
// ============================================================================

/**
 * Blog post record in the database
 */
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  author: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[] | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create blog post payload
 */
export interface CreateBlogPostPayload {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  author?: string;
  status?: 'draft' | 'published' | 'archived';
  tags?: string[];
}

// ============================================================================
// Auto-Vault Rule Types
// ============================================================================

export type VaultRuleType =
  | 'percent_of_win'
  | 'fixed_per_threshold'
  | 'balance_ceiling'
  | 'session_profit_lock';

export type VaultRuleCasinoTarget =
  | 'all'
  | 'stake'
  | 'roobet'
  | 'bcgame'
  | 'rollbit'
  | 'gamdom'
  | 'shuffle';

export interface VaultRule {
  id: string;
  user_id: string;
  type: VaultRuleType;
  enabled: boolean;
  casino: VaultRuleCasinoTarget;
  percent?: number | null;
  fixed_amount?: number | null;
  threshold_amount?: number | null;
  ceiling_amount?: number | null;
  profit_target?: number | null;
  min_win_amount?: number | null;
  cooldown_ms?: number | null;
  label?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateVaultRulePayload {
  user_id: string;
  type: VaultRuleType;
  casino?: VaultRuleCasinoTarget;
  percent?: number;
  fixed_amount?: number;
  threshold_amount?: number;
  ceiling_amount?: number;
  profit_target?: number;
  min_win_amount?: number;
  cooldown_ms?: number;
  label?: string;
}

export interface UpdateVaultRulePayload {
  type?: VaultRuleType;
  casino?: VaultRuleCasinoTarget;
  enabled?: boolean;
  percent?: number | null;
  fixed_amount?: number | null;
  threshold_amount?: number | null;
  ceiling_amount?: number | null;
  profit_target?: number | null;
  min_win_amount?: number | null;
  cooldown_ms?: number | null;
  label?: string | null;
}



export type GameCategory =
  | 'chicken_mines'
  | 'bonus_buy'
  | 'live_dealer'
  | 'slots'
  | 'crash'
  | 'table_games';

export interface GameExclusion {
  id: string;
  userId: string;
  gameId?: string | null;
  category?: GameCategory | null;
  reason?: string | null;
  createdAt: Date;
}

export interface CreateGameExclusionPayload {
  userId: string;
  gameId?: string | null;
  category?: GameCategory | null;
  reason?: string | null;
}

export interface ForbiddenGamesProfile {
  userId: string;
  blockedGameIds: string[];
  blockedCategories: GameCategory[];
  exclusions: GameExclusion[];
  updatedAt: string;
}

