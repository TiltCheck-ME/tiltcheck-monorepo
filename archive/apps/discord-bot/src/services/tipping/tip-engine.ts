/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Tip Engine (Consolidated)
 * Bridge between bot tipping commands and shared @tiltcheck/justthetip.
 */

import { Keypair } from '@solana/web3.js';
import { 
  executeDirectTip, 
  createNewTip, 
  getWallet, 
  processPendingTips as sharedProcessPendingTips 
} from '@tiltcheck/justthetip';

export interface TipRequest {
  senderId: string;
  recipientId: string;
  amount: number;
  currency: 'SOL' | 'USD';
  isAll?: boolean;
}

export interface TipResult {
  success: boolean;
  tipId: string;
  signature?: string;
  amount: number;
  fee: number;
  error?: string;
}

/**
 * Execute tip (Consolidated)
 */
export async function executeTip(request: TipRequest, senderKeypair: Keypair): Promise<TipResult> {
  // Get sender/recipient wallets
  const senderWallet = await getWallet(request.senderId);
  const recipientWallet = await getWallet(request.recipientId);

  if (!senderWallet) {
    return { success: false, tipId: 'none', amount: 0, fee: 0, error: 'Sender wallet not found' };
  }

  if (!recipientWallet) {
    // Record pending tip record in shared system instead of local Map
    const tipRecord = await createNewTip({
      senderId: request.senderId,
      recipientDiscordId: request.recipientId,
      amount: request.amount.toString(),
      currency: request.currency,
      message: 'Discord Tip (Pending)'
    });

    if (!tipRecord) {
      return { success: false, tipId: 'none', amount: 0, fee: 0, error: 'Failed to create pending tip record' };
    }

    return { 
      success: true, 
      tipId: tipRecord.id, 
      amount: request.amount, 
      fee: 0, 
      error: 'Recipient not registered - tip pending in shared store' 
    };
  }

  // Execute on-chain via shared Solana service
  const result = await executeDirectTip({
    senderId: request.senderId,
    senderAddress: senderWallet.address,
    recipientId: request.recipientId,
    recipientAddress: recipientWallet.address,
    amount: request.amount,
    currency: request.currency,
    senderKeypair
  });

  return {
    success: result.success,
    tipId: result.id,
    signature: result.signature,
    amount: result.amount,
    fee: result.fee,
    error: result.error
  };
}

/**
 * Get pending tips for user from shared system
 */
export async function getPendingTips(userId: string): Promise<any[]> {
    // Ported from what was in local Map, now use common store if needed, 
    // or keep local for some period.
    return []; // Placeholder for now - migration to DB pending tips
}

/**
 * Process pending tips (Consolidated)
 */
export async function processPendingTips(userId: string): Promise<void> {
    await sharedProcessPendingTips(userId);
}
