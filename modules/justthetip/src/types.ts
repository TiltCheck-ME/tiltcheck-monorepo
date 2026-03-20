/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * JustTheTip - Types
 */

import type { Tip } from '@tiltcheck/db';

export type TipStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'expired' | 'refunded';

// Use the Tip interface from @tiltcheck/db but allow for local extensions if needed
export type TipRecord = Tip;

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

// Credit System Types (Custodial)

export interface CreditBalance {
  discord_id: string;
  balance_lamports: number;
  wallet_address: string | null;
  last_activity_at: string;
  refund_mode: 'reset-on-activity' | 'hard-expiry';
  hard_expiry_at: string | null;
  inactivity_days: number;
  total_deposited_lamports: number;
  total_withdrawn_lamports: number;
  total_tipped_lamports: number;
  total_fees_lamports: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  discord_id: string;
  type: string;
  amount_lamports: number;
  balance_after_lamports: number;
  counterparty_id: string | null;
  on_chain_signature: string | null;
  memo: string | null;
  created_at: string;
}

export interface PendingCreditTip {
  id: string;
  sender_id: string;
  recipient_id: string;
  amount_lamports: number;
  fee_lamports: number;
  expires_at: string;
  status: 'pending' | 'claimed' | 'refunded' | 'expired';
  created_at: string;
}
