/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @tiltcheck/db - Neon Database Client
 * Serverless PostgreSQL client using Neon
 */

import { neon, neonConfig, NeonQueryFunction, Pool, PoolClient } from '@neondatabase/serverless';

/**
 * Database client interface for both standard and transactional use
 */
export interface Client {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  insert<T = Record<string, unknown>>(table: string, data: Record<string, unknown>): Promise<T | null>;
  update<T = Record<string, unknown>>(table: string, id: string, data: Record<string, unknown>, idColumn?: string): Promise<T | null>;
  deleteRow(table: string, id: string, idColumn?: string): Promise<boolean>;
  findById<T = Record<string, unknown>>(table: string, id: string, idColumn?: string): Promise<T | null>;
  findBy<T = Record<string, unknown>>(table: string, column: string, value: unknown): Promise<T[]>;
  findOneBy<T = Record<string, unknown>>(table: string, column: string, value: unknown): Promise<T | null>;
  exists(table: string, column: string, value: unknown): Promise<boolean>;
  count(table: string, where?: string, params?: unknown[]): Promise<number>;
}

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
 * Execute a raw SQL query using the default client
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
 * Execute a query and return the first row using the default client
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Build an INSERT statement
 */
function _buildInsert(table: string, data: Record<string, unknown>) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const columns = keys.join(', ');
  const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
  return { sql, values };
}

/**
 * Build an UPDATE statement
 */
function _buildUpdate(table: string, id: string, data: Record<string, unknown>, idColumn: string = 'id') {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${idColumn} = $${keys.length + 1} RETURNING *`;
  return { sql, values: [...values, id] };
}

/**
 * Create a full Client implementation from a query executor
 */
function createClientFromExecutor(executor: (sql: string, params?: unknown[]) => Promise<any[]>): Client {
  return {
    query: async <T>(sql: string, params?: unknown[]) => (await executor(sql, params)) as T[],
    queryOne: async <T>(sql: string, params?: unknown[]) => {
      const rows = await executor(sql, params);
      return (rows[0] as T) ?? null;
    },
    insert: async <T>(table, data) => {
      const { sql, values } = _buildInsert(table, data);
      const rows = await executor(sql, values);
      return (rows[0] as T) ?? null;
    },
    update: async <T>(table, id, data, idColumn = 'id') => {
      const { sql, values } = _buildUpdate(table, id, data, idColumn);
      const rows = await executor(sql, values);
      return (rows[0] as T) ?? null;
    },
    deleteRow: async (table, id, idColumn = 'id') => {
      const sql = `DELETE FROM ${table} WHERE ${idColumn} = $1`;
      const result = await executor(sql, [id]);
      return result.length > 0 || true;
    },
    findById: async <T>(table, id, idColumn = 'id') => {
      const sql = `SELECT * FROM ${table} WHERE ${idColumn} = $1`;
      const rows = await executor(sql, [id]);
      return (rows[0] as T) ?? null;
    },
    findBy: async <T>(table, column, value) => {
      const sql = `SELECT * FROM ${table} WHERE ${column} = $1`;
      return (await executor(sql, [value])) as T[];
    },
    findOneBy: async <T>(table, column, value) => {
      const sql = `SELECT * FROM ${table} WHERE ${column} = $1`;
      const rows = await executor(sql, [value]);
      return (rows[0] as T) ?? null;
    },
    exists: async (table, column, value) => {
      const sql = `SELECT 1 FROM ${table} WHERE ${column} = $1 LIMIT 1`;
      const result = await executor(sql, [value]);
      return result.length > 0;
    },
    count: async (table, where, params) => {
      let sql = `SELECT COUNT(*) as count FROM ${table}`;
      if (where) sql += ` WHERE ${where}`;
      const rows = await executor(sql, params);
      const result = (rows[0] as { count: string }) ?? { count: '0' };
      return parseInt(result.count, 10);
    },
  };
}

/**
 * Default internal client instance
 */
const defaultClient = createClientFromExecutor(query);

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
  return defaultClient.insert<T>(table, data);
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
  return defaultClient.update<T>(table, id, data, idColumn);
}

/**
 * Execute a delete and return success
 */
export async function deleteRow(
  table: string,
  id: string,
  idColumn: string = 'id'
): Promise<boolean> {
  return defaultClient.deleteRow(table, id, idColumn);
}

/**
 * Find a row by ID
 */
export async function findById<T = Record<string, unknown>>(
  table: string,
  id: string,
  idColumn: string = 'id'
): Promise<T | null> {
  return defaultClient.findById<T>(table, id, idColumn);
}

/**
 * Find rows by a column value
 */
export async function findBy<T = Record<string, unknown>>(
  table: string,
  column: string,
  value: unknown
): Promise<T[]> {
  return defaultClient.findBy<T>(table, column, value);
}

/**
 * Find one row by a column value
 */
export async function findOneBy<T = Record<string, unknown>>(
  table: string,
  column: string,
  value: unknown
): Promise<T | null> {
  return defaultClient.findOneBy<T>(table, column, value);
}

/**
 * Check if a row exists
 */
export async function exists(
  table: string,
  column: string,
  value: unknown
): Promise<boolean> {
  return defaultClient.exists(table, column, value);
}

/**
 * Count rows in a table
 */
export async function count(
  table: string,
  where?: string,
  params?: unknown[]
): Promise<number> {
  return defaultClient.count(table, where, params);
}

// ============================================================================
// Transaction Helper
// ============================================================================
/**
 * Connection pool singleton (for transactions)
 */
let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    const config = getDBConfig();
    pool = new Pool({ connectionString: config.connectionString });
  }
  return pool;
}

/**
 * Execute a sequence of database operations within a transaction
 */
export async function withTransaction<T>(
  callback: (client: Client) => Promise<T>
): Promise<T> {
  const dbPool = getPool();
  const connection = await dbPool.connect();

  try {
    await connection.query('BEGIN');

    // Create a transactional client wrapper
    const txClient = createClientFromExecutor(async (sql, params) => {
      const res = await connection.query(sql, params);
      return res.rows;
    });

    const result = await callback(txClient);

    await connection.query('COMMIT');
    return result;
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
}

export type { NeonQueryFunction, PoolClient };
```
