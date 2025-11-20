import { eventRouter } from '@tiltcheck/event-router';
import { pricingOracle } from '@tiltcheck/pricing-oracle';
import type { TiltCheckEvent } from '@tiltcheck/types';
import crypto from 'crypto';
import { swapDefaults } from './config';
import { computeSeverity } from '@tiltcheck/config';
import type { TrustCasinoUpdateEvent, TrustDegenUpdateEvent } from '@tiltcheck/types';
import fs from 'fs';
import path from 'path';

/**
 * JustTheTip - Solana P2P Tipping Module
 * Migrated from https://github.com/jmenichole/Justthetip
 * 
 * Features:
 * - Solana Pay P2P transfers (non-custodial via x402 Trustless Agent)
 * - USD to SOL conversion with real-time pricing
 * - Wallet registration (x402, Magic Link, Phantom, etc.)
 * - Pending tips for unregistered users
 * - Transaction tracking with signatures
 * - Min $0.10, Max $100.00 per tip
 */

interface TipSubmission {
  id: string;
  senderId: string;
  recipientId: string;
  senderWallet: string;
  recipientWallet?: string;
  usdAmount: number;
  solAmount: number;
  solPrice: number;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  signature?: string;
  // Cross-token tipping metadata (if a swap was used)
  originalMint?: string; // Input token mint when not tipping in SOL directly
  originalAmount?: number; // Original token amount
  swapRate?: number; // SOL per input token
}

interface WalletInfo {
  userId: string;
  address: string;
  type: 'x402' | 'magic' | 'phantom' | 'solflare' | 'other';
  registeredAt: number;
}

export class JustTheTipModule {
  private tips: Map<string, TipSubmission> = new Map();
  private wallets: Map<string, WalletInfo> = new Map();
  private pendingTips: Map<string, TipSubmission[]> = new Map(); // recipientId -> tips[]
  // Simple in-memory quote cache
  private swapQuotes: Map<string, any> = new Map();
  // Basic in-memory reputation/trust scores (0-100) for users within JustTheTip context
  private userScores: Map<string, number> = new Map();
  private lastSnapshotWrite = 0;
  private static SNAPSHOT_INTERVAL_MS = 30_000;
  private static SNAPSHOT_DIR = path.join(process.cwd(), 'data');
  private static SNAPSHOT_FILE = path.join(JustTheTipModule.SNAPSHOT_DIR, 'justthetip-user-trust.json');

  constructor() {
    eventRouter.subscribe('tip.initiated', this.onTipInitiated.bind(this), 'justthetip');
    eventRouter.subscribe('wallet.registered', this.onWalletRegistered.bind(this), 'justthetip');
  }

  /**
   * Initiate a tip from one user to another
   * @param fromUserId Discord user ID of sender
   * @param toUserId Discord user ID of recipient
   * @param amount Amount in USD ($0.10 - $100.00)
   * @param currency Currency code (currently only 'USD' supported)
   */
  async initiateTip(fromUserId: string, toUserId: string, amount: number, currency: string = 'USD') {
    void currency; // Silence TS6133 (placeholder for future multi-currency support)
    // Validate amount range
    if (amount < 0.10 || amount > 100.00) {
      throw new Error('❌ Amount must be between $0.10 and $100.00 USD');
    }

    // Check sender has wallet
    const senderWallet = this.wallets.get(fromUserId);
    if (!senderWallet) {
      throw new Error('❌ Please register your wallet first using `/register-magic`');
    }

    // Get SOL price from oracle
    const solPrice = pricingOracle.getUsdPrice('SOL');
    const solAmount = amount / solPrice;

    // Generate unique reference for tracking
    const reference = crypto.randomUUID();

    const tip: TipSubmission = {
      id: crypto.randomUUID(),
      senderId: fromUserId,
      recipientId: toUserId,
      senderWallet: senderWallet.address,
      usdAmount: amount,
      solAmount,
      solPrice,
      reference,
      status: 'pending',
      createdAt: Date.now()
    };

    // Check if recipient has wallet
    const recipientWallet = this.wallets.get(toUserId);
    if (recipientWallet) {
      tip.recipientWallet = recipientWallet.address;
    } else {
      // Store as pending tip
      if (!this.pendingTips.has(toUserId)) {
        this.pendingTips.set(toUserId, []);
      }
      this.pendingTips.get(toUserId)!.push(tip);
    }

    this.tips.set(tip.id, tip);

    await eventRouter.publish('tip.initiated', 'justthetip', tip, fromUserId);

    return tip;
  }

