/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * JustTheTipModule - Class wrapper for testing
 * Provides a stateful interface to the functional tip engine
 */

import { v4 as uuidv4 } from 'uuid';
import { eventRouter } from '@tiltcheck/event-router';
import { registerExternalWallet, getWallet, hasWallet, removeWallet, clearWallets } from './wallet-manager.js';

export interface TipInitiated {
  id: string;
  senderId: string;
  recipientId: string;
  usdAmount: number;
  solAmount?: number;
  status: 'pending' | 'completed' | 'failed';
  reference: string;
  senderWallet?: string;
  recipientWallet?: string;
  createdAt: number;
}

export interface WalletRegistration {
  userId: string;
  address: string;
  type: 'x402' | 'magic' | 'phantom';
  registeredAt: number;
}

export interface DisconnectResult {
  success: boolean;
  message?: string;
  pendingTipsCount: number;
  wallet?: WalletRegistration;
}

export class JustTheTipModule {
  private pendingTips: Map<string, TipInitiated[]> = new Map();
  private allTips: Map<string, TipInitiated> = new Map();
  private minUsd = 0.10;
  private maxUsd = 100.00;

  async registerWallet(
    userId: string,
    address: string,
    type: 'x402' | 'magic' | 'phantom'
  ): Promise<WalletRegistration> {
    // Check if wallet already registered
    if (hasWallet(userId)) {
      throw new Error('❌ You already have a wallet registered');
    }

    await registerExternalWallet(userId, address);
    
    const registration: WalletRegistration = {
      userId,
      address,
      type,
      registeredAt: Date.now(),
    };

    void eventRouter.publish('wallet.registered', 'justthetip', registration);

    // Process pending tips for this user
    const pending = this.pendingTips.get(userId) || [];
    for (const tip of pending) {
      tip.recipientWallet = address;
      tip.status = 'completed';
    }
    if (pending.length > 0) {
      this.pendingTips.delete(userId);
      void eventRouter.publish('tip.pending.resolved', 'justthetip', { userId, count: pending.length });
    }

    return registration;
  }

  async disconnectWallet(userId: string): Promise<DisconnectResult> {
    const wallet = getWallet(userId);
    
    if (!wallet) {
      return {
        success: false,
        message: "❌ You don't have a wallet registered",
        pendingTipsCount: 0,
      };
    }

    // Count all pending tips involving this user (sent or received)
    const pendingCount = Array.from(this.allTips.values()).filter(
      tip => (tip.senderId === userId || tip.recipientId === userId) && tip.status === 'pending'
    ).length;
    
    const walletInfo: WalletRegistration = {
      userId: wallet.userId,
      address: wallet.address,
      type: 'phantom',
      registeredAt: wallet.registeredAt,
    };

    // Actually remove the wallet
    await removeWallet(userId);
    
    let message = '✅ Wallet disconnected successfully';
    if (pendingCount > 0) {
      message = `⚠️ Wallet disconnected. You have ${pendingCount} pending tip${pendingCount > 1 ? 's' : ''} that may be affected.`;
    }

    return {
      success: true,
      message,
      pendingTipsCount: pendingCount,
      wallet: walletInfo,
    };
  }

  hasWallet(userId: string): boolean {
    return hasWallet(userId);
  }

  getWallet(userId: string): WalletRegistration | undefined {
    const wallet = getWallet(userId);
    if (!wallet) return undefined;
    
    return {
      userId: wallet.userId,
      address: wallet.address,
      type: 'phantom',
      registeredAt: wallet.registeredAt,
    };
  }

  async initiateTip(
    senderId: string,
    recipientId: string,
    amount: number,
    currency: 'USD' | 'SOL' = 'USD'
  ): Promise<TipInitiated> {
    // Validate amount
    if (currency === 'USD') {
      if (amount < this.minUsd || amount > this.maxUsd) {
        throw new Error(`❌ Amount must be between $${this.minUsd.toFixed(2)} and $${this.maxUsd.toFixed(2)} USD`);
      }
    }

    // Check sender has wallet
    if (!hasWallet(senderId)) {
      throw new Error('❌ Please register your wallet first using `/register-magic`');
    }

    const senderWallet = getWallet(senderId);
    const recipientWallet = hasWallet(recipientId) ? getWallet(recipientId) : undefined;

    const tip: TipInitiated = {
      id: uuidv4(),
      senderId,
      recipientId,
      usdAmount: currency === 'USD' ? amount : 0,
      solAmount: currency === 'SOL' ? amount : undefined,
      status: 'pending',
      reference: uuidv4(),
      senderWallet: senderWallet?.address,
      recipientWallet: recipientWallet?.address,
      createdAt: Date.now(),
    };

    // If recipient has no wallet, store as pending
    if (!recipientWallet) {
      const existing = this.pendingTips.get(recipientId) || [];
      existing.push(tip);
      this.pendingTips.set(recipientId, existing);
    }

    void eventRouter.publish('tip.initiated', 'justthetip', tip);

    // Store tip
    this.allTips.set(tip.id, tip);

    return tip;
  }

  async completeTip(tipId: string, signature: string): Promise<TipInitiated & { completedAt: number }> {
    const tip = this.allTips.get(tipId);
    if (!tip) {
      throw new Error('Tip not found');
    }

    const completedTip = {
      ...tip,
      status: 'completed' as const,
      signature,
      completedAt: Date.now(),
    };

    this.allTips.set(tipId, completedTip);
    void eventRouter.publish('tip.completed', 'justthetip', completedTip);

    return completedTip;
  }

  getTipsForUser(userId: string): TipInitiated[] {
    return Array.from(this.allTips.values()).filter(
      tip => tip.senderId === userId || tip.recipientId === userId
    );
  }

  generateSolanaPayURL(
    recipientAddress: string,
    amount: number,
    reference: string,
    label?: string
  ): string {
    const params = new URLSearchParams({
      amount: amount.toString(),
      reference,
    });
    
    if (label) {
      params.set('label', label);
    }

    return `solana:${recipientAddress}?${params.toString()}`;
  }

  getPendingTipsForUser(userId: string): TipInitiated[] {
    return this.pendingTips.get(userId) || [];
  }

  async processPendingTips(userId: string): Promise<void> {
    const pending = this.pendingTips.get(userId) || [];
    for (const tip of pending) {
      tip.status = 'completed';
    }
    this.pendingTips.delete(userId);
  }

  clearState(): void {
    this.pendingTips.clear();
    this.allTips.clear();
    clearWallets();
  }
}
