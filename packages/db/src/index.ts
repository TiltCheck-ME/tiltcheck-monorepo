/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * @tiltcheck/db
 * 
 * Neon PostgreSQL database client for the TiltCheck ecosystem.
 * Provides typed queries and helpers for all database operations.
 * 
 * @example
 * ```typescript
 * import { getClient, query, findUserByDiscordId } from '@tiltcheck/db';
 * 
 * // Raw query
 * const users = await query('SELECT * FROM users WHERE created_at > $1', [date]);
 * 
 * // Typed query helpers
 * const user = await findUserByDiscordId('123456789');
 * ```
 */

// Client exports
export {
  getClient,
  createClient,
  resetClient,
  getDBConfig,
  query,
  queryOne,
  insert,
  update,
  deleteRow,
  findById,
  findBy,
  findOneBy,
  exists,
  count,
  type DBClientConfig,
} from './client.js';

// Query helpers
export {
  // User queries
  findUserById,
  findUserByDiscordId,
  findUserByWallet,
  findUserByEmail,
  createUser,
  updateUser,
  findOrCreateUserByDiscord,
  linkWalletToUser,

  // Onboarding queries
  findOnboardingByDiscordId,
  upsertOnboarding,

  // Admin queries
  findAdminById,
  findAdminByEmail,
  isAdminEmail,

  // Magic link queries
  createMagicLink,
  findValidMagicLink,
  markMagicLinkUsed,

  // Session queries
  createSession,
  findValidSession,
  deleteSession,
  deleteUserSessions,

  // Tip queries
  createTip,
  findTipById,
  updateTipStatus,
  getTipsBySender,
  getTipsByRecipient,

  // Casino queries
  findCasinoById,
  findCasinoBySlug,
  findCasinoByDomain,
  getCasinos,
  addCasinoGrade,

  // Partner & Webhook queries
  findPartnerByAppId,
  findPartnerById,
  createPartner,
  createWebhook,
  findActiveWebhooksByEvent,
  logWebhookDelivery,

  // Identity & Trust queries
  getAggregatedTrustByDiscordId,
  logTrustSignal,

  // Buddy queries
  sendBuddyRequest,
  acceptBuddyRequest,
  getUserBuddies,
  getAccountabilityPartners,
  getPendingBuddyRequests,
  updateBuddyThresholds,
  removeBuddy,

  // Blog queries
  getBlogPosts,
  getBlogPostBySlug,
  createBlogPost,
  getLatestBlogPost,

  // Audit log queries
  createAuditLog,
  getAuditLogsByUser,

  // Surgical Self-Exclusion queries
  getUserExclusions,
  addExclusion,
  removeExclusion,
  clearExclusions,
  checkGameExcluded,
  buildForbiddenGamesProfile,
} from './queries.js';

// Type exports
export type {
  User,
  CreateUserPayload,
  UpdateUserPayload,
  Admin,
  MagicLink,
  Session,
  Tip,
  TipStatus,
  CreateTipPayload,
  Casino,
  CasinoGrade,
  QueryResult,
  SingleResult,
  PaginationParams,
  PaginatedResult,
  UserOnboarding,
  UpsertOnboardingPayload,

  // Partner & Webhook types
  Partner,
  Webhook,
  WebhookDelivery,
  CreatePartnerPayload,
  CreateWebhookPayload,

  // Identity & Trust types
  TrustSignal,
  UserTrustSummary,
  CreateTrustSignalPayload,

  // Buddy types
  UserBuddy,
  CreateBuddyPayload,
  UpdateBuddyPayload,
  BuddyAlertThresholds,

  // Blog types
  BlogPost,
  CreateBlogPostPayload,

  // Surgical Self-Exclusion types
  GameExclusion,
  CreateGameExclusionPayload,
  ForbiddenGamesProfile,
  GameCategory,
} from './types.js';
