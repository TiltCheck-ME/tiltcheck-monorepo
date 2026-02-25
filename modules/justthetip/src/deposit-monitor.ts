/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Deposit Monitor — Polls bot wallet for incoming SOL transfers
 *
 * Matching strategy:
 * 1. /tip deposit generates a unique deposit code stored in memory (1hr expiry)
 * 2. User sends SOL to bot wallet with the code as memo
 * 3. Monitor parses incoming txs, matches memo → discordId, credits balance
 * 4. Fallback: /tip claim <tx_signature> for wallets that don't support memos
 */

import {
  Connection,
  PublicKey,
  type ParsedTransactionWithMeta,
  type ConfirmedSignatureInfo,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { CreditManager, MIN_DEPOSIT_LAMPORTS } from './credit-manager.js';

const POLL_INTERVAL_MS = 15_000; // 15 seconds
const DEPOSIT_CODE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const DEPOSIT_CODE_PREFIX = 'JTT-';

interface PendingDeposit {
  discordId: string;
  code: string;
  createdAt: number;
}

export class DepositMonitor {
  private connection: Connection;
  private botWalletAddress: PublicKey;
  private creditManager: CreditManager;
  private pendingDeposits: Map<string, PendingDeposit> = new Map(); // code -> PendingDeposit
  private processedSignatures: Set<string> = new Set();
  private lastSignature: string | undefined;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private onDepositConfirmed?: (discordId: string, amountLamports: number, signature: string) => void;

  constructor(
    connection: Connection,
    botWalletAddress: string,
    creditManager: CreditManager,
    opts?: {
      onDepositConfirmed?: (discordId: string, amountLamports: number, signature: string) => void;
    }
  ) {
    this.connection = connection;
    this.botWalletAddress = new PublicKey(botWalletAddress);
    this.creditManager = creditManager;
    this.onDepositConfirmed = opts?.onDepositConfirmed;
  }

  /**
   * Generate a unique deposit code for a user
   */
  generateDepositCode(discordId: string): string {
    // Clean up expired codes for this user first
    for (const [code, deposit] of this.pendingDeposits) {
      if (deposit.discordId === discordId || Date.now() - deposit.createdAt > DEPOSIT_CODE_EXPIRY_MS) {
        this.pendingDeposits.delete(code);
      }
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
    let code = DEPOSIT_CODE_PREFIX;
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    this.pendingDeposits.set(code, {
      discordId,
      code,
      createdAt: Date.now(),
    });

    return code;
  }

  /**
   * Manual deposit claim by transaction signature
   */
  async claimDeposit(discordId: string, txSignature: string): Promise<{ amountLamports: number } | null> {
    if (this.processedSignatures.has(txSignature)) {
      return null; // Already processed
    }

    try {
      const tx = await this.connection.getParsedTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) return null;

      const amount = this.extractSolTransfer(tx);
      if (!amount || amount < MIN_DEPOSIT_LAMPORTS) return null;

      // Verify the transfer was TO our bot wallet
      if (!this.isTransferToBot(tx)) return null;

      this.processedSignatures.add(txSignature);

      const result = await this.creditManager.deposit(discordId, amount, {
        signature: txSignature,
        memo: 'manual claim',
      });

      this.onDepositConfirmed?.(discordId, amount, txSignature);

      return { amountLamports: amount };
    } catch (err) {
      console.error('[DepositMonitor] Error claiming deposit:', err);
      return null;
    }
  }

  /**
   * Start polling for deposits
   */
  start(): void {
    if (this.pollTimer) return;
    console.log(`[DepositMonitor] Started polling ${this.botWalletAddress.toBase58()} every ${POLL_INTERVAL_MS / 1000}s`);
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
    // Do an immediate poll
    this.poll();
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      console.log('[DepositMonitor] Stopped polling');
    }
  }

  /**
   * Poll for new incoming transactions
   */
  private async poll(): Promise<void> {
    try {
      const opts: { limit: number; until?: string } = { limit: 20 };
      if (this.lastSignature) {
        opts.until = this.lastSignature;
      }

      const signatures: ConfirmedSignatureInfo[] = await this.connection.getSignaturesForAddress(
        this.botWalletAddress,
        opts
      );

      if (signatures.length === 0) return;

      // Update last signature to the most recent
      this.lastSignature = signatures[0].signature;

      // Process from oldest to newest
      for (const sig of signatures.reverse()) {
        if (this.processedSignatures.has(sig.signature)) continue;
        if (sig.err) continue; // Skip failed txs

        await this.processTransaction(sig.signature);
      }

      // Clean up expired deposit codes
      for (const [code, deposit] of this.pendingDeposits) {
        if (Date.now() - deposit.createdAt > DEPOSIT_CODE_EXPIRY_MS) {
          this.pendingDeposits.delete(code);
        }
      }
    } catch (err) {
      console.error('[DepositMonitor] Poll error:', err);
    }
  }

  private async processTransaction(signature: string): Promise<void> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) return;

      // Check if this is a SOL transfer TO the bot wallet
      if (!this.isTransferToBot(tx)) return;

      const amount = this.extractSolTransfer(tx);
      if (!amount || amount < MIN_DEPOSIT_LAMPORTS) return;

      // Try to match memo to a deposit code
      const memo = this.extractMemo(tx);
      let discordId: string | null = null;

      if (memo) {
        const normalizedMemo = memo.trim().toUpperCase();
        const deposit = this.pendingDeposits.get(normalizedMemo);
        if (deposit) {
          discordId = deposit.discordId;
          this.pendingDeposits.delete(normalizedMemo);
        }
      }

      if (!discordId) {
        // No memo match — store signature for manual claim
        this.processedSignatures.add(signature);
        console.log(`[DepositMonitor] Unmatched deposit: ${amount / LAMPORTS_PER_SOL} SOL (sig: ${signature.slice(0, 16)}...)`);
        return;
      }

      this.processedSignatures.add(signature);

      await this.creditManager.deposit(discordId, amount, {
        signature,
        memo: memo || undefined,
      });

      console.log(`[DepositMonitor] Credited ${amount / LAMPORTS_PER_SOL} SOL to ${discordId} (sig: ${signature.slice(0, 16)}...)`);

      this.onDepositConfirmed?.(discordId, amount, signature);
    } catch (err) {
      console.error(`[DepositMonitor] Error processing tx ${signature}:`, err);
    }
  }

  private isTransferToBot(tx: ParsedTransactionWithMeta): boolean {
    const postBalances = tx.meta?.postBalances;
    const preBalances = tx.meta?.preBalances;
    const keys = tx.transaction.message.accountKeys;

    if (!postBalances || !preBalances || !keys) return false;

    for (let i = 0; i < keys.length; i++) {
      const pubkey = typeof keys[i] === 'string' ? keys[i] : keys[i].pubkey.toBase58();
      if (pubkey === this.botWalletAddress.toBase58()) {
        // Check if balance increased (received SOL)
        return postBalances[i] > preBalances[i];
      }
    }
    return false;
  }

  private extractSolTransfer(tx: ParsedTransactionWithMeta): number | null {
    const postBalances = tx.meta?.postBalances;
    const preBalances = tx.meta?.preBalances;
    const keys = tx.transaction.message.accountKeys;

    if (!postBalances || !preBalances || !keys) return null;

    for (let i = 0; i < keys.length; i++) {
      const pubkey = typeof keys[i] === 'string' ? keys[i] : keys[i].pubkey.toBase58();
      if (pubkey === this.botWalletAddress.toBase58()) {
        const diff = postBalances[i] - preBalances[i];
        return diff > 0 ? diff : null;
      }
    }
    return null;
  }

  private extractMemo(tx: ParsedTransactionWithMeta): string | null {
    const instructions = tx.transaction.message.instructions;
    for (const ix of instructions) {
      if ('program' in ix && ix.program === 'spl-memo') {
        // Parsed memo instruction
        if ('parsed' in ix) return String(ix.parsed);
      }
      // Also check programId for memo program
      const programId = 'programId' in ix
        ? (typeof ix.programId === 'string' ? ix.programId : ix.programId.toBase58())
        : null;
      if (programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' ||
          programId === 'Memo1UhkJBfCR6MNB4GBYB8YHaiSyHrS') {
        if ('parsed' in ix) return String(ix.parsed);
        if ('data' in ix) {
          try {
            return Buffer.from(ix.data as string, 'base64').toString('utf-8');
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  }
}
