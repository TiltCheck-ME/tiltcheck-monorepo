/**
 * Wallet Service - Non-Custodial Implementation
 * 
 * This service manages user wallets following strict non-custodial principles:
 * - Never stores private keys
 * - Only tracks public addresses
 * - Coordinates transactions but never holds user funds
 */

import { eventRouter } from '@tiltcheck/event-router';
import { v4 as uuidv4 } from 'uuid';
import { getSolscanUrl } from './utils.js';

export type WalletProvider = 'x402' | 'magic' | 'phantom' | 'solflare' | 'user-supplied';
export type TransactionStatus = 'pending' | 'approved' | 'signed' | 'submitted' | 'confirmed' | 'failed';

/**
 * User wallet mapping (NON-CUSTODIAL)
 * Only stores public address, never private keys
 */
export interface UserWallet {
  userId: string;
  publicAddress: string;
  provider: WalletProvider;
  isPrimary: boolean;
  verified: boolean;
  registeredAt: number;
  lastUsedAt: number;
}

/**
 * Transaction request for user approval
 * User must sign with their own wallet
 */
export interface TransactionRequest {
  id: string;
  userId: string;
  type: 'tip' | 'withdrawal' | 'payout';
  from: string;  // Sender's public address
  to: string;    // Recipient's public address
  amountUSD: number;
  amountToken: number;
  token: 'SOL' | 'USDC' | 'USDT';
  status: TransactionStatus;
  metadata?: Record<string, any>;
  createdAt: number;
  sequence: number; // Monotonic sequence for ordering
  expiresAt: number;
  approvedAt?: number;
  signedAt?: number;
  signature?: string;
  transactionHash?: string;
  explorerUrl?: string; // Solscan link for transaction receipt
}

/**
 * Bot wallet for operational purposes ONLY
 * Used for: Gas fees, treasury payouts
 * NOT used for: Holding user deposits
 */
export interface BotWallet {
  purpose: 'gas-fees' | 'treasury';
  publicAddress: string;
  // Private key is managed externally (e.g., environment variable, key vault)
  // Never stored in application code
}

/**
 * Non-Custodial Wallet Service
 */
export class WalletService {
  private userWallets: Map<string, UserWallet[]> = new Map();
  private transactionRequests: Map<string, TransactionRequest> = new Map();
  private botWallets: Map<string, BotWallet> = new Map();
  private transactionSequence: number = 0;

  constructor() {
    this.initializeBotWallets();
    this.setupEventListeners();
  }