  /**
   * Initiate a token-based tip that requires swapping to SOL first.
   * This simulates a Jupiter quote and uses a stubbed rate map.
   * @param fromUserId Sender user ID
   * @param toUserId Recipient user ID
   * @param inputAmount Amount of input token (natural simplified units)
   * @param inputMint Token symbol or mint (e.g. 'USDC', 'BONK')
   * @param opts Optional swap parameters { slippageBps, platformFeeBps, networkFeeLamports }
   */
  async initiateTokenTip(
    fromUserId: string,
    toUserId: string,
    inputAmount: number,
    inputMint: string,
    opts: { slippageBps?: number; platformFeeBps?: number; networkFeeLamports?: number } = {}
  ) {
    const senderWallet = this.wallets.get(fromUserId);
    if (!senderWallet) {
      throw new Error('❌ Please register your wallet first using `/register-magic`');
    }

    // Obtain prices
    let inputPriceUSD: number;
    try {
      inputPriceUSD = pricingOracle.getUsdPrice(inputMint);
    } catch {
      throw new Error(`Unsupported token for tipping: ${inputMint}`);
    }
    const solPrice = pricingOracle.getUsdPrice('SOL');

    // Convert input token to USD then enforce min/max USD constraints
    const usdAmount = inputAmount * inputPriceUSD;
    if (usdAmount < 0.10 || usdAmount > 100.00) {
      throw new Error('❌ USD equivalent must be between $0.10 and $100.00');
    }

    // Perform quote (swap to SOL)
    const estimatedSol = usdAmount / solPrice;
    const rate = estimatedSol / inputAmount; // SOL per input token

    // Hardened quote fields
    const slippageBps = opts.slippageBps ?? swapDefaults.slippageBps;
    const platformFeeBps = opts.platformFeeBps ?? swapDefaults.platformFeeBps;
    const networkFeeLamports = opts.networkFeeLamports ?? swapDefaults.networkFeeLamports;
    const minOutputAmount = estimatedSol * (1 - slippageBps / 10_000);
    const platformFeeInSol = estimatedSol * (platformFeeBps / 10_000);
    const networkFeeInSol = networkFeeLamports / 1_000_000_000;
    const finalOutputAfterFees = estimatedSol - platformFeeInSol - networkFeeInSol;

    const quoteId = crypto.randomUUID();
    const quote = {
      id: quoteId,
      userId: fromUserId,
      inputMint,
      outputMint: 'SOL',
      inputAmount,
      estimatedOutputAmount: estimatedSol,
      rate,
      slippageBps,
      minOutputAmount,
      platformFeeBps,
      networkFeeLamports,
      finalOutputAfterFees,
      generatedAt: Date.now(),
    };
    this.swapQuotes.set(quoteId, quote);
    await eventRouter.publish('swap.quote', 'justthetip', quote, fromUserId);

    // Build tip with swap metadata
    const reference = crypto.randomUUID();
    const tip: TipSubmission = {
      id: crypto.randomUUID(),
      senderId: fromUserId,
      recipientId: toUserId,
      senderWallet: senderWallet.address,
      usdAmount,
      solAmount: estimatedSol,
      solPrice,
      reference,
      status: 'pending',
      createdAt: Date.now(),
      originalMint: inputMint,
      originalAmount: inputAmount,
      swapRate: rate,
    };

    const recipientWallet = this.wallets.get(toUserId);
    if (recipientWallet) {
      tip.recipientWallet = recipientWallet.address;
    } else {
      if (!this.pendingTips.has(toUserId)) {
        this.pendingTips.set(toUserId, []);
      }
      this.pendingTips.get(toUserId)!.push(tip);
    }

    this.tips.set(tip.id, tip);
    await eventRouter.publish('tip.initiated', 'justthetip', tip, fromUserId);
    return { tip, quote };
  }

