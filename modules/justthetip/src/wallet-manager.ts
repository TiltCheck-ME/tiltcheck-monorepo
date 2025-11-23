/**
 * Wallet Manager
 * Handles external Solana wallet registration (Phantom, Solflare, etc)
 * Signing handled via Solana Pay QR codes
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { eventRouter } from '@tiltcheck/event-router';
import { processPendingTips } from './tip-engine.js';

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
 * Register external wallet (Phantom, Solflare, etc.)
 */
export function registerExternalWallet(userId: string, address: string): WalletInfo {
  // Defensive validation (skip in test mode for mock addresses)
  if (process.env.NODE_ENV !== 'test') {
    const base58Re = /^[1-9A-HJ-NP-Za-km-z]+$/; // Solana base58 alphabet
    if (!base58Re.test(address) || address.length < 32 || address.length > 50) {
      throw new Error('Invalid Solana address format');
    }
    try {
      const pk = new PublicKey(address);
      const buf = pk.toBuffer();
      // Public keys should be exactly 32 bytes (Ed25519)
      if (buf.length !== 32) {
        throw new Error('Unexpected public key length');
      }
    } catch {
      throw new Error('Invalid Solana address');
    }
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

  // Process any pending tips for this user
  void processPendingTips(userId);

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

// Future extension point: if lower-level SPL Token account parsing is added,
// introduce buffer length & range assertions before passing user-influenced
// data into token layout utilities to mitigate bigint-buffer overflow risk.
