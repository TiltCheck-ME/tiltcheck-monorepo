/**
 * Wallet Manager
 * Handles external Solana wallet registration (Phantom, Solflare, etc)
 * Signing handled via Solana Pay QR codes
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { eventRouter } from '@tiltcheck/event-router';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Persistence file path - use environment variable or default to data directory
// For production (Render, etc), set WALLET_DATA_PATH to a persistent volume path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_DIR = path.resolve(__dirname, '../../../data');
const WALLET_DATA_PATH = process.env.WALLET_DATA_PATH || path.join(
  process.env.DATA_DIR || DEFAULT_DATA_DIR,
  'justthetip-wallets.json'
);

export interface WalletInfo {
  userId: string;
  address: string;
  type: 'external';
  balance?: number; // SOL balance
  registeredAt: number;
}

interface WalletDataStore {
  version: string;
  lastUpdated: number;
  wallets: Record<string, WalletInfo>;
}

const wallets = new Map<string, WalletInfo>();

/**
 * Load wallets from persistent storage
 */
async function loadWallets(): Promise<void> {
  try {
    const data = await fs.readFile(WALLET_DATA_PATH, 'utf-8');
    const store: WalletDataStore = JSON.parse(data);
    
    for (const [userId, walletInfo] of Object.entries(store.wallets)) {
      wallets.set(userId, walletInfo);
    }
    
    console.log(`[JustTheTip] Loaded ${wallets.size} wallets from storage`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('[JustTheTip] No existing wallet data, starting fresh');
    } else {
      console.error('[JustTheTip] Failed to load wallets:', error);
    }
  }
}

/**
 * Save wallets to persistent storage
 */
async function saveWallets(): Promise<void> {
  try {
    const store: WalletDataStore = {
      version: '1.0.0',
      lastUpdated: Date.now(),
      wallets: Object.fromEntries(wallets),
    };
    
    // Ensure data directory exists
    await fs.mkdir(path.dirname(WALLET_DATA_PATH), { recursive: true });
    
    await fs.writeFile(WALLET_DATA_PATH, JSON.stringify(store, null, 2), 'utf-8');
    console.log(`[JustTheTip] Saved ${wallets.size} wallets to ${WALLET_DATA_PATH}`);
  } catch (error) {
    console.error('[JustTheTip] Failed to save wallets:', error);
  }
}

// Load wallets on module initialization
console.log(`[JustTheTip] Wallet data path: ${WALLET_DATA_PATH}`);
loadWallets().catch(console.error);

/**
 * Base58 charset validation regex (excludes 0, O, I, and l characters)
 * Compiled once for performance
 */
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;

/**
 * Validate Solana address format and length to prevent bigint-buffer vulnerability
 * (GHSA-3gc7-fjrx-p6mg) from processing malformed inputs.
 * 
 * @param address - The Solana address to validate
 * @throws Error if address is invalid
 */
function validateSolanaAddress(address: string): void {
  // Check for base58 charset (excludes 0, O, I, and l)
  if (!BASE58_REGEX.test(address)) {
    throw new Error('Invalid Solana address: must use base58 encoding (excludes 0, O, I, and l characters)');
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
export async function registerExternalWallet(userId: string, address: string): Promise<WalletInfo> {
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

  // Persist to disk
  await saveWallets();

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
export async function removeWallet(userId: string): Promise<boolean> {
  const deleted = wallets.delete(userId);
  
  if (deleted) {
    // Persist to disk
    await saveWallets();
  }
  
  return deleted;
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
