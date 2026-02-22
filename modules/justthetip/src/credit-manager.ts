/**
 * Credit Manager — Core business logic for custodial credit balances
 *
 * Dual storage: Supabase primary, file-based JSON fallback.
 */

import { DatabaseClient, type CreditBalance, type CreditTransaction } from '@tiltcheck/database';
import { eventRouter } from '@tiltcheck/event-router';
import fs from 'fs';
import path from 'path';

// Fee configuration
export const FLAT_FEE_LAMPORTS = 700_000; // 0.0007 SOL
export const MIN_DEPOSIT_LAMPORTS = 10_000_000; // 0.01 SOL

// Fallback file path
const FALLBACK_DIR = path.join(process.cwd(), 'data');
const FALLBACK_FILE = path.join(FALLBACK_DIR, 'credit-balances.json');

interface FallbackBalance {
  discordId: string;
  balanceLamports: number;
  walletAddress: string | null;
  lastActivityAt: number;
  refundMode: 'reset-on-activity' | 'hard-expiry';
  hardExpiryAt: number | null;
  inactivityDays: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalTipped: number;
  totalFees: number;
}

interface FallbackTransaction {
  id: string;
  discordId: string;
  type: string;
  amountLamports: number;
  balanceAfterLamports: number;
  counterpartyId: string | null;
  onChainSignature: string | null;
  memo: string | null;
  createdAt: number;
}

interface FallbackPendingTip {
  id: string;
  senderId: string;
  recipientId: string;
  amountLamports: number;
  feeLamports: number;
  expiresAt: number;
  status: 'pending' | 'claimed' | 'refunded' | 'expired';
}

interface FallbackData {
  balances: Record<string, FallbackBalance>;
  transactions: FallbackTransaction[];
  pendingTips: FallbackPendingTip[];
}

export class CreditManager {
  private db: DatabaseClient;
  private fallback: FallbackData = { balances: {}, transactions: [], pendingTips: [] };
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(db: DatabaseClient) {
    this.db = db;
    if (!db.isConnected()) {
      this.loadFallback();
    }
  }

  // ---- Balance queries ----

  async getBalance(discordId: string): Promise<CreditBalance | null> {
    if (this.db.isConnected()) {
      return this.db.getCreditBalance(discordId);
    }
    const fb = this.fallback.balances[discordId];
    if (!fb) return null;
    return this.fbToCreditBalance(fb);
  }

  // ---- Mutations ----

  async deposit(
    discordId: string,
    amountLamports: number,
    opts?: { memo?: string; signature?: string }
  ): Promise<{ newBalance: number; txId: string }> {
    if (amountLamports < MIN_DEPOSIT_LAMPORTS) {
      throw new Error(`Minimum deposit is ${MIN_DEPOSIT_LAMPORTS / 1e9} SOL`);
    }

    if (this.db.isConnected()) {
      const result = await this.db.creditBalance(discordId, amountLamports, 'deposit', {
        memo: opts?.memo,
        signature: opts?.signature,
      });
      if (!result) throw new Error('Failed to credit balance');
      await eventRouter.publish('credit.deposited', 'justthetip', {
        discordId, amountLamports, newBalance: result.newBalance,
      });
      return result;
    }

    return this.fbCredit(discordId, amountLamports, 'deposit', opts);
  }

  async deductForTip(
    senderId: string,
    recipientId: string,
    amountLamports: number
  ): Promise<{ senderNewBalance: number; feeLamports: number; netAmount: number }> {
    const feeLamports = FLAT_FEE_LAMPORTS;
    const totalDeduction = amountLamports + feeLamports;

    if (this.db.isConnected()) {
      // Debit sender for tip amount
      const tipResult = await this.db.debitBalance(senderId, amountLamports, 'tip_send', {
        counterpartyId: recipientId,
      });
      if (!tipResult) throw new Error('Insufficient balance or debit failed');

      // Debit sender for fee
      const feeResult = await this.db.debitBalance(senderId, feeLamports, 'fee', {
        memo: 'tip fee',
      });
      if (!feeResult) throw new Error('Failed to debit fee');

      await eventRouter.publish('credit.tip_sent', 'justthetip', {
        senderId, recipientId, amountLamports, feeLamports,
        senderNewBalance: feeResult.newBalance,
      });

      return {
        senderNewBalance: feeResult.newBalance,
        feeLamports,
        netAmount: amountLamports,
      };
    }

    return this.fbDeductForTip(senderId, recipientId, amountLamports, feeLamports);
  }

