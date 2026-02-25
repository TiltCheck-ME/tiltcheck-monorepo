/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

/**
 * @tiltcheck/db-client - Generic Query Helpers
 *
 * Typed generic helpers that wrap the Supabase client for common CRUD
 * operations.  All functions accept a `table` string so they work with any
 * Supabase table without requiring generated types.
 *
 * @example
 * ```typescript
 * import { findById, findMany, upsert, softDelete } from '@tiltcheck/db-client';
 *
 * interface User { id: string; username: string; deleted_at: string | null }
 *
 * const user  = await findById<User>('users', '123');
 * const users = await findMany<User>('users', { role: 'admin' });
 * const saved = await upsert<User>('users', { id: '123', username: 'alice' });
 * await softDelete('users', '123');
 * ```
 */

import { getSupabaseClient } from './client.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Throw a formatted error that includes the Supabase error details.
 */
function throwSupabaseError(operation: string, table: string, message: string): never {
  throw new Error(`[db-client] ${operation} on "${table}" failed: ${message}`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Find a single row by its `id` column.
 *
 * Returns `null` when no matching row exists.
 *
 * @param table  - Supabase table name (e.g. `"users"`)
 * @param id     - Value of the `id` column
 */
export async function findById<T>(table: string, id: string): Promise<T | null> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from(table)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throwSupabaseError('findById', table, error.message);
  }

  return (data as T) ?? null;
}

/**
 * Retrieve multiple rows from a table, with optional equality filters.
 *
 * Every key/value pair in `filters` is applied as an `.eq()` condition so
 * all filters are combined with AND semantics.
 *
 * @param table    - Supabase table name
 * @param filters  - Optional map of column → value equality conditions
 */
export async function findMany<T>(
  table: string,
  filters?: Record<string, unknown>
): Promise<T[]> {
  const client = getSupabaseClient();

  let query = client.from(table).select('*');

  if (filters) {
    for (const [column, value] of Object.entries(filters)) {
      // Supabase PostgREST accepts null comparisons via .is() but .eq() also
      // handles null correctly for most drivers; keep it simple here.
      query = query.eq(column, value as string);
    }
  }

  const { data, error } = await query;

  if (error) {
    throwSupabaseError('findMany', table, error.message);
  }

  return (data as T[]) ?? [];
}

/**
 * Insert or update a row using Supabase's `upsert`.
 *
 * The row is matched on the table's primary key (`id` by default in Supabase).
 * The resolved row is returned.
 *
 * @param table - Supabase table name
 * @param data  - Partial row data; must include `id` when updating
 */
export async function upsert<T>(table: string, data: Partial<T>): Promise<T> {
  const client = getSupabaseClient();

  const { data: result, error } = await client
    .from(table)
    .upsert(data as Record<string, unknown>)
    .select()
    .single();

  if (error) {
    throwSupabaseError('upsert', table, error.message);
  }

  if (!result) {
    throwSupabaseError('upsert', table, 'no row returned after upsert');
  }

  return result as T;
}

/**
 * Soft-delete a row by setting its `deleted_at` column to the current UTC
 * timestamp.  The row is matched by its `id` column.
 *
 * @param table - Supabase table name
 * @param id    - Value of the `id` column
 */
export async function softDelete(table: string, id: string): Promise<void> {
  const client = getSupabaseClient();

  const { error } = await client
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throwSupabaseError('softDelete', table, error.message);
  }
}
