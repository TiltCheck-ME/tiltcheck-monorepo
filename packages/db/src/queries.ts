/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * @tiltcheck/db - Query Helpers
 * Typed query functions for common database operations
 */

import { query, queryOne, insert, update, findById, findOneBy, exists } from './client.js';
import type {
  User,
  CreateUserPayload,
  UpdateUserPayload,
  Admin,
  MagicLink,
  Session,
  Tip,
  CreateTipPayload,
  Casino,
  CasinoGrade,
  AuditLog,
  CreateAuditLogPayload,
  PaginationParams,
  PaginatedResult,
  UserOnboarding,
  UpsertOnboardingPayload,
  Partner,
  CreatePartnerPayload,
  Webhook,
  CreateWebhookPayload,
  WebhookDelivery,
  TrustSignal,
  UserTrustSummary,
  CreateTrustSignalPayload,
  RecoveryApplication,
  CreateRecoveryApplicationPayload,
  UpdateRecoveryApplicationPayload,
  RecoveryApplicationStatus,
  BlogPost,
  CreateBlogPostPayload,
  UserBuddy,
  BuddyAlertThresholds,
  GameExclusion,
  CreateGameExclusionPayload,
  ForbiddenGamesProfile,
  GameCategory,
  VaultRule,
  CreateVaultRulePayload,
  UpdateVaultRulePayload,
} from './types.js';

/**
 * Validates sorting parameters to prevent SQL injection
 */
function validateSort(
  column: string,
  allowedColumns: string[],
  direction: string = 'desc'
): { orderBy: string; orderDir: 'ASC' | 'DESC' } {
  const orderBy = allowedColumns.includes(column) ? column : allowedColumns[0];
  const orderDir = direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return { orderBy, orderDir };
}

// ============================================================================
// Blog Queries
// ============================================================================

/**
 * Get all published blog posts with pagination
 */
export async function getBlogPosts(
  pagination?: PaginationParams
): Promise<PaginatedResult<BlogPost>> {
  const { limit = 10, offset = 0 } = pagination || {};
  const { orderBy, orderDir } = validateSort(
    pagination?.orderBy || 'created_at',
    ['created_at', 'title', 'status'],
    pagination?.orderDir
  );

  const sql = `
    SELECT * FROM blog_posts 
    WHERE status = 'published'
    ORDER BY ${orderBy} ${orderDir}
    LIMIT $1 OFFSET $2
  `;

  const countSql = "SELECT COUNT(*) as count FROM blog_posts WHERE status = 'published'";

  const [rows, countResult] = await Promise.all([
    query<BlogPost>(sql, [limit, offset]),
    queryOne<{ count: string }>(countSql),
  ]);

  const total = parseInt(countResult?.count ?? '0', 10);

  return {
    rows,
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  };
}

/**
 * Get a single blog post by slug
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  return findOneBy<BlogPost>('blog_posts', 'slug', slug);
}

/**
 * Create a new blog post
 */
export async function createBlogPost(payload: CreateBlogPostPayload): Promise<BlogPost | null> {
  return insert<BlogPost>('blog_posts', {
    ...payload,
    author: payload.author || 'TiltCheck AI',
    status: payload.status || 'published',
    created_at: new Date(),
    updated_at: new Date(),
  });
}

/**
 * Get the most recent blog post
 */
export async function getLatestBlogPost(): Promise<BlogPost | null> {
  const sql = "SELECT * FROM blog_posts ORDER BY created_at DESC LIMIT 1";
  return queryOne<BlogPost>(sql);
}


// ============================================================================
// User Queries
// ============================================================================

/**
 * Find user onboarding by Discord ID
 */
export async function findOnboardingByDiscordId(discordId: string): Promise<UserOnboarding | null> {
  return findOneBy<UserOnboarding>('user_onboarding', 'discord_id', discordId);
}

/**
 * Upsert user onboarding
 */
