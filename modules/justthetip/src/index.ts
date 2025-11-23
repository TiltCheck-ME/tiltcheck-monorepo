/**
 * JustTheTip - Non-Custodial Solana Tipping Module
 * 
 * Features:
 * - External wallet registration (Phantom, Solflare, etc)
 * - Solana Pay QR code signing
 * - Direct wallet-to-wallet transfers
 * - Multi-send airdrops
 * - Flat $0.07 fee (non-custodial)
 * - Pending tips for unregistered users
 */

export * from './wallet-manager.js';
export * from './tip-engine.js';
export * from './airdrop-engine.js';
export * from './justthetip-module.js';

export {
  registerExternalWallet,
  getWallet,
  getWalletBalance,
  hasWallet,
  removeWallet,
  clearWallets,
} from './wallet-manager.js';

export {
  executeTip,
  getPendingTips,
  processPendingTips,
} from './tip-engine.js';

export {
  executeAirdrop,
} from './airdrop-engine.js';

export {
  createTransferRequest,
  createTipWithFeeRequest,
  createTransactionRequest,
  createAirdropWithFeeRequest,
} from './solana-pay.js';

export {
  trackTransaction,
  cleanupPendingTransactions,
} from './transaction-monitor.js';

console.log('[JustTheTip] Module loaded - Non-custodial tipping ready');
