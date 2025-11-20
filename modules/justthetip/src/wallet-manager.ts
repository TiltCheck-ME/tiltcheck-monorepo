/**
 * Wallet Manager
 * Handles Magic.link wallet creation and management
 */

import { Magic } from '@magic-sdk/admin';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { eventRouter } from '@tiltcheck/event-router';

const MAGIC_SECRET_KEY = process.env.MAGIC_SECRET_KEY || '';
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

const magic = MAGIC_SECRET_KEY ? new Magic(MAGIC_SECRET_KEY) : null;
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export interface WalletInfo {
  userId: string;
  address: string;
  type: 'magic' | 'external';
  balance?: number; // SOL balance
  registeredAt: number;
}

const wallets = new Map<string, WalletInfo>();

/**
 * Register Magic.link wallet for Discord user
 */
export async function registerMagicWallet(userId: string, magicDID: string): Promise<WalletInfo> {
  if (!magic) {
    throw new Error('Magic.link not configured - set MAGIC_SECRET_KEY env var');
  }

  try {
    // Validate DID token
    await magic.token.validate(magicDID);
    
    // Get user metadata (includes Solana public key)
    const metadata = await magic.users.getMetadataByToken(magicDID);
    
    if (!metadata.publicAddress) {
      throw new Error('No Solana public key found in Magic metadata');
    }

    const walletInfo: WalletInfo = {
      userId,
      address: metadata.publicAddress,
      type: 'magic',
      registeredAt: Date.now(),
    };

    wallets.set(userId, walletInfo);

    // Emit event
    void eventRouter.publish('wallet.registered', 'justthetip', {
      userId,
      address: metadata.publicAddress,
      type: 'magic',
    });

    console.log(`[JustTheTip] Magic wallet registered: ${userId} → ${metadata.publicAddress}`);

    return walletInfo;
  } catch (error) {
    console.error('[JustTheTip] Magic wallet registration failed:', error);
    throw new Error('Failed to register Magic wallet');
  }
}

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