export async function upsertOnboarding(payload: UpsertOnboardingPayload): Promise<UserOnboarding | null> {
  const sql = `
    INSERT INTO user_onboarding (
      discord_id, is_onboarded, has_accepted_terms, risk_level, 
      cooldown_enabled, voice_intervention_enabled, share_message_contents, share_financial_data,
      share_session_telemetry, notify_nft_identity_ready, daily_limit, redeem_threshold, quiz_scores, tutorial_completed,
      notifications_tips, notifications_trivia, notifications_promos, compliance_bypass, updated_at
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
    ON CONFLICT (discord_id) DO UPDATE SET
      is_onboarded = COALESCE($2, user_onboarding.is_onboarded),
      has_accepted_terms = COALESCE($3, user_onboarding.has_accepted_terms),
      risk_level = COALESCE($4, user_onboarding.risk_level),
      cooldown_enabled = COALESCE($5, user_onboarding.cooldown_enabled),
      voice_intervention_enabled = COALESCE($6, user_onboarding.voice_intervention_enabled),
      share_message_contents = COALESCE($7, user_onboarding.share_message_contents),
      share_financial_data = COALESCE($8, user_onboarding.share_financial_data),
      share_session_telemetry = COALESCE($9, user_onboarding.share_session_telemetry),
      notify_nft_identity_ready = COALESCE($10, user_onboarding.notify_nft_identity_ready),
      daily_limit = COALESCE($11, user_onboarding.daily_limit),
      redeem_threshold = COALESCE($12, user_onboarding.redeem_threshold),
      quiz_scores = COALESCE($13, user_onboarding.quiz_scores),
      tutorial_completed = COALESCE($14, user_onboarding.tutorial_completed),
      notifications_tips = COALESCE($15, user_onboarding.notifications_tips),
      notifications_trivia = COALESCE($16, user_onboarding.notifications_trivia),
      notifications_promos = COALESCE($17, user_onboarding.notifications_promos),
      compliance_bypass = COALESCE($18, user_onboarding.compliance_bypass),
      updated_at = NOW()
    RETURNING *
  `;

  const values = [
    payload.discord_id,
    payload.is_onboarded ?? null,
    payload.has_accepted_terms ?? null,
    payload.risk_level ?? null,
    payload.cooldown_enabled ?? null,
    payload.voice_intervention_enabled ?? null,
    payload.share_message_contents ?? null,
    payload.share_financial_data ?? null,
    payload.share_session_telemetry ?? null,
    payload.notify_nft_identity_ready ?? null,
    payload.daily_limit ?? null,
    payload.redeem_threshold ?? null,
    payload.quiz_scores ?? null,
    payload.tutorial_completed ?? null,
    payload.notifications_tips ?? null,
    payload.notifications_trivia ?? null,
    payload.notifications_promos ?? null,
    payload.compliance_bypass ?? null
  ];

  return queryOne<UserOnboarding>(sql, values);
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  return findById<User>('users', id);
}

/**
 * Find user by Discord ID
 */
export async function findUserByDiscordId(discordId: string): Promise<User | null> {
  return findOneBy<User>('users', 'discord_id', discordId);
}

/**
 * Find user by wallet address
 */
export async function findUserByWallet(walletAddress: string): Promise<User | null> {
  return findOneBy<User>('users', 'wallet_address', walletAddress);
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return findOneBy<User>('users', 'email', email);
}

/**
 * Create a new user
 */
export async function createUser(payload: CreateUserPayload): Promise<User | null> {
  const data = {
    ...payload,
    roles: payload.roles || ['user'],
    created_at: new Date(),
    updated_at: new Date(),
  };

  return insert<User>('users', data);
}

/**
 * Update a user
 */
export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User | null> {
  const data = {
    ...payload,
    updated_at: new Date(),
  };

  return update<User>('users', id, data);
}

/**
 * Find or create user by Discord ID
 */
export async function findOrCreateUserByDiscord(
  discordId: string,
  discordUsername: string,
  discordAvatar?: string
): Promise<User> {
  const existing = await findUserByDiscordId(discordId);

  if (existing) {
    // Update username/avatar if changed
    if (existing.discord_username !== discordUsername || existing.discord_avatar !== discordAvatar) {
      const updated = await updateUser(existing.id, {
        discord_username: discordUsername,
        discord_avatar: discordAvatar,
        last_login_at: new Date(),
      });
      return updated || existing;
    }
    return existing;
  }

  const newUser = await createUser({
    discord_id: discordId,
    discord_username: discordUsername,
    discord_avatar: discordAvatar,
    roles: ['user'],
  });

  if (!newUser) {
    throw new Error('Failed to create user');
  }

  return newUser;
}

