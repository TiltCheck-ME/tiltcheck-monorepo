/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

/**
 * @tiltcheck/db-client - Supabase Client
 * Singleton Supabase client instance used by all query helpers.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Configuration for the Supabase db-client.
 */
export interface DbClientConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

/**
 * Read configuration from environment variables.
 * Expects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).
 */
export function getDbClientConfig(): DbClientConfig {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }
  if (!supabaseKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable is required'
    );
  }

  return { supabaseUrl, supabaseKey };
}

/**
 * Get or create the shared Supabase client singleton.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    const config = getDbClientConfig();
    _client = createClient(config.supabaseUrl, config.supabaseKey);
  }
  return _client;
}

/**
 * Initialise the singleton with an explicit config (useful for testing).
 */
export function initSupabaseClient(config: DbClientConfig): SupabaseClient {
  _client = createClient(config.supabaseUrl, config.supabaseKey);
  return _client;
}

/**
 * Reset the singleton (for testing).
 */
export function resetSupabaseClient(): void {
  _client = null;
}
