/**
 * JustTheTip - Non-Custodial Solana Tipping Module
 * 
 * Features:
 * - Magic.link wallet registration
 * - Direct wallet-to-wallet transfers
 * - Multi-send airdrops
 * - Flat $0.07 fee (non-custodial)
 * - Pending tips for unregistered users
 */

export * from './wallet-manager.js';
export * from './tip-engine.js';
export * from './airdrop-engine.js';

export {
  registerMagicWallet,
  registerExternalWallet,
  getWallet,
  getWalletBalance,
  hasWallet,
} from './wallet-manager.js';

export {
  executeTip,
  getPendingTips,
  processPendingTips,
} from './tip-engine.js';

export {
  executeAirdrop,
} from './airdrop-engine.js';

console.log('[JustTheTip] Module loaded - Non-custodial tipping ready');
