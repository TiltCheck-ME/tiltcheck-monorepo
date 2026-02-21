/**
 * Wallet utilities for JustTheTip web app
 * Handles wallet connection and transaction signing
 */

import { Magic } from 'magic-sdk';
import { SolanaExtension } from '@magic-ext/solana';
import { PublicKey } from '@solana/web3.js';

export interface WalletInfo {
  address: string;
  connected: boolean;
  balance?: number;
}

// Initialize Magic Link with Solana extension
const magic = new Magic(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY || '', {
  extensions: [
    new SolanaExtension({
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    }),
  ],
});

/**
 * Validate Solana address format
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format SOL amount for display
 */
export function formatSolAmount(amount: number): string {
  if (amount < 0.001) {
    return `${(amount * 1000000).toFixed(0)} μSOL`;
  }
  if (amount < 0.01) {
    return `${(amount * 1000).toFixed(1)} mSOL`;
  }
  return `${amount.toFixed(4)} SOL`;
}

/**
 * Generate a unique transaction ID
 */
export function generateTransactionId(): string {
  return `tip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if wallet is connected via Magic Link
 */
export async function isWalletConnected(): Promise<boolean> {
  try {
    const isLoggedIn = await magic.user.isLoggedIn();
    return isLoggedIn;
  } catch {
    return false;
  }
}

/**
 * Get connected wallet address via Magic Link
 */
export async function getConnectedWalletAddress(): Promise<string | null> {
  try {
    const metadata = await magic.user.getInfo();
    return metadata.wallets?.solana?.publicAddress || null;
  } catch {
    return null;
  }
}

/**
 * Connect wallet via Magic Link email
 */
export async function connectWallet(email: string): Promise<boolean> {
  try {
    await magic.auth.loginWithEmailOTP({ email });
    return true;
  } catch {
    return false;
  }
}

/**
 * Disconnect wallet
 */
export async function disconnectWallet(): Promise<void> {
  await magic.user.logout();
}
