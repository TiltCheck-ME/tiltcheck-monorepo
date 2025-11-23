/**
 * JustTheTip Module
 * Provides a singleton interface for the JustTheTip tipping system
 */

import { eventRouter } from '@tiltcheck/event-router';
import { pricingOracle } from '@tiltcheck/pricing-oracle';
import { v4 as uuidv4 } from 'uuid';

// Wallet types supported
export type WalletType = 'x402' | 'magic' | 'phantom' | 'solflare' | 'other';

// Amount validation constants
const MIN_USD_AMOUNT = 0.10;
const MAX_USD_AMOUNT = 100.00;

interface Wallet {
  userId: string;
  address: string;
  type: WalletType;
  registeredAt: number;
}

interface Tip {
  id: string;
  senderId: string;
  recipientId: string;
  usdAmount: number;
  solAmount?: number;
  status: 'pending' | 'completed' | 'failed';
  reference: string;
  createdAt: number;
  completedAt?: number;
  signature?: string;
}

export class JustTheTipModule {
  private wallets: Map<string, Wallet> = new Map();
  private tips: Map<string, Tip> = new Map();
  private pendingTips: Map<string, string[]> = new Map(); // recipientId -> tipIds[]

  /**
   * Register a wallet for a user
   */
  async registerWallet(userId: string, address: string, type: WalletType): Promise<Wallet> {
    // Check for duplicate registration
    if (this.wallets.has(userId)) {
      throw new Error(`Wallet already registered for user ${userId}`);
    }

    const wallet: Wallet = {
      userId,
      address,
      type,
      registeredAt: Date.now(),
    };

    this.wallets.set(userId, wallet);

    // Emit wallet.registered event
    await eventRouter.publish('wallet.registered', 'justthetip', {
      userId,
      address,
      type,
    }, userId);

    // Process any pending tips for this user
    await this.processPendingTipsForUser(userId);

    return wallet;
  }

  /**
   * Disconnect a wallet
   */
  async disconnectWallet(userId: string): Promise<{ success: boolean; message?: string; pendingTipsCount?: number }> {
    const wallet = this.wallets.get(userId);
    if (!wallet) {
      return { success: false, message: 'No wallet registered for this user' };
    }

    // Check for pending tips where user is sender or recipient
    const pendingAsSender = Array.from(this.tips.values()).filter(
      tip => tip.senderId === userId && tip.status === 'pending'
    );
    const pendingAsRecipient = this.pendingTips.get(userId) || [];

    const totalPending = pendingAsSender.length + pendingAsRecipient.length;

    // Remove wallet
    this.wallets.delete(userId);

    // Emit wallet.disconnected event
    await eventRouter.publish('wallet.disconnected', 'justthetip', {
      userId,
      address: wallet.address,
      pendingTipsCount: totalPending,
    }, userId);

    return {
      success: true,
      pendingTipsCount: totalPending,
    };
  }

  /**
   * Check if user has a wallet registered
   */
  hasWallet(userId: string): boolean {
    return this.wallets.has(userId);
  }

  /**
   * Get wallet for a user
   */
  getWallet(userId: string): Wallet | undefined {
    return this.wallets.get(userId);
  }

  /**
   * Initiate a tip
   */
  async initiateTip(senderId: string, recipientId: string, amount: number, currency: 'USD' | 'SOL' = 'USD'): Promise<Tip> {
    // Validate sender has wallet
    const senderWallet = this.wallets.get(senderId);
    if (!senderWallet) {
      throw new Error('Sender must have a registered wallet');
    }

    // Validate amount
    if (currency === 'USD') {
      if (amount < MIN_USD_AMOUNT || amount > MAX_USD_AMOUNT) {
        throw new Error(`USD amount must be between $${MIN_USD_AMOUNT} and $${MAX_USD_AMOUNT}`);
      }
    }

    // Convert USD to SOL if needed
    let solAmount: number | undefined;
    if (currency === 'USD') {
      const solPrice = pricingOracle.getUsdPrice('SOL');
      solAmount = amount / solPrice;
    } else {
      solAmount = amount;
    }

    // Create tip
    const tip: Tip = {
      id: uuidv4(),
      senderId,
      recipientId,
      usdAmount: currency === 'USD' ? amount : amount * pricingOracle.getUsdPrice('SOL'),
      solAmount,
      status: 'pending',
      reference: uuidv4(),
      createdAt: Date.now(),
    };

    this.tips.set(tip.id, tip);

    // Check if recipient has wallet
    const recipientWallet = this.wallets.get(recipientId);
    if (!recipientWallet) {
      // Store as pending tip
      const pendingList = this.pendingTips.get(recipientId) || [];
      pendingList.push(tip.id);
      this.pendingTips.set(recipientId, pendingList);
    }

    // Emit tip.initiated event
    await eventRouter.publish('tip.initiated', 'justthetip', {
      tipId: tip.id,
      senderId,
      recipientId,
      usdAmount: tip.usdAmount,
      solAmount: tip.solAmount,
      reference: tip.reference,
    }, senderId);

    return tip;
  }