  async deductForAirdrop(
    senderId: string,
    recipientIds: string[],
    amountPerRecipient: number
  ): Promise<{ senderNewBalance: number; totalDeducted: number; results: Array<{ recipientId: string; amount: number }> }> {
    const feeLamports = FLAT_FEE_LAMPORTS;
    const totalAmount = amountPerRecipient * recipientIds.length;
    const totalDeducted = totalAmount + feeLamports;

    if (this.db.isConnected()) {
      // Debit sender for total airdrop
      const result = await this.db.debitBalance(senderId, totalAmount, 'airdrop_send', {
        memo: `airdrop to ${recipientIds.length} users`,
      });
      if (!result) throw new Error('Insufficient balance for airdrop');

      // Debit fee
      const feeResult = await this.db.debitBalance(senderId, feeLamports, 'fee', {
        memo: 'airdrop fee',
      });
      if (!feeResult) throw new Error('Failed to debit fee');

      const results = recipientIds.map(id => ({ recipientId: id, amount: amountPerRecipient }));

      await eventRouter.publish('credit.airdrop_sent', 'justthetip', {
        senderId, recipientIds, amountPerRecipient, feeLamports,
        senderNewBalance: feeResult.newBalance,
      });

      return { senderNewBalance: feeResult.newBalance, totalDeducted, results };
    }

    return this.fbDeductForAirdrop(senderId, recipientIds, amountPerRecipient, feeLamports);
  }

  async withdraw(discordId: string): Promise<{ amountLamports: number; walletAddress: string }> {
    const balance = await this.getBalance(discordId);
    if (!balance || balance.balance_lamports <= 0) {
      throw new Error('No balance to withdraw');
    }
    if (!balance.wallet_address) {
      throw new Error('No wallet registered. Use `/tip wallet register-external` first.');
    }

    if (this.db.isConnected()) {
      const result = await this.db.debitBalance(discordId, balance.balance_lamports, 'withdraw');
      if (!result) throw new Error('Failed to debit balance for withdrawal');

      await eventRouter.publish('credit.withdrawn', 'justthetip', {
        discordId, amountLamports: balance.balance_lamports, walletAddress: balance.wallet_address,
      });

      return { amountLamports: balance.balance_lamports, walletAddress: balance.wallet_address };
    }

    return this.fbWithdraw(discordId);
  }

  async refund(discordId: string, reason: string): Promise<{ amountLamports: number; walletAddress: string }> {
    const balance = await this.getBalance(discordId);
    if (!balance || balance.balance_lamports <= 0) {
      throw new Error('No balance to refund');
    }
    if (!balance.wallet_address) {
      throw new Error('No wallet address for refund');
    }

    if (this.db.isConnected()) {
      const result = await this.db.debitBalance(discordId, balance.balance_lamports, 'refund', {
        memo: reason,
      });
      if (!result) throw new Error('Failed to debit balance for refund');

      await eventRouter.publish('credit.refunded', 'justthetip', {
        discordId, amountLamports: balance.balance_lamports, walletAddress: balance.wallet_address, reason,
      });

      return { amountLamports: balance.balance_lamports, walletAddress: balance.wallet_address };
    }

    return this.fbRefund(discordId, reason);
  }

  async registerWallet(discordId: string, walletAddress: string): Promise<void> {
    if (this.db.isConnected()) {
      const ok = await this.db.registerCreditWallet(discordId, walletAddress);
      if (!ok) throw new Error('Failed to register wallet');
    } else {
      const fb = this.fallback.balances[discordId] || this.createFallbackBalance(discordId);
      fb.walletAddress = walletAddress;
      fb.lastActivityAt = Date.now();
      this.fallback.balances[discordId] = fb;
      this.scheduleSave();
    }
  }