  /**
   * Execute previously quoted swap (stub - marks as completed)
   */
  async executeSwap(userId: string, quoteId: string) {
    const quote = this.swapQuotes.get(quoteId);
    if (!quote) {
      throw new Error('Swap quote not found');
    }

    // Simulate execution slippage (0.50% worse than quote baseline)
    const realizedOutput = quote.estimatedOutputAmount * 0.995;
    if (realizedOutput < quote.minOutputAmount) {
      const failure = {
        quote,
        realizedOutput,
        reason: 'Slippage exceeded tolerance',
        failedAt: Date.now(),
        status: 'failed' as const,
      };
      await eventRouter.publish('swap.failed', 'justthetip', failure, userId);
      return failure;
    }

    // Recalculate fees on realized output
    const platformFeeInSol = realizedOutput * (quote.platformFeeBps / 10_000);
    const networkFeeInSol = quote.networkFeeLamports / 1_000_000_000;
    const finalOutputAfterFees = realizedOutput - platformFeeInSol - networkFeeInSol;
    const execution = {
      quote,
      txId: crypto.randomUUID(),
      status: 'completed' as const,
      completedAt: Date.now(),
      realizedOutput,
      finalOutputAfterFees,
      platformFeeInSol,
      networkFeeInSol,
    };
    await eventRouter.publish('swap.completed', 'justthetip', execution, userId);
    return execution;
  }

  /**
   * Register a wallet for a user
   * Supports x402 Trustless Agent, Magic Link, Phantom, etc.
   */
  async registerWallet(userId: string, walletAddress: string, walletType: WalletInfo['type'] = 'other') {
    // Check if user already has a wallet registered
    const existingWallet = this.wallets.get(userId);
    if (existingWallet) {
      throw new Error(
        `❌ You already have a wallet registered:\n\n` +
        `**Address:** \`${existingWallet.address.substring(0, 8)}...${existingWallet.address.substring(existingWallet.address.length - 6)}\`\n` +
        `**Type:** ${existingWallet.type}\n\n` +
        `If you want to register a new wallet, please disconnect your current wallet first using \`/disconnect-wallet\`.`
      );
    }

    const wallet: WalletInfo = {
      userId,
      address: walletAddress,
      type: walletType,
      registeredAt: Date.now()
    };

    this.wallets.set(userId, wallet);

    await eventRouter.publish('wallet.registered', 'justthetip', wallet, userId);

    return wallet;
  }

  /**
   * Disconnect a user's wallet
   * Warns if user has pending tips that will be affected
   */
  async disconnectWallet(userId: string): Promise<{
    success: boolean;
    message: string;
    pendingTipsCount?: number;
    wallet?: WalletInfo;
  }> {
    const wallet = this.wallets.get(userId);
    
    if (!wallet) {
      return {
        success: false,
        message: '❌ You don\'t have a wallet registered. Use `/register-magic` to connect one.'
      };
    }

    // Check for pending tips (tips waiting to be received)
    const pendingTips = this.getPendingTipsForRecipient(userId);
    
    // Remove wallet
    this.wallets.delete(userId);

    // Publish disconnect event
    await eventRouter.publish('wallet.disconnected', 'justthetip', { userId, wallet }, userId);

    return {
      success: true,
      message: pendingTips.length > 0
        ? `⚠️ **Warning:** You have ${pendingTips.length} pending tip${pendingTips.length > 1 ? 's' : ''} that will remain pending until you re-register.`
        : 'Wallet disconnected successfully.',
      pendingTipsCount: pendingTips.length,
      wallet
    };
  }

  /**
   * Get wallet info for a user
   */
  getWallet(userId: string): WalletInfo | undefined {
    return this.wallets.get(userId);
  }

  /**
   * Check if user has wallet registered
   */
  hasWallet(userId: string): boolean {
    return this.wallets.has(userId);
  }

  /**
   * Get pending tips waiting to be received by user
   * (different from getPendingTipsForUser which gets tips waiting for wallet registration)
   */
  private getPendingTipsForRecipient(userId: string): TipSubmission[] {
    return Array.from(this.tips.values()).filter(
      tip => tip.recipientId === userId && tip.status === 'pending'
    );
  }

  /**
   * Complete a tip with transaction signature
   */
  async completeTip(tipId: string, signature: string) {
    const tip = this.tips.get(tipId);
    if (!tip) {
      throw new Error('Tip not found');
    }

    tip.status = 'completed';
    tip.completedAt = Date.now();
    tip.signature = signature;

    await eventRouter.publish('tip.completed', 'justthetip', tip, tip.senderId);

    // Reputation → trust.casino.updated mapping
    // Sender small positive reinforcement (+1), recipient larger (+2)
    await this.emitTrustForUser(tip.senderId, 1, 'tip:sent');
    await this.emitTrustForUser(tip.recipientId, 2, 'tip:received');

    return tip;
  }

  /**
   * Get all tips for a user (sent or received)
   */
  getTipsForUser(userId: string): TipSubmission[] {
    return Array.from(this.tips.values()).filter(
      tip => tip.senderId === userId || tip.recipientId === userId
    );
  }