/**
 * Link wallet to user
 */
export async function linkWalletToUser(userId: string, walletAddress: string): Promise<User | null> {
  // Check if wallet is already linked to another user
  const existingUser = await findUserByWallet(walletAddress);
  if (existingUser && existingUser.id !== userId) {
    throw new Error('Wallet is already linked to another account');
  }

  return updateUser(userId, { wallet_address: walletAddress });
}

// ============================================================================
// Admin Queries
// ============================================================================

/**
 * Find admin by ID
 */
export async function findAdminById(id: string): Promise<Admin | null> {
  return findById<Admin>('admins', id);
}

/**
 * Find admin by email
 */
export async function findAdminByEmail(email: string): Promise<Admin | null> {
  return findOneBy<Admin>('admins', 'email', email);
}

/**
 * Check if email is an admin
 */
export async function isAdminEmail(email: string): Promise<boolean> {
  return exists('admins', 'email', email);
}

// ============================================================================
// Magic Link Queries
// ============================================================================

/**
 * Create a magic link
 */
export async function createMagicLink(
  email: string,
  tokenHash: string,
  expiresInMinutes: number = 15
): Promise<MagicLink | null> {
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  return insert<MagicLink>('magic_links', {
    email,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_at: new Date(),
  });
}

/**
 * Find valid magic link by token hash
 */
export async function findValidMagicLink(tokenHash: string): Promise<MagicLink | null> {
  const sql = `
    SELECT * FROM magic_links 
    WHERE token_hash = $1 
    AND expires_at > NOW() 
    AND used_at IS NULL
    LIMIT 1
  `;

  return queryOne<MagicLink>(sql, [tokenHash]);
}

/**
 * Mark magic link as used
 */
export async function markMagicLinkUsed(id: string): Promise<void> {
  await update('magic_links', id, { used_at: new Date() });
}

// ============================================================================
// Session Queries
// ============================================================================

/**
 * Create a session
 */
export async function createSession(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
  ipAddress?: string,
  userAgent?: string
): Promise<Session | null> {
  return insert<Session>('sessions', {
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: new Date(),
  });
}

/**
 * Find valid session by token hash
 */
export async function findValidSession(tokenHash: string): Promise<Session | null> {
  const sql = `
    SELECT * FROM sessions 
    WHERE token_hash = $1 
    AND expires_at > NOW()
    LIMIT 1
  `;

  return queryOne<Session>(sql, [tokenHash]);
}

/**
 * Delete a session
 */
