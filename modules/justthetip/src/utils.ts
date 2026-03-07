/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Shared utility functions for JustTheTip module
 */

// Solana network for explorer URLs
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'mainnet-beta';

/**
 * Generate Solscan explorer URL for a transaction
 * @param signature - The transaction signature
 * @param cluster - Solana cluster (mainnet-beta, devnet, testnet)
 * @returns Solscan URL for the transaction
 */
export function getSolscanUrl(signature: string, cluster: string = SOLANA_NETWORK): string {
  const baseUrl = 'https://solscan.io/tx/';
  if (cluster === 'mainnet-beta') {
    return `${baseUrl}${signature}`;
  }
  return `${baseUrl}${signature}?cluster=${cluster}`;
}
