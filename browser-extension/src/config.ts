/**
 * Browser Extension Configuration Constants
 * 
 * Centralized configuration to avoid hardcoded values throughout the codebase.
 * These constants should be updated when deployment environments change.
 */

/**
 * API Server Configuration
 * The port used by the TiltGuard API server (server/api.js).
 * This should match the TILTGUARD_API_PORT environment variable used by the server.
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
 */
export const EXCLUDED_DOMAINS = ['discord.com'];
