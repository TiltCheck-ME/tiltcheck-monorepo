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
  daily_limit: number | null;
  quiz_scores: string | null;
  tutorial_completed: boolean;
  notifications_tips: boolean;
  notifications_trivia: boolean;
  notifications_promos: boolean;
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
  daily_limit?: number | null;
  quiz_scores?: string | null;
  tutorial_completed?: boolean;
  notifications_tips?: boolean;
  notifications_trivia?: boolean;
  notifications_promos?: boolean;
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

