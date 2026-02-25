/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
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
  PaginationParams,
  PaginatedResult,
} from './types.js';

// ============================================================================
// User Queries
// ============================================================================

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
  const { limit = 20, offset = 0, orderBy = 'created_at', orderDir = 'desc' } = pagination || {};
  
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
  const { limit = 20, offset = 0, orderBy = 'created_at', orderDir = 'desc' } = pagination || {};
  
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
  const { limit = 20, offset = 0, orderBy = 'name', orderDir = 'asc' } = pagination || {};
  
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
