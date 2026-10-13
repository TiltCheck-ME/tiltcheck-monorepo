// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13
/**
 * @tiltcheck/justthetip
 * Centrally managed tipping logic for the TiltCheck ecosystem.
 */

export * from './types.js';
export * from './core.js';
export * from './credits.js';
export * from './solana.js';
export * from './rain.js';
export * from './tip-log.js';
export * from './tilt-hint.js';

import * as core from './core.js';
import { CreditService } from './credits.js';
import { DatabaseClient } from '@tiltcheck/database';

const db = new DatabaseClient({
  url: process.env.SUPABASE_URL || 'http://localhost',
  apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'none'
});

// Re-export specific logic as a namespace for backwards compatibility if needed
export const justthetip = {
  ...core,
  credits: new CreditService(db),
};