  /**
   * Get pending tips for a user (tips waiting for wallet registration)
   */
  getPendingTipsForUser(userId: string): TipSubmission[] {
    return this.pendingTips.get(userId) || [];
  }

  /**
   * Generate Solana Pay URL for P2P transfer
   */
  generateSolanaPayURL(recipientAddress: string, amountSOL: number, reference: string, memo: string = 'JustTheTip'): string {
    const params = new URLSearchParams({
      recipient: recipientAddress,
      amount: amountSOL.toString(),
      reference,
      label: memo,
      message: memo
    });

    return `solana:${recipientAddress}?${params.toString()}`;
  }

  private async onTipInitiated(event: TiltCheckEvent) {
    const tip = event.data as TipSubmission;
    console.log(`[JustTheTip] Tip initiated: ${tip.usdAmount} USD (${tip.solAmount.toFixed(4)} SOL) from ${tip.senderId} to ${tip.recipientId}`);
    if (tip.originalMint) {
      console.log(`[JustTheTip] Swap metadata: ${tip.originalAmount} ${tip.originalMint} -> ${tip.solAmount.toFixed(6)} SOL @ rate ${tip.swapRate}`);
    }

    // If recipient has wallet, notify them
    if (tip.recipientWallet) {
      console.log(`[JustTheTip] Recipient wallet found: ${tip.recipientWallet}`);
      // Would trigger Discord notification here
    } else {
      console.log(`[JustTheTip] Recipient needs to register wallet - tip stored as pending`);
    }
  }

  private async onWalletRegistered(event: TiltCheckEvent) {
    const wallet = event.data as WalletInfo;
    console.log(`[JustTheTip] Wallet registered for ${wallet.userId}: ${wallet.address} (${wallet.type})`);

    // Process pending tips for this user
    const pending = this.pendingTips.get(wallet.userId);
    if (pending && pending.length > 0) {
      console.log(`[JustTheTip] Processing ${pending.length} pending tips for ${wallet.userId}`);
      
      for (const tip of pending) {
        tip.recipientWallet = wallet.address;
        await eventRouter.publish('tip.pending.resolved', 'justthetip', tip, tip.senderId);
      }

      this.pendingTips.delete(wallet.userId);
    }
  }

  /**
   * Emit trust.casino.updated event for a user's score change scoped to JustTheTip pseudo-casino.
   */
  private async emitTrustForUser(userId: string, delta: number, reason: string) {
    const previousScore = this.userScores.get(userId) ?? 50; // neutral baseline
    const newScore = Math.max(0, Math.min(100, previousScore + delta));
    if (newScore === previousScore) return; // no change
    this.userScores.set(userId, newScore);
    const severity = computeSeverity(Math.abs(delta));
    const event: TrustCasinoUpdateEvent = {
      casinoName: 'justthetip',
      previousScore,
      newScore,
      delta,
      severity,
      reason,
      source: 'justthetip',
      metadata: { userId }
    };
    await eventRouter.publish('trust.casino.updated', 'justthetip', event, userId);

    // Also emit degen-specific trust event
    const degenEvent: TrustDegenUpdateEvent = {
      userId,
      previousScore,
      newScore,
      delta,
      severity,
      reason,
      source: 'justthetip',
      metadata: { scope: 'degen', userId }
    };
    await eventRouter.publish('trust.degen.updated', 'justthetip', degenEvent, userId);

    this.maybeWriteSnapshot();
  }

  private maybeWriteSnapshot(force = false) {
    const now = Date.now();
    if (!force && now - this.lastSnapshotWrite < JustTheTipModule.SNAPSHOT_INTERVAL_MS) return;
    this.lastSnapshotWrite = now;
    try {
      if (!fs.existsSync(JustTheTipModule.SNAPSHOT_DIR)) fs.mkdirSync(JustTheTipModule.SNAPSHOT_DIR, { recursive: true });
      const snapshot = {
        generatedAt: new Date().toISOString(),
        users: Array.from(this.userScores.entries()).map(([u, s]) => ({ userId: u, score: s }))
      };
      fs.writeFileSync(JustTheTipModule.SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));
    } catch (err) {
      console.error('[JustTheTip] Failed to write user trust snapshot', err);
    }
  }

  // Expose snapshot path
  static getUserTrustSnapshotPath() { return JustTheTipModule.SNAPSHOT_FILE; }
}

export const justthetip = new JustTheTipModule();
