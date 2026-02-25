/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Solana Agent Service
 * Handles all Solana blockchain interactions for JustTheTip
 * Non-custodial - users sign their own transactions
 */

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTransferRequest, createTipWithFeeRequest, createAirdropWithFeeRequest } from '@tiltcheck/justthetip';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export interface TipRequest {
  senderAddress: string;
  recipientAddress: string;
  amountSOL: number;
  label?: string;
}

export interface AirdropRequest {
  senderAddress: string;
  recipientAddresses: string[];
  amountPerRecipientSOL: number;
}

/**
 * Create a tip transaction request
 * Returns Solana Pay URL that user signs with their wallet
 */
export async function createTipTransaction(tipRequest: TipRequest): Promise<{ url: string; qrCode: string }> {
  return createTipWithFeeRequest(
    connection,
    tipRequest.senderAddress,
    tipRequest.recipientAddress,
    tipRequest.amountSOL,
    tipRequest.label
  );
}

/**
 * Create an airdrop transaction request
 * Returns Solana Pay URL for multi-recipient transfer
 */
export async function createAirdropTransaction(airdropRequest: AirdropRequest): Promise<{ url: string; qrCode: string; transaction: Transaction }> {
  return createAirdropWithFeeRequest(
    connection,
    airdropRequest.senderAddress,
    airdropRequest.recipientAddresses,
    airdropRequest.amountPerRecipientSOL
  );
}

/**
 * Get SOL balance for an address
 */
export async function getSolBalance(address: string): Promise<number> {
  try {
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('[SolanaAgent] Failed to get balance:', error);
    throw new Error('Failed to fetch SOL balance');
  }
}

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
 * Get transaction status
 */
export async function getTransactionStatus(signature: string): Promise<'confirmed' | 'failed' | 'pending'> {
  try {
    const status = await connection.getSignatureStatus(signature);
    if (!status || !status.value) {
      return 'pending';
    }

    if (status.value.err) {
      return 'failed';
    }

    return 'confirmed';
  } catch (error) {
    console.error('[SolanaAgent] Failed to get transaction status:', error);
    return 'pending';
  }
}

/**
 * Monitor transaction confirmation
 */
export async function waitForConfirmation(signature: string, timeoutMs: number = 30000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const status = await getTransactionStatus(signature);
    if (status === 'confirmed') {
      return true;
    }
    if (status === 'failed') {
      return false;
    }

    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return false; // Timeout
}