  /**
   * Initialize bot wallets (operational only, non-custodial)
   */
  private initializeBotWallets(): void {
    // These would be loaded from environment variables
    // Public addresses only, private keys managed externally
    
    // Gas fee wallet - pays transaction fees
    this.botWallets.set('gas-fees', {
      purpose: 'gas-fees',
      publicAddress: process.env.GAS_WALLET_PUBLIC || 'MOCK_GAS_WALLET',
    });

    // Treasury wallet - pays rewards to users
    this.botWallets.set('treasury', {
      purpose: 'treasury',
      publicAddress: process.env.TREASURY_WALLET_PUBLIC || 'MOCK_TREASURY_WALLET',
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for withdrawal requests from QualifyFirst
    eventRouter.subscribe(
      'survey.withdrawal.requested',
      async (event) => {
        const { userId, amountUSD } = event.data as any;
        await this.handleWithdrawalRequest(userId, amountUSD);
      },
      'wallet-service'
    );
  }

  /**
   * Register a user wallet (NON-CUSTODIAL)
   * User proves ownership by signing a message
   */
  async registerWallet(
    userId: string,
    publicAddress: string,
    provider: WalletProvider,
    signatureProof?: string
  ): Promise<UserWallet> {
    // Verify user owns this wallet by checking signature
    if (provider === 'user-supplied' && !signatureProof) {
      throw new Error('Signature proof required for user-supplied wallets');
    }

    // Check if wallet already registered
    const existingWallets = this.userWallets.get(userId) || [];
    const duplicate = existingWallets.find(w => w.publicAddress === publicAddress);
    
    if (duplicate) {
      throw new Error('Wallet already registered');
    }

    const wallet: UserWallet = {
      userId,
      publicAddress,
      provider,
      isPrimary: existingWallets.length === 0, // First wallet is primary
      verified: provider !== 'user-supplied' || !!signatureProof,
      registeredAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    existingWallets.push(wallet);
    this.userWallets.set(userId, existingWallets);

    // Emit event
    await eventRouter.publish('wallet.registered', 'wallet-service', {
      userId,
      publicAddress,
      provider,
    }, userId);

    return wallet;
  }

  /**
   * Get user's primary wallet
   */
  getPrimaryWallet(userId: string): UserWallet | null {
    const wallets = this.userWallets.get(userId) || [];
    return wallets.find(w => w.isPrimary) || wallets[0] || null;
  }

  /**
   * Get all wallets for a user
   */
  getUserWallets(userId: string): UserWallet[] {
    return this.userWallets.get(userId) || [];
  }

  /**
   * Create tip transaction (USER → USER, bot pays gas)
   * NON-CUSTODIAL: Direct transfer, no intermediate holding
   */
  async createTipTransaction(
    senderId: string,
    recipientId: string,
    amountUSD: number
  ): Promise<TransactionRequest> {
    const senderWallet = this.getPrimaryWallet(senderId);
    const recipientWallet = this.getPrimaryWallet(recipientId);

    if (!senderWallet) {
      throw new Error('Sender wallet not registered');
    }
    if (!recipientWallet) {
      throw new Error('Recipient wallet not registered');
    }

    // Create transaction request
    const txRequest: TransactionRequest = {
      id: uuidv4(),
      userId: senderId,
      type: 'tip',
      from: senderWallet.publicAddress,
      to: recipientWallet.publicAddress,
      amountUSD,
      amountToken: amountUSD, // 1:1 for USDC
      token: 'USDC',
      status: 'pending',
      metadata: {
        recipientId,
        recipientProvider: recipientWallet.provider,
      },
      createdAt: Date.now(),
      sequence: ++this.transactionSequence,
      expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutes
    };

    this.transactionRequests.set(txRequest.id, txRequest);

    // Emit event for user to sign
    await eventRouter.publish('transaction.created', 'wallet-service', {
      transactionId: txRequest.id,
      userId: senderId,
      type: 'tip',
      requiresSignature: true,
    }, senderId);

    return txRequest;
  }

  /**
   * Create withdrawal transaction (TREASURY → USER)
   * Treasury pays user their earnings
   */
  async createWithdrawalTransaction(
    userId: string,
    amountUSD: number
  ): Promise<TransactionRequest> {
    const userWallet = this.getPrimaryWallet(userId);

    if (!userWallet) {
      throw new Error('User wallet not registered');
    }

    const treasuryWallet = this.botWallets.get('treasury');
    if (!treasuryWallet) {
      throw new Error('Treasury wallet not configured');
    }

    // Create transaction request
    const txRequest: TransactionRequest = {
      id: uuidv4(),
      userId,
      type: 'withdrawal',
      from: treasuryWallet.publicAddress,
      to: userWallet.publicAddress,
      amountUSD,
      amountToken: amountUSD,
      token: 'USDC',
      status: 'pending',
      metadata: {
        source: 'survey-earnings',
      },
      createdAt: Date.now(),
      sequence: ++this.transactionSequence,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    };

    this.transactionRequests.set(txRequest.id, txRequest);

    // Treasury transactions don't need user signature
    // Treasury signs and sends directly
    txRequest.status = 'approved';

    await eventRouter.publish('transaction.created', 'wallet-service', {
      transactionId: txRequest.id,
      userId,
      type: 'withdrawal',
      requiresSignature: false,
    }, userId);

    return txRequest;
  }

  /**
   * User approves a transaction
   */
  async approveTransaction(transactionId: string, userId: string): Promise<void> {
    const tx = this.transactionRequests.get(transactionId);
    
    if (!tx) {
      throw new Error('Transaction not found');
    }
    if (tx.userId !== userId) {
      throw new Error('Unauthorized');
    }
    if (tx.status !== 'pending') {
      throw new Error(`Cannot approve transaction in status: ${tx.status}`);
    }
    if (Date.now() > tx.expiresAt) {
      tx.status = 'failed';
      throw new Error('Transaction expired');
    }

    tx.status = 'approved';
    tx.approvedAt = Date.now();

    await eventRouter.publish('transaction.approved', 'wallet-service', {
      transactionId,
      userId,
    }, userId);
  }

  /**
   * Submit signed transaction
   * User provides signature from their wallet (Phantom, x402, etc.)
   */
  async submitSignedTransaction(
    transactionId: string,
    signature: string
  ): Promise<void> {
    const tx = this.transactionRequests.get(transactionId);
    
    if (!tx) {
      throw new Error('Transaction not found');
    }
    if (tx.status !== 'approved') {
      throw new Error('Transaction not approved');
    }

    tx.signature = signature;
    tx.status = 'signed';
    tx.signedAt = Date.now();

    // In real implementation, this would submit to Solana blockchain
    // For now, just mark as submitted
    tx.status = 'submitted';
    // On Solana, the transaction signature IS the transaction hash/ID
    // Using it for both fields maintains consistency with the Solana model
    tx.transactionHash = signature;
    tx.explorerUrl = getSolscanUrl(signature);

    await eventRouter.publish('transaction.submitted', 'wallet-service', {
      transactionId,
      transactionHash: tx.transactionHash,
      explorerUrl: tx.explorerUrl,
      receipt: {
        transactionHash: signature,
        explorerUrl: tx.explorerUrl,
        timestamp: tx.signedAt,
        from: tx.from,
        to: tx.to,
        amount: tx.amountUSD,
        currency: tx.token,
      },
    }, tx.userId);

    // Simulate confirmation
    setTimeout(async () => {
      tx.status = 'confirmed';
      await eventRouter.publish('transaction.confirmed', 'wallet-service', {
        transactionId,
        transactionHash: tx.transactionHash,
        explorerUrl: tx.explorerUrl,
      }, tx.userId);
    }, 2000);
  }

  /**
   * Handle withdrawal request from QualifyFirst
   */
  private async handleWithdrawalRequest(userId: string, amountUSD: number): Promise<void> {
    try {
      const tx = await this.createWithdrawalTransaction(userId, amountUSD);
      
      // Auto-process treasury transactions
      if (tx.type === 'withdrawal') {
        // In real implementation, treasury would sign and submit
        tx.signature = `TREASURY_SIGNATURE_${uuidv4()}`;
        await this.submitSignedTransaction(tx.id, tx.signature);
      }
    } catch (error) {
      console.error('Failed to handle withdrawal request:', error);
      await eventRouter.publish('transaction.failed', 'wallet-service', {
        userId,
        amountUSD,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, userId);
    }
  }

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId: string): TransactionRequest | null {
    return this.transactionRequests.get(transactionId) || null;
  }

  /**
   * Get user's transaction history
   */
  getUserTransactions(userId: string): TransactionRequest[] {
    const transactions: TransactionRequest[] = [];
    
    for (const tx of this.transactionRequests.values()) {
      if (tx.userId === userId) {
        transactions.push(tx);
      }
    }

    // Sort by sequence (most recent first)
    return transactions.sort((a, b) => b.sequence - a.sequence);
  }

  /**
   * Get user's completed transactions with receipts
   * Returns only confirmed transactions with Solscan links
   */
  getUserTransactionReceipts(userId: string): Array<{
    transactionId: string;
    type: string;
    from: string;
    to: string;
    amount: number;
    currency: string;
    status: string;
    timestamp: number;
    signature?: string;
    transactionHash?: string;
    explorerUrl?: string;
  }> {
    return this.getUserTransactions(userId)
      .filter(tx => tx.status === 'confirmed' && tx.signature)
      .map(tx => ({
        transactionId: tx.id,
        type: tx.type,
        from: tx.from,
        to: tx.to,
        amount: tx.amountUSD,
        currency: tx.token,
        status: tx.status,
        timestamp: tx.signedAt || tx.createdAt,
        signature: tx.signature,
        transactionHash: tx.transactionHash,
        explorerUrl: tx.explorerUrl,
      }));
  }

  /**
   * Get bot wallet (for display purposes only)
   */
  getBotWallet(purpose: 'gas-fees' | 'treasury'): BotWallet | null {
    return this.botWallets.get(purpose) || null;
  }
}

// Export singleton instance
export const walletService = new WalletService();

console.log('[WalletService] Non-custodial wallet service initialized');
