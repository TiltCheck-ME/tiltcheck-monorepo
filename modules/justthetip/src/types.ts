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
