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
  BlogPost,
  CreateBlogPostPayload,
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
      cooldown_enabled, daily_limit, notifications_tips, 
      notifications_trivia, notifications_promos, updated_at
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    ON CONFLICT (discord_id) DO UPDATE SET
      is_onboarded = COALESCE($2, user_onboarding.is_onboarded),
      has_accepted_terms = COALESCE($3, user_onboarding.has_accepted_terms),
      risk_level = COALESCE($4, user_onboarding.risk_level),
      cooldown_enabled = COALESCE($5, user_onboarding.cooldown_enabled),
      daily_limit = COALESCE($6, user_onboarding.daily_limit),
      notifications_tips = COALESCE($7, user_onboarding.notifications_tips),
      notifications_trivia = COALESCE($8, user_onboarding.notifications_trivia),
      notifications_promos = COALESCE($9, user_onboarding.notifications_promos),
      updated_at = NOW()
    RETURNING *
  `;

  const values = [
    payload.discord_id,
    payload.is_onboarded ?? null,
    payload.has_accepted_terms ?? null,
    payload.risk_level ?? null,
    payload.cooldown_enabled ?? null,
    payload.daily_limit ?? null,
    payload.notifications_tips ?? null,
    payload.notifications_trivia ?? null,
    payload.notifications_promos ?? null,
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
