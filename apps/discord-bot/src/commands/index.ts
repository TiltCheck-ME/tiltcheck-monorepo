/**
 * Command Index
 * 
 * Exports all available commands for the JustTheTip Bot.
 * 
 * Main Commands:
 * - /tip - Consolidated tipping, wallet, vault, airdrop, and trivia commands
 * - /suslink - Link scanning and promo management
 * - /ping - Bot status check
 * - /help - Help and command info
 * 
 * Utility Commands:
 * - /support - Request help from support
 * - /trust - Trust dashboard link (opens personalized dashboard)
 * - /tiltcheck - Tilt monitoring
 * - /cooldown - Cooldown management
 * - /lockvault - Vault management (legacy, now in /tip)
 * - /scan - Quick URL scan (legacy, now in /suslink)
 * - /triviadrop - Trivia drops (legacy, now in /tip trivia)
 */

// Core commands
export { ping } from './ping.js';
export { help } from './help.js';
export { suslinkCmd as suslink } from './suslink.js';
export { tip } from './tip.js';

// Support, trust dashboard, and tilt monitoring
export { support } from './support.js';
export { trustDashboard as trust } from './trust.js';
export { tiltcheck } from './tiltcheck.js';
export { data as dashboardData, execute as dashboardExecute } from './dashboard.js';

// Cooldown and vault management
export { cooldown, tilt } from './cooldown.js';
export { lockvault } from './lockvault.js';

// Entertainment
export { triviadrop } from './triviadrop.js';

// Legacy scan command (functionality now in /suslink scan)
export { scan } from './scan.js';

// Legacy airdrop command (functionality now in /tip airdrop)
export { airdrop } from './airdrop.js';

// Legacy JustTheTip command (functionality now consolidated in /tip)
export { justthetip } from './justthetip.js';

// Promo management commands (mod only)
export { submitpromo, approvepromo, denypromo, pendingpromos } from './promo.js';
export { setpromochannel } from './setpromochannel.js';

// Blocklist management commands (mod only)
export { blockdomain, unblockdomain } from './blocklist.js';

