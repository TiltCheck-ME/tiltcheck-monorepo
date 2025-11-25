/**
 * Command Index
 * 
 * Exports all available commands.
 * 
 * JustTheTip Bot Commands:
 * - /tip - Main tipping, wallet, vault, airdrop, and trivia commands
 * - /suslink - Link scanning and promo management
 * - /ping - Bot status check
 * - /help - Help and command info
 */

export { ping } from './ping.js';
export { help } from './help.js';
export { suslinkCmd as suslink } from './suslink.js';
export { tip } from './tip.js';

// Legacy commands kept for backwards compatibility
// These will be deprecated in favor of /tip and /suslink
export { support } from './support.js';
export { trustDashboard } from './trust.js';
