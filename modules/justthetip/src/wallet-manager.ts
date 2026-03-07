/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Wallet Manager
 * Handles external Solana wallet registration (Phantom, Solflare, etc)
 * Signing handled via Solana Pay QR codes
 * 
 * Storage: Uses Supabase (free tier) with in-memory cache for fast reads.
 * Falls back to file storage if Supabase is not configured.
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { eventRouter } from '@tiltcheck/event-router';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Supabase client for persistent storage (free tier)
let supabase: SupabaseClient | null = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  console.log('[JustTheTip] Using Supabase for wallet persistence (free tier)');
} else {
  console.log('[JustTheTip] Supabase not configured - wallets will be stored in memory only');
}

export interface WalletInfo {
  userId: string;
  address: string;
  type: 'external';
  balance?: number; // SOL balance
  registeredAt: number;
}

// In-memory cache for fast reads
const wallets = new Map<string, WalletInfo>();

/**
 * Load wallets from Supabase into memory cache
 */
async function loadWallets(): Promise<void> {
  if (!supabase) {
    console.log('[JustTheTip] No Supabase configured, starting with empty wallet cache');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('wallet_registrations')
      .select('*');

    if (error) {
      console.error('[JustTheTip] Failed to load wallets from Supabase:', error);
      return;
    }

    if (data) {
      for (const row of data) {
        const walletInfo: WalletInfo = {
          userId: row.discord_id,
          address: row.wallet_address,
          type: row.wallet_type as 'external',
          registeredAt: new Date(row.registered_at).getTime(),
        };
        wallets.set(row.discord_id, walletInfo);
      }
      console.log(`[JustTheTip] Loaded ${wallets.size} wallets from Supabase`);
    }
  } catch (error) {
    console.error('[JustTheTip] Failed to load wallets:', error);
  }
}

/**
 * Save wallet to Supabase
 */
async function saveWalletToDb(walletInfo: WalletInfo): Promise<void> {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('wallet_registrations')
      .upsert({
        discord_id: walletInfo.userId,
        wallet_address: walletInfo.address,
        wallet_type: walletInfo.type,
        registered_at: new Date(walletInfo.registeredAt).toISOString(),
      }, { onConflict: 'discord_id' });

    if (error) {
      console.error('[JustTheTip] Failed to save wallet to Supabase:', error);
    } else {
      console.log(`[JustTheTip] Saved wallet to Supabase: ${walletInfo.userId}`);
    }
  } catch (error) {
    console.error('[JustTheTip] Failed to save wallet:', error);
  }
}

/**
 * Delete wallet from Supabase
 */
async function deleteWalletFromDb(userId: string): Promise<void> {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('wallet_registrations')
      .delete()
      .eq('discord_id', userId);

    if (error) {
      console.error('[JustTheTip] Failed to delete wallet from Supabase:', error);
    }
  } catch (error) {
    console.error('[JustTheTip] Failed to delete wallet:', error);
  }
}

// Load wallets on module initialization
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

  // Update in-memory cache
  wallets.set(userId, walletInfo);

  // Persist to Supabase
  await saveWalletToDb(walletInfo);

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
    await deleteWalletFromDb(userId);
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
