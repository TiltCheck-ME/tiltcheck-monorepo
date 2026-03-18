/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * JustTheTip - Types
 */

export type TipStatus = 'pending' | 'completed' | 'failed' | 'expired' | 'refunded';

export interface TipRecord {
  id: string;
  sender_id: string;
  recipient_discord_id: string;
  recipient_wallet: string | null;
  amount: string;
  currency: string;
  message: string | null;
  status: TipStatus;
  tx_signature: string | null;
  created_at: string;
}

export interface VerifyTipParams {
  recipientDiscordId: string;
  amount: string;
  currency: string;
  publicKey?: string;
  signature?: string;
  message?: string;
}

export interface CreateTipParams {
  senderId: string;
  recipientDiscordId: string;
  recipientWallet?: string;
  amount: string;
  currency: string;
  message?: string;
}

export interface TipVerificationResult {
  valid: boolean;
  sender: {
    userId: string;
    discordId: string;
    walletAddress?: string;
  };
  recipient: {
    userId?: string;
    discordId: string;
    walletAddress?: string | null;
    isNewUser: boolean;
  };
  amount: string;
  currency: string;
  error?: string;
}
