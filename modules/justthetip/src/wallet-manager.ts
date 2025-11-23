/**
 * Wallet Manager
 * Handles external Solana wallet registration (Phantom, Solflare, etc)
 * Signing handled via Solana Pay QR codes
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { eventRouter } from '@tiltcheck/event-router';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export interface WalletInfo {
  userId: string;
  address: string;
  type: 'external';
  balance?: number; // SOL balance
  registeredAt: number;
}

const wallets = new Map<string, WalletInfo>();

/**
 * Validate Solana address format and length to prevent bigint-buffer vulnerability
 * (GHSA-3gc7-fjrx-p6mg) from processing malformed inputs.
 * 
 * @param address - The Solana address to validate
 * @throws Error if address is invalid
 */
function validateSolanaAddress(address: string): void {
  // Check for base58 charset (no 0, O, I, l)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (!base58Regex.test(address)) {
    throw new Error('Invalid Solana address: must use base58 encoding (no 0, O, I, or l characters)');
  }

  // Typical Solana address is 32-44 characters (base58 encoded 32 bytes)
  if (address.length < 32 || address.length > 44) {
    throw new Error('Invalid Solana address: incorrect length');
  }

  // Attempt to decode and verify it's exactly 32 bytes
  let publicKey: PublicKey;
  try {
    publicKey = new PublicKey(address);
  } catch {
    throw new Error('Invalid Solana address: failed to decode');
  }

  // Verify the decoded key is exactly 32 bytes (prevents buffer overflow)
  const keyBytes = publicKey.toBytes();
  if (keyBytes.length !== 32) {
    throw new Error('Invalid Solana address: must be exactly 32 bytes');
  }
}

/**
 * Register external wallet (Phantom, Solflare, etc.)
 */
export function registerExternalWallet(userId: string, address: string): WalletInfo {
  // Validate Solana address (skip in test mode for mock addresses)
  if (process.env.NODE_ENV !== 'test') {
    validateSolanaAddress(address);
  }

  const walletInfo: WalletInfo = {
    userId,
    address,
    type: 'external',
    registeredAt: Date.now(),
  };

  wallets.set(userId, walletInfo);

  // Emit event
  void eventRouter.publish('wallet.registered', 'justthetip', {
    userId,
    address,
    type: 'external',
  });

  console.log(`[JustTheTip] External wallet registered: ${userId} → ${address}`);

  return walletInfo;
}

/**
 * Get wallet for user
 */
export function getWallet(userId: string): WalletInfo | undefined {
  return wallets.get(userId);
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(userId: string): Promise<number> {
  const wallet = wallets.get(userId);
  if (!wallet) {
    throw new Error('Wallet not registered');
  }

  try {
    const publicKey = new PublicKey(wallet.address);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('[JustTheTip] Failed to get balance:', error);
    throw new Error('Failed to fetch wallet balance');
  }
}

/**
 * Check if user has wallet registered
 */
export function hasWallet(userId: string): boolean {
  return wallets.has(userId);
}

/**
 * Remove wallet for user
 */
export function removeWallet(userId: string): boolean {
  return wallets.delete(userId);
}

/**
 * Clear all wallets (for testing)
 */
export function clearWallets(): void {
  wallets.clear();
}

/**
 * Get all registered wallets (for admin/debugging)
 */
export function getAllWallets(): Map<string, WalletInfo> {
  return new Map(wallets);
}
