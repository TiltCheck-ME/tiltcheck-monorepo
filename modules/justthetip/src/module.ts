/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * JustTheTip Module
 * Provides a singleton interface for the JustTheTip tipping system
 */

import { eventRouter } from '@tiltcheck/event-router';
import { getUsdPriceSync } from '@tiltcheck/utils';
import { randomUUID } from 'crypto';
import type { TiltCheckEvent } from '@tiltcheck/types';
import { getSolscanUrl } from './utils.js';
import { removeWallet } from './wallet-manager.js';

// Wallet types supported
export type WalletType = 'x402' | 'magic' | 'phantom' | 'solflare' | 'other';

// Amount validation constants
const MIN_USD_AMOUNT = 0.10;
const MAX_USD_AMOUNT = 100.00;

// Fee configuration (basis points)
const PLATFORM_FEE_BPS = 70; // 0.7% platform fee

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
  recipientWallet?: string;
  usdAmount: number;
  solAmount?: number;
  status: 'pending' | 'completed' | 'failed';
  reference: string;
  createdAt: number;
  completedAt?: number;
  signature?: string;
  explorerUrl?: string; // Solscan link for transaction receipt
}

export class JustTheTipModule {
  private wallets: Map<string, Wallet> = new Map();
  private tips: Map<string, Tip> = new Map();

  constructor() {
    this.setupEventSubscriptions();
    this.initializeSystemWallets().catch(console.error);
  }

  private setupEventSubscriptions(): void {
    // Listen for tip send requests from other modules
    eventRouter.subscribe(
      'tip.requested',
      async (event: TiltCheckEvent) => {
        const { senderId, recipientId, amount, currency } = event.data as any;
        try {
          await this.initiateTip(senderId, recipientId, amount, currency || 'USD');
          console.log(`[JustTheTip] Processed tip.requested event: ${senderId} -> ${recipientId} (${amount} ${currency || 'USD'})`);
        } catch (error) {
          console.error(`[JustTheTip] Failed to process tip.requested event:`, error);
        }
      },
      'justthetip'
    );
  }

  /**
   * Initialize system-owned wallets (Treasury, etc.)
   */
  private async initializeSystemWallets(): Promise<void> {
    // Register the platform treasury wallet if not already present
    if (!this.wallets.has('TREASURY')) {
      const treasuryAddress = process.env.TREASURY_WALLET_PUBLIC || 'TREAS1111111111111111111111111111111111111111';
      await this.registerWallet('TREASURY', treasuryAddress, 'other');
      console.log(`[JustTheTip] System treasury wallet initialized: ${treasuryAddress}`);
    }
  }

  /**
   * Register or update a wallet for a user (upsert — adding or replacing is allowed).
   */
  async registerWallet(userId: string, address: string, type: WalletType): Promise<Wallet> {
    const isUpdate = this.wallets.has(userId);

    const wallet: Wallet = {
      userId,
      address,
      type,
      registeredAt: Date.now(),
    };

    this.wallets.set(userId, wallet);

    // Emit appropriate event
    await eventRouter.publish(
      isUpdate ? 'wallet.updated' : 'wallet.registered',
      'justthetip',
      { userId, address, type },
      userId
    );

    if (isUpdate) {
      console.log(`[JustTheTip] Wallet updated for ${userId}: ${address}`);
    }

    return wallet;
  }

  /**
   * Disconnect a wallet — removes from memory and persists removal to Supabase.
   */
  async disconnectWallet(userId: string): Promise<{ success: boolean; message?: string; wallet?: Wallet }> {
    const wallet = this.wallets.get(userId);
    if (!wallet) {
      return { success: false, message: "You don't have a wallet registered" };
    }

    // Remove from in-memory map
    this.wallets.delete(userId);

    // Persist removal to Supabase via wallet-manager
    try {
      await removeWallet(userId);
    } catch (err) {
      console.error('[JustTheTip] Failed to persist wallet removal to Supabase:', err);
      // Non-fatal — in-memory removal already done
    }

    await eventRouter.publish('wallet.disconnected', 'justthetip', {
      userId,
      address: wallet.address,
    }, userId);

    return { success: true, wallet };
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
      throw new Error('❌ Please register your wallet first using `/register-magic`');
    }

    const solPrice = getUsdPriceSync('SOL');
    if (!solPrice || solPrice <= 0) {
      throw new Error('❌ Unable to get current SOL price. Please try again later.');
    }