  /**
   * Complete a tip with transaction signature
   */
  async completeTip(tipId: string, signature: string): Promise<Tip> {
    const tip = this.tips.get(tipId);
    if (!tip) {
      throw new Error('Tip not found');
    }

    if (tip.status === 'completed') {
      throw new Error('Tip already completed');
    }

    tip.status = 'completed';
    tip.signature = signature;
    tip.completedAt = Date.now();

    // Emit tip.completed event
    await eventRouter.publish('tip.completed', 'justthetip', {
      tipId: tip.id,
      senderId: tip.senderId,
      recipientId: tip.recipientId,
      usdAmount: tip.usdAmount,
      solAmount: tip.solAmount,
      signature,
    }, tip.senderId);

    // Emit trust events for sender and recipient
    await eventRouter.publish('trust.casino.updated', 'justthetip', {
      delta: 1,
      metadata: { userId: tip.senderId, action: 'tip_sent' },
    });

    await eventRouter.publish('trust.casino.updated', 'justthetip', {
      delta: 2,
      metadata: { userId: tip.recipientId, action: 'tip_received' },
    });

    return tip;
  }

  /**
   * Get tips for a user (sent and received)
   */
  getTipsForUser(userId: string): Tip[] {
    return Array.from(this.tips.values()).filter(
      tip => tip.senderId === userId || tip.recipientId === userId
    );
  }

  /**
   * Get pending tips for a user
   */
  getPendingTipsForUser(userId: string): Tip[] {
    const pendingTipIds = this.pendingTips.get(userId) || [];
    return pendingTipIds
      .map(id => this.tips.get(id))
      .filter((tip): tip is Tip => tip !== undefined);
  }

  /**
   * Generate Solana Pay URL
   */
  generateSolanaPayURL(recipientAddress: string, solAmount: number, reference: string, label?: string): string {
    const params = new URLSearchParams({
      amount: solAmount.toString(),
      reference,
    });
    
    if (label) {
      params.append('label', label);
    }

    return `solana:${recipientAddress}?${params.toString()}`;
  }

  /**
   * Initiate a token-based tip (with swap)
   */
  async initiateTokenTip(senderId: string, recipientId: string, amount: number, token: string) {
    // Stub implementation for token swap
    const quote = {
      inputToken: token,
      outputToken: 'SOL',
      inputAmount: amount,
      outputAmount: amount * 0.99, // Simulated conversion
      slippageBps: 50,
      platformFeeBps: 70,
      minOutputAmount: amount * 0.98,
    };

    const tip = await this.initiateTip(senderId, recipientId, quote.outputAmount, 'SOL');

    await eventRouter.publish('swap.quote', 'justthetip', {
      tipId: tip.id,
      quote,
    });

    return { tip, quote };
  }

  /**
   * Process pending tips when a user registers a wallet
   */
  private async processPendingTipsForUser(userId: string): Promise<void> {
    const pendingTipIds = this.pendingTips.get(userId) || [];
    
    for (const tipId of pendingTipIds) {
      const tip = this.tips.get(tipId);
      if (tip) {
        await eventRouter.publish('tip.pending.resolved', 'justthetip', {
          tipId: tip.id,
          recipientId: userId,
        }, userId);
      }
    }

    // Clear pending tips for this user
    this.pendingTips.delete(userId);
  }
}

// Export singleton instance
export const justthetip = new JustTheTipModule();