  async getTransactionHistory(discordId: string, limit = 20): Promise<CreditTransaction[]> {
    if (this.db.isConnected()) {
      return this.db.getCreditTransactions(discordId, limit);
    }
    return this.fallback.transactions
      .filter(t => t.discordId === discordId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(t => ({
        id: t.id,
        discord_id: t.discordId,
        type: t.type,
        amount_lamports: t.amountLamports,
        balance_after_lamports: t.balanceAfterLamports,
        counterparty_id: t.counterpartyId,
        on_chain_signature: t.onChainSignature,
        memo: t.memo,
        created_at: new Date(t.createdAt).toISOString(),
      }));
  }

  async updateRefundSettings(
    discordId: string,
    settings: { refundMode?: 'reset-on-activity' | 'hard-expiry'; hardExpiryAt?: string | null; inactivityDays?: number }
  ): Promise<void> {
    if (this.db.isConnected()) {
      const ok = await this.db.updateRefundSettings(discordId, settings);
      if (!ok) throw new Error('Failed to update refund settings');
    } else {
      const fb = this.fallback.balances[discordId];
      if (!fb) throw new Error('No balance found');
      if (settings.refundMode) fb.refundMode = settings.refundMode;
      if (settings.hardExpiryAt !== undefined) fb.hardExpiryAt = settings.hardExpiryAt ? new Date(settings.hardExpiryAt).getTime() : null;
      if (settings.inactivityDays !== undefined) fb.inactivityDays = settings.inactivityDays;
      this.scheduleSave();
    }
  }

  async getStaleBalancesForRefund(): Promise<CreditBalance[]> {
    if (this.db.isConnected()) {
      // Get all balances with balance > 0, then filter by their individual settings
      const allStale: CreditBalance[] = [];

      // Check reset-on-activity users
      const roaBalances = await this.db.getStaleBalances(7 * 24 * 60 * 60 * 1000); // 7-day default
      for (const b of roaBalances) {
        if (b.refund_mode === 'reset-on-activity') {
          const threshold = b.inactivity_days * 24 * 60 * 60 * 1000;
          const lastActivity = new Date(b.last_activity_at).getTime();
          if (Date.now() - lastActivity >= threshold) {
            allStale.push(b);
          }
        } else if (b.refund_mode === 'hard-expiry' && b.hard_expiry_at) {
          if (new Date(b.hard_expiry_at).getTime() <= Date.now()) {
            allStale.push(b);
          }
        }
      }
      return allStale;
    }

    // Fallback
    return Object.values(this.fallback.balances)
      .filter(fb => {
        if (fb.balanceLamports <= 0) return false;
        if (fb.refundMode === 'reset-on-activity') {
          const threshold = fb.inactivityDays * 24 * 60 * 60 * 1000;
          return Date.now() - fb.lastActivityAt >= threshold;
        }
        if (fb.refundMode === 'hard-expiry' && fb.hardExpiryAt) {
          return fb.hardExpiryAt <= Date.now();
        }
        return false;
      })
      .map(fb => this.fbToCreditBalance(fb));
  }

  async processPendingTipsForUser(recipientId: string): Promise<number> {
    if (this.db.isConnected()) {
      const tips = await this.db.getPendingTipsForRecipient(recipientId);
      let count = 0;
      for (const tip of tips) {
        // Credit recipient
        await this.db.creditBalance(recipientId, tip.amount_lamports, 'pending_release', {
          counterpartyId: tip.sender_id,
          memo: 'pending tip claimed',
        });
        await this.db.claimPendingTip(tip.id);
        count++;
      }
      return count;
    }

    // Fallback
    const pending = this.fallback.pendingTips.filter(t => t.recipientId === recipientId && t.status === 'pending');
    for (const tip of pending) {
      this.fbCredit(recipientId, tip.amountLamports, 'pending_release', { memo: 'pending tip claimed' });
      tip.status = 'claimed';
    }
    this.scheduleSave();
    return pending.length;
  }

  async refundExpiredPendingTips(): Promise<number> {
    if (this.db.isConnected()) {
      const expired = await this.db.getExpiredPendingTips();
      let count = 0;
      for (const tip of expired) {
        // Credit back to sender
        await this.db.creditBalance(tip.sender_id, tip.amount_lamports + tip.fee_lamports, 'pending_refund', {
          counterpartyId: tip.recipient_id,
          memo: 'pending tip expired',
        });
        await this.db.markPendingTipRefunded(tip.id);
        count++;
      }
      return count;
    }

    // Fallback
    const now = Date.now();
    const expired = this.fallback.pendingTips.filter(t => t.status === 'pending' && t.expiresAt <= now);
    for (const tip of expired) {
      this.fbCredit(tip.senderId, tip.amountLamports + tip.feeLamports, 'pending_refund', {
        memo: 'pending tip expired',
      });
      tip.status = 'expired';
    }
    this.scheduleSave();
    return expired.length;
  }

  async createPendingTip(senderId: string, recipientId: string, amountLamports: number): Promise<void> {
    const feeLamports = FLAT_FEE_LAMPORTS;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (this.db.isConnected()) {
      // Debit sender for pending hold
      const result = await this.db.debitBalance(senderId, amountLamports + feeLamports, 'pending_hold', {
        counterpartyId: recipientId,
        memo: 'pending tip hold',
      });
      if (!result) throw new Error('Insufficient balance for tip');

      await this.db.createPendingTip({
        senderId,
        recipientId,
        amountLamports,
        feeLamports,
        expiresAt: expiresAt.toISOString(),
      });
    } else {
      this.fbDebit(senderId, amountLamports + feeLamports, 'pending_hold');
      this.fallback.pendingTips.push({
        id: crypto.randomUUID(),
        senderId,
        recipientId,
        amountLamports,
        feeLamports,
        expiresAt: expiresAt.getTime(),
        status: 'pending',
      });
      this.scheduleSave();
    }

    await eventRouter.publish('credit.pending_tip_created', 'justthetip', {
      senderId, recipientId, amountLamports, feeLamports,
    });
  }

  // ---- Fallback helpers ----

  private createFallbackBalance(discordId: string): FallbackBalance {
    return {
      discordId,
      balanceLamports: 0,
      walletAddress: null,
      lastActivityAt: Date.now(),
      refundMode: 'reset-on-activity',
      hardExpiryAt: null,
      inactivityDays: 7,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalTipped: 0,
      totalFees: 0,
    };
  }

  private fbCredit(
    discordId: string,
    amount: number,
    type: string,
    opts?: { memo?: string; signature?: string }
  ): { newBalance: number; txId: string } {
    const fb = this.fallback.balances[discordId] || this.createFallbackBalance(discordId);
    fb.balanceLamports += amount;
    fb.lastActivityAt = Date.now();
    if (type === 'deposit') fb.totalDeposited += amount;
    this.fallback.balances[discordId] = fb;

    const txId = crypto.randomUUID();
    this.fallback.transactions.push({
      id: txId,
      discordId,
      type,
      amountLamports: amount,
      balanceAfterLamports: fb.balanceLamports,
      counterpartyId: null,
      onChainSignature: opts?.signature ?? null,
      memo: opts?.memo ?? null,
      createdAt: Date.now(),
    });
    this.scheduleSave();
    return { newBalance: fb.balanceLamports, txId };
  }

  private fbDebit(discordId: string, amount: number, type: string): number {
    const fb = this.fallback.balances[discordId];
    if (!fb || fb.balanceLamports < amount) {
      throw new Error('Insufficient balance');
    }
    fb.balanceLamports -= amount;
    fb.lastActivityAt = Date.now();

    if (type === 'tip_send' || type === 'airdrop_send') fb.totalTipped += amount;
    if (type === 'withdraw' || type === 'refund') fb.totalWithdrawn += amount;
    if (type === 'fee') fb.totalFees += amount;

    this.fallback.transactions.push({
      id: crypto.randomUUID(),
      discordId,
      type,
      amountLamports: -amount,
      balanceAfterLamports: fb.balanceLamports,
      counterpartyId: null,
      onChainSignature: null,
      memo: null,
      createdAt: Date.now(),
    });
    this.scheduleSave();
    return fb.balanceLamports;
  }

  private fbDeductForTip(
    senderId: string,
    _recipientId: string,
    amount: number,
    fee: number
  ): { senderNewBalance: number; feeLamports: number; netAmount: number } {
    this.fbDebit(senderId, amount, 'tip_send');
    const newBal = this.fbDebit(senderId, fee, 'fee');
    return { senderNewBalance: newBal, feeLamports: fee, netAmount: amount };
  }

  private fbDeductForAirdrop(
    senderId: string,
    recipientIds: string[],
    amountPer: number,
    fee: number
  ): { senderNewBalance: number; totalDeducted: number; results: Array<{ recipientId: string; amount: number }> } {
    const totalAmount = amountPer * recipientIds.length;
    this.fbDebit(senderId, totalAmount, 'airdrop_send');
    const newBal = this.fbDebit(senderId, fee, 'fee');
    const results = recipientIds.map(id => ({ recipientId: id, amount: amountPer }));
    return { senderNewBalance: newBal, totalDeducted: totalAmount + fee, results };
  }

  private fbWithdraw(discordId: string): { amountLamports: number; walletAddress: string } {
    const fb = this.fallback.balances[discordId];
    if (!fb || fb.balanceLamports <= 0) throw new Error('No balance to withdraw');
    if (!fb.walletAddress) throw new Error('No wallet registered');
    const amount = fb.balanceLamports;
    this.fbDebit(discordId, amount, 'withdraw');
    return { amountLamports: amount, walletAddress: fb.walletAddress };
  }

  private fbRefund(discordId: string, _reason: string): { amountLamports: number; walletAddress: string } {
    const fb = this.fallback.balances[discordId];
    if (!fb || fb.balanceLamports <= 0) throw new Error('No balance to refund');
    if (!fb.walletAddress) throw new Error('No wallet address for refund');
    const amount = fb.balanceLamports;
    this.fbDebit(discordId, amount, 'refund');
    return { amountLamports: amount, walletAddress: fb.walletAddress };
  }

  private fbToCreditBalance(fb: FallbackBalance): CreditBalance {
    return {
      discord_id: fb.discordId,
      balance_lamports: fb.balanceLamports,
      wallet_address: fb.walletAddress,
      last_activity_at: new Date(fb.lastActivityAt).toISOString(),
      refund_mode: fb.refundMode,
      hard_expiry_at: fb.hardExpiryAt ? new Date(fb.hardExpiryAt).toISOString() : null,
      inactivity_days: fb.inactivityDays,
      total_deposited_lamports: fb.totalDeposited,
      total_withdrawn_lamports: fb.totalWithdrawn,
      total_tipped_lamports: fb.totalTipped,
      total_fees_lamports: fb.totalFees,
      created_at: new Date(fb.lastActivityAt).toISOString(),
      updated_at: new Date(fb.lastActivityAt).toISOString(),
    };
  }

  // ---- Persistence ----

  private loadFallback(): void {
    try {
      if (fs.existsSync(FALLBACK_FILE)) {
        const raw = fs.readFileSync(FALLBACK_FILE, 'utf-8');
        this.fallback = JSON.parse(raw);
        console.log('[CreditManager] Loaded fallback data');
      }
    } catch (err) {
      console.warn('[CreditManager] Failed to load fallback:', err);
    }
  }

  private scheduleSave(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.saveFallback(), 250);
  }

  private saveFallback(): void {
    try {
      if (!fs.existsSync(FALLBACK_DIR)) {
        fs.mkdirSync(FALLBACK_DIR, { recursive: true });
      }
      fs.writeFileSync(FALLBACK_FILE, JSON.stringify(this.fallback, null, 2));
    } catch (err) {
      console.error('[CreditManager] Failed to save fallback:', err);
    }
  }
}
