/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * JustTheTip - Core Business Logic
 */

import { 
  findUserByDiscordId, 
  createTip, 
  findTipById, 
  updateTipStatus,
  getTipsBySender,
  getTipsByRecipient
} from '@tiltcheck/db';
import { DatabaseClient } from '@tiltcheck/database';
import { verifySolanaSignature } from '@tiltcheck/auth';
import { CreditService } from './credits.js';
import type { 
  VerifyTipParams, 
  CreateTipParams, 
  TipVerificationResult, 
  TipRecord 
} from './types.js';

/**
 * Verify a tipping request
 */
export async function verifyTipRequest(
  sender: { userId: string; discordId: string; walletAddress?: string },
  params: VerifyTipParams
): Promise<TipVerificationResult> {
  const { 
    recipientDiscordId, 
    amount, 
    currency, 
    signature, 
    message, 
    publicKey,
    disclaimerAccepted 
  } = params;
  
  // 0. Compliance Check: Ensure user has accepted disclaimers and fees ($0.07)
  if (!disclaimerAccepted) {
    return {
      valid: false,
      sender,
      recipient: { discordId: recipientDiscordId, isNewUser: true },
      amount,
      currency,
      error: 'You must explicitly accept the legal disclaimers and the transaction fee before proceeding.'
    };
  }

  // 1. Verify wallet signature if provided
  if (signature && message && publicKey) {
    const signatureResult = await verifySolanaSignature({ 
      message, 
      signature, 
      publicKey 
    });

    if (!signatureResult.valid) {
      return {
        valid: false,
        sender,
        recipient: { discordId: recipientDiscordId, isNewUser: true },
        amount,
        currency,
        error: `Invalid wallet signature: ${signatureResult.error}`
      };
    }

    // 2. Verify the public key matches the user's linked wallet if they have one
    if (sender.walletAddress && sender.walletAddress !== publicKey) {
      return {
        valid: false,
        sender,
        recipient: { discordId: recipientDiscordId, isNewUser: true },
        amount,
        currency,
        error: 'Wallet address mismatch'
      };
    }
  }

  // 3. Check if recipient exists in our system
  const recipient = await findUserByDiscordId(recipientDiscordId);

  return {
    valid: true,
    sender,
    recipient: recipient ? {
      userId: recipient.id,
      discordId: recipient.discord_id || recipientDiscordId, // Database might have discord_id as string | null
      walletAddress: recipient.wallet_address,
      isNewUser: false,
    } : {
      discordId: recipientDiscordId,
      walletAddress: null,
      isNewUser: true,
    },
    amount,
    currency,
  };
}

/**
 * Create a new tip record in the database
 */
export async function createNewTip(params: CreateTipParams): Promise<TipRecord | null> {
  const { senderId, recipientDiscordId, recipientWallet, amount, currency, message } = params;

  const tip = await createTip({
    sender_id: senderId,
    recipient_discord_id: recipientDiscordId,
    recipient_wallet: recipientWallet || undefined,
    amount,
    currency,
    message: message || undefined,
  });

  return tip as TipRecord | null;
}

/**
 * Complete a tip with a transaction signature
 */
export async function completeTipTransaction(
  tipId: string, 
  userId: string, 
  txSignature: string
): Promise<{ success: boolean; tip?: TipRecord; error?: string }> {
  const tip = await findTipById(tipId);

  if (!tip) {
    return { success: false, error: 'Tip not found' };
  }

  // Verify ownership
  if (tip.sender_id !== userId) {
    return { success: false, error: 'Not authorized' };
  }

  // Update status (The DB package expects TipStatus which might be union type)
  const updatedTip = await updateTipStatus(tipId, 'completed' as any, txSignature);

  if (!updatedTip) {
    return { success: false, error: 'Failed to update tip status' };
  }

  return { 
    success: true, 
    tip: updatedTip as TipRecord 
  };
}

/**
 * Handle pending tips for a user after they link a wallet
 */
export async function processPendingTips(discordId: string): Promise<void> {
  const result = await getTipsByRecipient(discordId, { limit: 100 });
  const tips = result.rows.filter(t => t.status === 'pending');
  if (tips.length === 0) return;

  const recipient = await findUserByDiscordId(discordId);
  if (!recipient?.wallet_address) return;

  for (const tip of tips) {
    // Logic for auto-settling or notifying
  }
}

/**
 * Get tip details
 */
export async function getTipDetails(tipId: string): Promise<TipRecord | null> {
  const tip = await findTipById(tipId);
  return tip as TipRecord | null;
}

/**
 * Get all tips for a user (sent or received)
 */
export async function getTipsForUser(discordId: string): Promise<TipRecord[]> {
  const senderTips = await getTipsBySender(discordId);
  const recipientTips = await getTipsByRecipient(discordId);
  
  // Combine and sort by date descending
  return [...senderTips.rows, ...recipientTips.rows]
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime()) as TipRecord[];
}

/**
 * Get pending tips for a user
 */
export async function getPendingTipsForUser(discordId: string): Promise<TipRecord[]> {
  const tips = await getTipsByRecipient(discordId);
  return tips.rows.filter(tip => tip.status === 'pending') as TipRecord[];
}

/**
 * Get user wallet info (mocked/simplified for now as seen in original code)
 */
export async function getWallet(discordId: string): Promise<{ address: string; type: string; registeredAt: string } | null> {
  const user = await findUserByDiscordId(discordId);
  if (!user || !user.wallet_address) return null;
  
  return {
    address: user.wallet_address,
    type: 'solana',
    registeredAt: user.created_at.toISOString()
  };
}

/**
 * Get transaction history (receipts)
 */
export async function getTransactionHistory(discordId: string): Promise<any[]> {
  const tips = await getTipsForUser(discordId);
  return tips.filter(tip => tip.status === 'completed').map(tip => ({
    id: tip.id,
    amount: tip.amount,
    currency: tip.currency,
    signature: tip.tx_signature,
    timestamp: tip.completed_at?.toISOString() || tip.created_at.toISOString()
  }));
}

/**
 * TippingService - Unified Service
 */
export class TippingService {
  public credits: CreditService;
  private db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
    this.credits = new CreditService(db);
  }

  // Core non-custodial methods wrap the existing functions if needed,
  // or we can just expose the functions and the credit service separately.
}
