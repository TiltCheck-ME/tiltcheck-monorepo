/**
 * @tiltcheck/db - Neon Database Client
 * Serverless PostgreSQL client using Neon
 */

import { neon, neonConfig, NeonQueryFunction } from '@neondatabase/serverless';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Database client configuration
 */
export interface DBClientConfig {
  connectionString: string;
  ssl?: boolean;
  fetchConnectionCache?: boolean;
}

/**
 * Get database configuration from environment
 */
export function getDBConfig(): DBClientConfig {
  const connectionString = process.env.NEON_DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL environment variable is required');
  }
  
  return {
    connectionString,
    ssl: process.env.DATABASE_SSL !== 'false',
    fetchConnectionCache: true,
  };
}

// ============================================================================
// Client Singleton
// ============================================================================

let sqlClient: NeonQueryFunction<false, false> | null = null;

/**
 * Get or create the database client
 */
export function getClient(): NeonQueryFunction<false, false> {
  if (!sqlClient) {
    const config = getDBConfig();
    
    // Configure Neon for serverless environments
    neonConfig.fetchConnectionCache = config.fetchConnectionCache ?? true;
    
    sqlClient = neon(config.connectionString);
  }
  
  return sqlClient;
}

/**
 * Create a new database client (for testing or isolated connections)
 */
export function createClient(config: DBClientConfig): NeonQueryFunction<false, false> {
  neonConfig.fetchConnectionCache = config.fetchConnectionCache ?? true;
  return neon(config.connectionString);
}

/**
 * Reset the client singleton (for testing)
 */
export function resetClient(): void {
  sqlClient = null;
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Execute a raw SQL query
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const client = getClient();
  const execute = client as unknown as (
    queryText: string,
    queryParams?: unknown[]
  ) => Promise<unknown>;
  
  if (params && params.length > 0) {
    const result = await execute(sql, params);
    return result as T[];
  }
  
  const result = await execute(sql);
  return result as T[];
}

/**
 * Execute a query and return the first row
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/**
 * Execute an insert and return the inserted row
 */
export async function insert<T = Record<string, unknown>>(
  table: string,
  data: Record<string, unknown>
): Promise<T | null> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const columns = keys.join(', ');
  
  const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
  
  return queryOne<T>(sql, values);
}

/**
 * Execute an update and return the updated row
 */
export async function update<T = Record<string, unknown>>(
  table: string,
  id: string,
  data: Record<string, unknown>,
  idColumn: string = 'id'
): Promise<T | null> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${idColumn} = $${keys.length + 1} RETURNING *`;
  
  return queryOne<T>(sql, [...values, id]);
}

/**
 * Execute a delete and return success
 */
export async function deleteRow(
  table: string,
  id: string,
  idColumn: string = 'id'
): Promise<boolean> {
  const sql = `DELETE FROM ${table} WHERE ${idColumn} = $1`;
  const result = await query(sql, [id]);
  return result.length > 0 || true; // Neon returns empty array on delete
}

/**
 * Find a row by ID
 */
export async function findById<T = Record<string, unknown>>(
  table: string,
  id: string,
  idColumn: string = 'id'
): Promise<T | null> {
  const sql = `SELECT * FROM ${table} WHERE ${idColumn} = $1`;
  return queryOne<T>(sql, [id]);
}

/**
 * Find rows by a column value
 */
export async function findBy<T = Record<string, unknown>>(
  table: string,
  column: string,
  value: unknown
): Promise<T[]> {
  const sql = `SELECT * FROM ${table} WHERE ${column} = $1`;
  return query<T>(sql, [value]);
}

/**
 * Find one row by a column value
 */
export async function findOneBy<T = Record<string, unknown>>(
  table: string,
  column: string,
  value: unknown
): Promise<T | null> {
  const rows = await findBy<T>(table, column, value);
  return rows[0] ?? null;
}

/**
 * Check if a row exists
 */
export async function exists(
  table: string,
  column: string,
  value: unknown
): Promise<boolean> {
  const sql = `SELECT 1 FROM ${table} WHERE ${column} = $1 LIMIT 1`;
  const result = await query(sql, [value]);
  return result.length > 0;
}

/**
 * Count rows in a table
 */
export async function count(
  table: string,
  where?: string,
  params?: unknown[]
): Promise<number> {
  let sql = `SELECT COUNT(*) as count FROM ${table}`;
  if (where) {
    sql += ` WHERE ${where}`;
  }
  
  const result = await queryOne<{ count: string }>(sql, params);
  return parseInt(result?.count ?? '0', 10);
}

// ============================================================================
// Transaction Helper
// ============================================================================

/**
 * Note: Neon serverless doesn't support traditional transactions.
 * For complex operations, consider using Neon's transaction API
 * or restructuring queries to be atomic.
 */

export type { NeonQueryFunction };
