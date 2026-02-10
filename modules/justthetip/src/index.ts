/**
 * JustTheTip - Non-Custodial Solana Tipping Module
 * 
 * Features:
 * - External wallet registration (Phantom, Solflare, etc)
 * - Solana Pay QR code signing
 * - Direct wallet-to-wallet transfers
 * - Multi-send airdrops
 * - Prize distribution for trivia/games
 * - Token swaps via Jupiter aggregator
 * - Native LTC deposits with auto-swap to Solana tokens
 * - Flat $0.07 fee (non-custodial)
 * - Pending tips for unregistered users
 */

// Export module singleton and class (primary interface)
export { JustTheTipModule, justthetip } from './module.js';
export { walletService, WalletService } from './wallet-service.js';
export type { UserWallet, TransactionRequest, WalletProvider, TransactionStatus } from './wallet-service.js';

// Export low-level functions for advanced usage
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

// Prize distribution exports
export {
  createPrizeDistribution,
  monitorPrizeDistribution,
  getPrizeDistribution,
  getHostDistributions,
  getDistributionLogs,
  isAdmin,
  cleanupExpiredDistributions,
  clearPrizeDistributions,
} from './prize-distribution.js';
export type { PrizeDistribution, TransactionLog } from './prize-distribution.js';

// Swap engine exports (Jupiter integration)
export {
  getSwapQuote,
  createSwapTransaction,
  getTokenMint,
  getTokenInfo,
  isTokenSupported,
  getSupportedTokens,
  formatSwapQuote,
  getTokenPriceUsd,
  SUPPORTED_TOKENS,
} from './swap-engine.js';
export type { SwapQuoteResult, SwapExecutionResult } from './swap-engine.js';

// LTC Bridge exports (Native LTC to Solana tokens)
export {
  getLtcSwapQuote,
  createLtcDepositAddress,
  getLtcDepositStatus,
  getUserPendingDeposits,
  formatLtcDepositInstructions,
  getSupportedLtcOutputs,
  LTC_SWAP_OUTPUTS,
} from './ltc-bridge.js';
export type { LtcDepositRequest, LtcSwapQuote, LtcDepositStatus, LtcOutputToken } from './ltc-bridge.js';

console.log('[JustTheTip] Module loaded - Non-custodial tipping ready');
