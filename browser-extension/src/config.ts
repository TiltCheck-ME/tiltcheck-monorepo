/**
 * Browser Extension Configuration Constants
 * 
 * Centralized configuration to avoid hardcoded values throughout the codebase.
 * These constants should be updated when deployment environments change.
 * 
 * NOTE: Some constants are duplicated at the top of content.ts for the early
 * exit check that runs before ES module imports. When updating values here,
 * also update the corresponding constants in content.ts.
 */

/**
 * API Server Configuration
 * The port used by the TiltGuard API server (server/api.js).
 * This should match the TILTGUARD_API_PORT environment variable used by the server.
 * 
 * Also duplicated in content.ts for early exit check.
 */
export const API_SERVER_PORT = '3333';

/**
 * WebSocket Analyzer Server Configuration
 * The URL for the analyzer WebSocket server.
 */
export const ANALYZER_WS_URL = 'ws://localhost:7071';

/**
 * Excluded Domains Configuration
 * Domains that should be excluded from content script injection.
 * 
 * Also duplicated in content.ts for early exit check.
 */
export const EXCLUDED_DOMAINS = ['discord.com'];