export async function deleteSession(id: string): Promise<void> {
  await query('DELETE FROM sessions WHERE id = $1', [id]);
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

// ============================================================================
// Tip Queries (JustTheTip)
// ============================================================================

/**
 * Create a tip
 */
export async function createTip(payload: CreateTipPayload): Promise<Tip | null> {
  return insert<Tip>('tips', {
    ...payload,
    status: 'pending',
    created_at: new Date(),
  });
}

/**
 * Find tip by ID
 */
export async function findTipById(id: string): Promise<Tip | null> {
  return findById<Tip>('tips', id);
}

/**
 * Update tip status
 */
export async function updateTipStatus(
  id: string,
  status: Tip['status'],
  txSignature?: string
): Promise<Tip | null> {
  const data: Partial<Tip> = { status };

  if (txSignature) {
    data.tx_signature = txSignature;
  }

  if (status === 'completed') {
    data.completed_at = new Date();
  }

  return update<Tip>('tips', id, data);
}

/**
 * Get tips sent by a user
 */
export async function getTipsBySender(
  senderId: string,
  pagination?: PaginationParams
): Promise<PaginatedResult<Tip>> {
  const { limit = 20, offset = 0 } = pagination || {};
  const { orderBy, orderDir } = validateSort(
    pagination?.orderBy || 'created_at',
    ['created_at', 'amount_sol', 'status'],
    pagination?.orderDir
  );

  const sql = `
    SELECT * FROM tips 
    WHERE sender_id = $1 
    ORDER BY ${orderBy} ${orderDir}
    LIMIT $2 OFFSET $3
  `;

  const countSql = 'SELECT COUNT(*) as count FROM tips WHERE sender_id = $1';

  const [rows, countResult] = await Promise.all([
    query<Tip>(sql, [senderId, limit, offset]),
    queryOne<{ count: string }>(countSql, [senderId]),
  ]);

  const total = parseInt(countResult?.count ?? '0', 10);

  return {
    rows,
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  };
}

/**
 * Get tips received by a Discord user
 */
export async function getTipsByRecipient(
  recipientDiscordId: string,
  pagination?: PaginationParams
): Promise<PaginatedResult<Tip>> {
  const { limit = 20, offset = 0 } = pagination || {};
  const { orderBy, orderDir } = validateSort(
    pagination?.orderBy || 'created_at',
    ['created_at', 'amount_sol', 'status'],
    pagination?.orderDir
  );

  const sql = `
    SELECT * FROM tips 
    WHERE recipient_discord_id = $1 
    ORDER BY ${orderBy} ${orderDir}
    LIMIT $2 OFFSET $3
  `;

  const countSql = 'SELECT COUNT(*) as count FROM tips WHERE recipient_discord_id = $1';

  const [rows, countResult] = await Promise.all([
    query<Tip>(sql, [recipientDiscordId, limit, offset]),
    queryOne<{ count: string }>(countSql, [recipientDiscordId]),
  ]);

  const total = parseInt(countResult?.count ?? '0', 10);

  return {
    rows,
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  };
}

// ============================================================================
// Casino Queries
// ============================================================================

/**
 * Find casino by ID
 */
export async function findCasinoById(id: string): Promise<Casino | null> {
  return findById<Casino>('casinos', id);
}

/**
 * Find casino by slug
 */
export async function findCasinoBySlug(slug: string): Promise<Casino | null> {
  return findOneBy<Casino>('casinos', 'slug', slug);
}

/**
 * Find casino by domain
 */
export async function findCasinoByDomain(domain: string): Promise<Casino | null> {
  return findOneBy<Casino>('casinos', 'domain', domain);
}

/**
 * Get all casinos with pagination
 */
export async function getCasinos(
  pagination?: PaginationParams
): Promise<PaginatedResult<Casino>> {
  const { limit = 20, offset = 0 } = pagination || {};
  const { orderBy, orderDir } = validateSort(
    pagination?.orderBy || 'name',
    ['name', 'grade', 'domain', 'created_at'],
    pagination?.orderDir
  );

  const sql = `
    SELECT * FROM casinos 
    ORDER BY ${orderBy} ${orderDir}
    LIMIT $1 OFFSET $2
  `;

  const countSql = 'SELECT COUNT(*) as count FROM casinos';

  const [rows, countResult] = await Promise.all([
    query<Casino>(sql, [limit, offset]),
    queryOne<{ count: string }>(countSql),
  ]);

  const total = parseInt(countResult?.count ?? '0', 10);

  return {
    rows,
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  };
}

/**
 * Add a casino grade
 */
export async function addCasinoGrade(
  casinoId: string,
  adminId: string,
  grade: string,
  notes?: string
): Promise<CasinoGrade | null> {
  // Insert grade record
  const gradeRecord = await insert<CasinoGrade>('casino_grades', {
    casino_id: casinoId,
    admin_id: adminId,
    grade,
    notes,
    created_at: new Date(),
  });

  // Update casino's current grade
  await update('casinos', casinoId, {
    grade,
    updated_at: new Date(),
  });

  return gradeRecord;
}

// ============================================================================
// Audit Log Queries
// ============================================================================

/**
 * Create an audit log entry
 */
export async function createAuditLog(payload: CreateAuditLogPayload): Promise<AuditLog | null> {
  return insert<AuditLog>('audit_logs', {
    ...payload,
    metadata: payload.metadata || {},
    created_at: new Date(),
  });
}

/**
 * Get audit logs for a specific admin
 */
export async function getAuditLogsByAdmin(
  adminId: string,
  pagination?: PaginationParams
): Promise<PaginatedResult<AuditLog>> {
  const { limit = 50, offset = 0 } = pagination || {};
  const { orderBy, orderDir } = validateSort(
    pagination?.orderBy || 'created_at',
    ['created_at', 'action_type', 'admin_id'],
    pagination?.orderDir
  );

  const sql = `
    SELECT * FROM audit_logs 
    WHERE admin_id = $1 
    ORDER BY ${orderBy} ${orderDir}
    LIMIT $2 OFFSET $3
  `;

  const countSql = 'SELECT COUNT(*) as count FROM audit_logs WHERE admin_id = $1';

  const [rows, countResult] = await Promise.all([
    query<AuditLog>(sql, [adminId, limit, offset]),
    queryOne<{ count: string }>(countSql, [adminId]),
  ]);

  const total = parseInt(countResult?.count ?? '0', 10);

  return {
    rows,
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  };
}

/**
 * Get audit logs for a specific user ID
 */
export async function getAuditLogsByUser(
  userId: string,
  pagination?: PaginationParams & { action?: string }
): Promise<PaginatedResult<AuditLog>> {
  const { limit = 50, offset = 0 } = pagination || {};
  const { orderBy, orderDir } = validateSort(
    pagination?.orderBy || 'created_at',
    ['created_at', 'action_type'],
    pagination?.orderDir
  );

  let sql = `
    SELECT * FROM audit_logs 
    WHERE target_id = $1 AND target_type = 'USER'
  `;
  let countSql = "SELECT COUNT(*) as count FROM audit_logs WHERE target_id = $1 AND target_type = 'USER'";
  
  const params = [userId];

  if (pagination?.action) {
    sql += ` AND action = $${params.length + 1}`;
    countSql += ` AND action = $${params.length + 1}`;
    params.push(pagination.action);
  }

  sql += ` ORDER BY ${orderBy} ${orderDir} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  
  const [rows, countResult] = await Promise.all([
    query<AuditLog>(sql, [...params, limit, offset]),
    queryOne<{ count: string }>(countSql, params),
  ]);

  const total = parseInt(countResult?.count ?? '0', 10);

  return {
    rows,
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  };
}

// ============================================================================
// Partner & Webhook Queries
// ============================================================================

/**
 * Find partner by app ID
 */
export async function findPartnerByAppId(appId: string): Promise<Partner | null> {
  return findOneBy<Partner>('partners', 'app_id', appId);
}

/**
 * Find partner by ID
 */
export async function findPartnerById(id: string): Promise<Partner | null> {
  return findById<Partner>('partners', id);
}

/**
 * Create a new partner
 */
export async function createPartner(payload: CreatePartnerPayload): Promise<Partner | null> {
  return insert<Partner>('partners', {
    ...payload,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  });
}

/**
 * Create a webhook for a partner
 */
export async function createWebhook(payload: CreateWebhookPayload): Promise<Webhook | null> {
  return insert<Webhook>('webhooks', {
    ...payload,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  });
}

/**
 * Find active webhooks for a specific event type
 */
export async function findActiveWebhooksByEvent(eventType: string): Promise<Webhook[]> {
  const sql = `
    SELECT * FROM webhooks 
    WHERE is_active = true 
    AND $1 = ANY(events)
  `;
  return query<Webhook>(sql, [eventType]);
}

/**
 * Log a webhook delivery attempt
 */
export async function logWebhookDelivery(delivery: Omit<WebhookDelivery, 'id' | 'created_at'>): Promise<WebhookDelivery | null> {
  return insert<WebhookDelivery>('webhook_deliveries', {
    ...delivery,
    created_at: new Date(),
  });
}

// ============================================================================
// Identity & Trust Queries
// ============================================================================

/**
 * Get aggregated trust summary for a Discord ID across all known origins
 */
export async function getAggregatedTrustByDiscordId(discordId: string): Promise<UserTrustSummary> {
  const sql = `
    SELECT 
      discord_id,
      SUM(delta) as total_score,
      COUNT(*) as signals_count,
      COUNT(DISTINCT origin_id) as origins_count,
      MAX(created_at) as last_activity
    FROM trust_signals
    WHERE discord_id = $1
    GROUP BY discord_id
  `;

  const result = await queryOne<{
    total_score: string;
    signals_count: string;
    origins_count: string;
    last_activity: string | Date;
  }>(sql, [discordId]);

  // Base score 100, capped at 0-1000
  const baseScore = 100;
  const totalDelta = parseInt(result?.total_score ?? '0', 10);
  const finalScore = Math.max(0, Math.min(1000, baseScore + totalDelta));

  return {
    discord_id: discordId,
    total_score: finalScore,
    signals_count: parseInt(result?.signals_count ?? '0', 10),
    origins_count: parseInt(result?.origins_count ?? '0', 10),
    top_risk_factors: [],
    last_activity: result?.last_activity ? new Date(result.last_activity) : null,
  };
}

/**
 * Log a new trust signal
 */
export async function logTrustSignal(payload: CreateTrustSignalPayload): Promise<TrustSignal | null> {
  return insert<TrustSignal>('trust_signals', {
    ...payload,
    created_at: new Date(),
  });
}

/**
 * Get latest recovery application for a Discord user
 */
export async function findLatestRecoveryApplicationByDiscordUserId(
  discordUserId: string
): Promise<RecoveryApplication | null> {
  const sql = `
    SELECT *
    FROM recovery_applications
    WHERE discord_user_id = $1
    ORDER BY applied_at DESC
    LIMIT 1
  `;

  return queryOne<RecoveryApplication>(sql, [discordUserId]);
}

/**
 * Find recovery application by application ID
 */
export async function findRecoveryApplicationById(id: string): Promise<RecoveryApplication | null> {
  return findById<RecoveryApplication>('recovery_applications', id);
}

/**
 * Create a recovery application
 */
export async function createRecoveryApplication(
  payload: CreateRecoveryApplicationPayload
): Promise<RecoveryApplication | null> {
  return insert<RecoveryApplication>('recovery_applications', {
    ...payload,
    support_discord_id: payload.support_discord_id ?? null,
    review_message_id: payload.review_message_id ?? null,
    review_channel_id: payload.review_channel_id ?? null,
    community_votes: payload.community_votes ?? 0,
    rejection_reason: payload.rejection_reason ?? null,
    approved_by: payload.approved_by ?? null,
    applied_at: new Date(),
    updated_at: new Date(),
  });
}

/**
 * Update a recovery application
 */
export async function updateRecoveryApplication(
  id: string,
  payload: UpdateRecoveryApplicationPayload
): Promise<RecoveryApplication | null> {
  return update<RecoveryApplication>('recovery_applications', id, {
    ...payload,
    updated_at: payload.updated_at ?? new Date(),
  });
}

/**
 * List recovery applications by status
 */
export async function listRecoveryApplicationsByStatus(
  status: RecoveryApplicationStatus
): Promise<RecoveryApplication[]> {
  const sql = `
    SELECT *
    FROM recovery_applications
    WHERE status = $1
    ORDER BY applied_at DESC
  `;

  return query<RecoveryApplication>(sql, [status]);
}

// ============================================================================
// Buddy & Accountability Queries
// ============================================================================

/**
 * Send a buddy request
 */
export async function sendBuddyRequest(
  userId: string,
  buddyId: string,
  thresholds?: BuddyAlertThresholds
): Promise<UserBuddy | null> {
  return insert<UserBuddy>('user_buddies', {
    user_id: userId,
    buddy_id: buddyId,
    status: 'pending',
    alert_thresholds: thresholds || {
      tilt_score_exceeds: 80,
      losses_in_24h_sol: 5.0,
      zero_balance_reached: true,
    },
    created_at: new Date(),
    updated_at: new Date(),
  });
}

/**
 * Accept a pending buddy request
 */
export async function acceptBuddyRequest(requestId: string): Promise<UserBuddy | null> {
  return update<UserBuddy>('user_buddies', requestId, {
    status: 'accepted',
    updated_at: new Date(),
  });
}

/**
 * Get buddies for a user (accountability partners watching the user)
 */
export async function getUserBuddies(userId: string): Promise<UserBuddy[]> {
  const sql = `
    SELECT * FROM user_buddies 
    WHERE user_id = $1 AND status = 'accepted'
  `;
  return query<UserBuddy>(sql, [userId]);
}

/**
 * Get users that this user is watching (user is the buddy)
 */
export async function getAccountabilityPartners(buddyId: string): Promise<UserBuddy[]> {
  const sql = `
    SELECT * FROM user_buddies 
    WHERE buddy_id = $1 AND status = 'accepted'
  `;
  return query<UserBuddy>(sql, [buddyId]);
}

/**
 * Get pending buddy requests for a user
 */
export async function getPendingBuddyRequests(userId: string): Promise<UserBuddy[]> {
  const sql = `
    SELECT * FROM user_buddies 
    WHERE buddy_id = $1 AND status = 'pending'
  `;
  return query<UserBuddy>(sql, [userId]);
}

/**
 * Update buddy alert thresholds
 */
export async function updateBuddyThresholds(
  userId: string,
  buddyId: string,
  thresholds: BuddyAlertThresholds
): Promise<UserBuddy | null> {
  const sql = `
    UPDATE user_buddies 
    SET alert_thresholds = $3, updated_at = NOW()
    WHERE user_id = $1 AND buddy_id = $2
    RETURNING *
  `;
  const result = await query<UserBuddy>(sql, [userId, buddyId, JSON.stringify(thresholds)]);
  return result[0] || null;
}

/**
 * Remove a buddy relationship
 */
export async function removeBuddy(userId: string, buddyId: string): Promise<boolean> {
  const sql = `
    DELETE FROM user_buddies 
    WHERE (user_id = $1 AND buddy_id = $2) OR (user_id = $2 AND buddy_id = $1)
  `;
  await query(sql, [userId, buddyId]);
  return true;
}

// ============================================================================
// Surgical Self-Exclusion Queries
// ============================================================================

/**
 * Get all exclusions for a user.
 */
export async function getUserExclusions(userId: string): Promise<GameExclusion[]> {
  const sql = `
    SELECT id, user_id, game_id, category, reason, created_at
    FROM user_game_exclusions
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
  const rows = await query<{
    id: string;
    user_id: string;
    game_id: string | null;
    category: string | null;
    reason: string | null;
    created_at: Date;
  }>(sql, [userId]);

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    gameId: r.game_id,
    category: r.category as GameCategory | null,
    reason: r.reason,
    createdAt: r.created_at,
  }));
}

