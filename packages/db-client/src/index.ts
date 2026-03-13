/* Copyright (c) 2026 TiltCheck. All rights reserved. */

/**
 * @tiltcheck/db-client
 *
 * Typed generic Supabase query helpers for the TiltCheck ecosystem.
 *
 * @example
 * ```typescript
 * import { findById, findMany, upsert, softDelete } from '@tiltcheck/db-client';
 *
 * const user = await findById<User>('users', userId);
 * const admins = await findMany<User>('users', { role: 'admin' });
 * const saved = await upsert<User>('users', { id: userId, username: 'alice' });
 * await softDelete('users', userId);
 * ```
 */

// Client
export {
  getSupabaseClient,
  initSupabaseClient,
  resetSupabaseClient,
  getDbClientConfig,
  type DbClientConfig,
} from './client.js';

// Query helpers
export { findById, findMany, upsert, softDelete } from './query.js';
