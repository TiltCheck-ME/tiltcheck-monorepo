/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * @tiltcheck/justthetip
 * Centrally managed tipping logic for the TiltCheck ecosystem.
 */

export * from './types.js';
export * from './core.js';

// Re-export specific logic as a namespace for backwards compatibility if needed
import * as justthetip from './core.js';
export { justthetip };