/**
 * Add a new exclusion entry. Caller must ensure at least one of gameId/category is set.
 */
export async function addExclusion(payload: CreateGameExclusionPayload): Promise<GameExclusion> {
  const sql = `
    INSERT INTO user_game_exclusions (user_id, game_id, category, reason)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, game_id, category, reason, created_at
  `;
  const row = await queryOne<{
    id: string;
    user_id: string;
    game_id: string | null;
    category: string | null;
    reason: string | null;
    created_at: Date;
  }>(sql, [payload.userId, payload.gameId ?? null, payload.category ?? null, payload.reason ?? null]);

  if (!row) throw new Error('Failed to insert exclusion');
  return {
    id: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    category: row.category as GameCategory | null,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

/**
 * Remove a single exclusion entry. Scoped to userId to prevent cross-user deletes.
 */
export async function removeExclusion(exclusionId: string, userId: string): Promise<boolean> {
  const sql = `
    DELETE FROM user_game_exclusions
    WHERE id = $1 AND user_id = $2
  `;
  await query(sql, [exclusionId, userId]);
  return true;
}

/**
 * Remove all exclusions for a user.
 */
export async function clearExclusions(userId: string): Promise<boolean> {
  await query('DELETE FROM user_game_exclusions WHERE user_id = $1', [userId]);
  return true;
}

/**
 * Check whether a specific game is excluded for a user.
 * Matches on exact gameId OR category match.
 */
export async function checkGameExcluded(
  userId: string,
  gameId?: string | null,
  category?: GameCategory | null
): Promise<boolean> {
  if (!gameId && !category) return false;

  const conditions: string[] = [];
  const params: (string | null)[] = [userId];

  if (gameId) {
    params.push(gameId);
    conditions.push(`game_id = $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }

  const sql = `
    SELECT 1 FROM user_game_exclusions
    WHERE user_id = $1 AND (${conditions.join(' OR ')})
    LIMIT 1
  `;
  const row = await queryOne<{ '?column?': number }>(sql, params);
  return row !== null && row !== undefined;
}

/**
 * Build the full ForbiddenGamesProfile for a user — used to populate the Redis cache.
 */
export async function buildForbiddenGamesProfile(userId: string): Promise<ForbiddenGamesProfile> {
  const exclusions = await getUserExclusions(userId);
  const blockedGameIds = exclusions.filter((e) => !!e.gameId).map((e) => e.gameId as string);
  const blockedCategories = exclusions.filter((e) => !!e.category).map((e) => e.category as GameCategory);

  return {
    userId,
    blockedGameIds,
    blockedCategories,
    exclusions,
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Auto-Vault Rule Queries
// ============================================================================

export async function getVaultRules(userId: string): Promise<VaultRule[]> {
  const sql = `
    SELECT * FROM user_vault_rules
    WHERE user_id = $1
    ORDER BY created_at ASC
  `;
  const result = await query<VaultRule>(sql, [userId]);
  return result;
}

export async function getVaultRule(id: string, userId: string): Promise<VaultRule | null> {
  return queryOne<VaultRule>(
    `SELECT * FROM user_vault_rules WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

export async function createVaultRule(payload: CreateVaultRulePayload): Promise<VaultRule> {
  const sql = `
    INSERT INTO user_vault_rules
      (user_id, type, casino, percent, fixed_amount, threshold_amount,
       ceiling_amount, profit_target, min_win_amount, cooldown_ms, label)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *
  `;
  const row = await queryOne<VaultRule>(sql, [
    payload.user_id,
    payload.type,
    payload.casino ?? 'all',
    payload.percent ?? null,
    payload.fixed_amount ?? null,
    payload.threshold_amount ?? null,
    payload.ceiling_amount ?? null,
    payload.profit_target ?? null,
    payload.min_win_amount ?? null,
    payload.cooldown_ms ?? null,
    payload.label ?? null,
  ]);
  if (!row) throw new Error('Failed to create vault rule');
  return row;
}

export async function updateVaultRule(
  id: string,
  userId: string,
  payload: UpdateVaultRulePayload
): Promise<VaultRule | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const allowed: (keyof UpdateVaultRulePayload)[] = [
    'type', 'casino', 'enabled', 'percent', 'fixed_amount',
    'threshold_amount', 'ceiling_amount', 'profit_target',
    'min_win_amount', 'cooldown_ms', 'label',
  ];

  for (const key of allowed) {
    if (key in payload) {
      fields.push(`${key} = $${idx++}`);
      values.push((payload as Record<string, unknown>)[key]);
    }
  }

  if (fields.length === 0) return getVaultRule(id, userId);

  fields.push(`updated_at = NOW()`);
  values.push(id, userId);

  const sql = `
    UPDATE user_vault_rules
    SET ${fields.join(', ')}
    WHERE id = $${idx++} AND user_id = $${idx}
    RETURNING *
  `;
  return queryOne<VaultRule>(sql, values);
}

export async function deleteVaultRule(id: string, userId: string): Promise<boolean> {
  await query(
    `DELETE FROM user_vault_rules WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return true;
}

export async function setVaultRuleEnabled(
  id: string,
  userId: string,
  enabled: boolean
): Promise<VaultRule | null> {
  return queryOne<VaultRule>(
    `UPDATE user_vault_rules SET enabled = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3 RETURNING *`,
    [enabled, id, userId]
  );
}
