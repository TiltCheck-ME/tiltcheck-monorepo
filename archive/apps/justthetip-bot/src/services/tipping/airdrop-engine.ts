// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
/**
 * Airdrop Engine (Consolidated)
 * Bridge between bot airdrop commands and shared @tiltcheck/justthetip/solana.
 */

import { Keypair } from '@solana/web3.js';
import { executeAirdrop as sharedExecuteAirdrop, getWallet } from '@tiltcheck/justthetip';

export interface AirdropRequest {
  senderId: string;
  recipientIds: string[];
  amountPerUser: number;
  currency: 'SOL' | 'USD';
}

export interface AirdropResult {
  success: boolean;
  airdropId: string;
  signature?: string;
  totalAmount: number;
  recipientCount: number;
  fee: number;
  skippedRecipients: string[];
  error?: string;
}

/**
 * Execute airdrop to multiple recipients (Consolidated)
 */
export async function executeAirdrop(request: AirdropRequest, senderKeypair: Keypair): Promise<AirdropResult> {
  // Get sender wallet
  const senderWallet = await getWallet(request.senderId);
  if (!senderWallet) {
    return {
      success: false,
      airdropId: 'none',
      totalAmount: 0,
      recipientCount: 0,
      fee: 0,
      skippedRecipients: request.recipientIds,
      error: 'Sender wallet not found',
    };
  }

  // Filter recipients with registered wallets
  const validRecipients: Array<{ userId: string; address: string }> = [];
  const skippedRecipients: string[] = [];

  for (const recipientId of request.recipientIds) {
    const wallet = await getWallet(recipientId);
    if (wallet) {
      validRecipients.push({ userId: recipientId, address: wallet.address });
    } else {
      skippedRecipients.push(recipientId);
    }
  }

  if (validRecipients.length === 0) {
    return {
      success: false,
      airdropId: 'none',
      totalAmount: 0,
      recipientCount: 0,
      fee: 0,
      skippedRecipients,
      error: 'No recipients have registered wallets',
    };
  }

  // Call shared service
  const result = await sharedExecuteAirdrop({
    senderId: request.senderId,
    senderAddress: senderWallet.address,
    recipients: validRecipients,
    amountPerUser: request.amountPerUser,
    currency: request.currency,
    senderKeypair
  });

  return {
    success: result.success,
    airdropId: result.id,
    signature: result.signature,
    totalAmount: result.totalAmount || 0,
    recipientCount: result.recipientCount || 0,
    fee: result.fee || 0,
    skippedRecipients,
    error: result.error
  };
}
