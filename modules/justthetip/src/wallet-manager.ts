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
 * Register external wallet (Phantom, Solflare, etc.)
 */
export function registerExternalWallet(userId: string, address: string): WalletInfo {
  // Validate Solana address
  try {
    new PublicKey(address);
  } catch {
    throw new Error('Invalid Solana address');
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
 * Get all registered wallets (for admin/debugging)
 */
export function getAllWallets(): Map<string, WalletInfo> {
  return new Map(wallets);
}