    // Convert and validate amount
    let solAmount: number;
    let usdAmount: number;
    
    if (currency === 'USD') {
      usdAmount = amount;
      solAmount = amount / solPrice;
    } else {
      solAmount = amount;
      usdAmount = amount * solPrice;
    }

    if (usdAmount < MIN_USD_AMOUNT || usdAmount > MAX_USD_AMOUNT) {
      throw new Error(`❌ Amount must be between $${MIN_USD_AMOUNT.toFixed(2)} and $${MAX_USD_AMOUNT.toFixed(2)} USD`);
    }

    // Create tip
    const tip: Tip = {
      id: randomUUID(),
      senderId,
      recipientId,
      usdAmount,
      solAmount,
      status: 'pending',
      reference: randomUUID(),
      createdAt: Date.now(),
    };

    this.tips.set(tip.id, tip);

    // Check if recipient has wallet
    const recipientWallet = this.wallets.get(recipientId);
    if (recipientWallet) {
      // Auto-assign recipient wallet if already registered
      tip.recipientWallet = recipientWallet.address;
    } else {
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
    tip.explorerUrl = getSolscanUrl(signature);

    // Emit tip.completed event with receipt info
    await eventRouter.publish('tip.completed', 'justthetip', {
      tipId: tip.id,
      senderId: tip.senderId,
      recipientId: tip.recipientId,
      usdAmount: tip.usdAmount,
      solAmount: tip.solAmount,
      signature,
      explorerUrl: tip.explorerUrl,
      receipt: {
        transactionHash: signature,
        explorerUrl: tip.explorerUrl,
        timestamp: tip.completedAt,
        amount: tip.usdAmount,
        currency: 'USD',
      },
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

    // Emit degen trust events for sender and recipient
    await eventRouter.publish('trust.degen.updated', 'justthetip', {
      userId: tip.senderId,
      delta: 1,
      action: 'tip_sent',
    });

    await eventRouter.publish('trust.degen.updated', 'justthetip', {
      userId: tip.recipientId,
      delta: 2,
      action: 'tip_received',
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
   * Get completed transaction history for a user with receipts
   * Returns tips sorted by completion date (most recent first)
   */
  getTransactionHistory(userId: string): Array<{
    tipId: string;
    type: 'sent' | 'received';
    amount: number;
    currency: string;
    otherParty: string;
    status: string;
    completedAt?: number;
    signature?: string;
    explorerUrl?: string;
  }> {
    const userTips = this.getTipsForUser(userId);
    
    return userTips
      .filter(tip => tip.status === 'completed')
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      .map(tip => ({
        tipId: tip.id,
        type: tip.senderId === userId ? 'sent' : 'received',
        amount: tip.usdAmount,
        currency: 'USD',
        otherParty: tip.senderId === userId ? tip.recipientId : tip.senderId,
        status: tip.status,
        completedAt: tip.completedAt,
        signature: tip.signature,
        explorerUrl: tip.explorerUrl,
      }));
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
    // Get token price from oracle
    const tokenPrice = getUsdPriceSync(token);
    const solPrice = getUsdPriceSync('SOL');
    if (!tokenPrice || tokenPrice <= 0 || !solPrice || solPrice <= 0) {
      throw new Error('❌ Unable to fetch token prices. Please try again later.');
    }
    
    // Calculate USD value of input token
    const usdValue = amount * tokenPrice;
    
    // Calculate SOL amount from USD value
    const solAmount = usdValue / solPrice;
    
    // Apply platform fee
    const outputAmount = solAmount * (1 - PLATFORM_FEE_BPS / 10000);
    
    const quote = {
      inputToken: token,
      outputToken: 'SOL',
      inputAmount: amount,
      outputAmount: outputAmount,
      slippageBps: 50,
      platformFeeBps: PLATFORM_FEE_BPS,
      minOutputAmount: outputAmount * 0.98,
    };

    const tip = await this.initiateTip(senderId, recipientId, outputAmount, 'SOL');

    await eventRouter.publish('swap.quote', 'justthetip', {
      tipId: tip.id,
      quote,
    });

    return { tip, quote };
  }

  /**
   * Clear all state (for testing)
   */
  clearState(): void {
    this.wallets.clear();
    this.tips.clear();
  }
}

// Export singleton instance
export const justthetip = new JustTheTipModule();
