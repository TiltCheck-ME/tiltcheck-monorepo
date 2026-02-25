// v0.1.0 — 2026-02-25

/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Token Deposit Monitor
 *
 * Watches the bot wallet for incoming SPL token transfers.
 * When a token deposit is detected (matched by memo code), it:
 *   1. Calls Jupiter to swap the token → SOL using the bot's keypair
 *   2. Credits the resulting SOL to the user's credit balance
 *
 * Works alongside the existing DepositMonitor (which handles native SOL deposits).
 */

import {
  Connection,
  PublicKey,
  type ConfirmedSignatureInfo,
  type ParsedTransactionWithMeta,
} from '@solana/web3.js';
import { type CreditManager } from '@tiltcheck/justthetip';
import { TokenSwapService, DEPOSIT_TOKENS } from './token-swap.js';

const POLL_INTERVAL_MS = 20_000; // 20 seconds (offset from SOL monitor's 15s)
const DEPOSIT_CODE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const DEPOSIT_CODE_PREFIX = 'JTT-';
const MIN_DEPOSIT_USD_CENTS = 100; // $1.00 minimum

interface PendingDeposit {
  discordId: string;
  code: string;
  createdAt: number;
}

export class TokenDepositMonitor {
  private connection: Connection;
  private botWalletAddress: PublicKey;
  private creditManager: CreditManager;
  private swapService: TokenSwapService;
  private pendingDeposits: Map<string, PendingDeposit> = new Map();
  private processedSignatures: Set<string> = new Set();
  private lastSignature: string | undefined;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private onSwapDeposit?: (discordId: string, inputToken: string, outputLamports: number, signature: string) => void;

  constructor(
    connection: Connection,
    botWalletAddress: string,
    creditManager: CreditManager,
    swapService: TokenSwapService,
    opts?: {
      onSwapDeposit?: (discordId: string, inputToken: string, outputLamports: number, sig: string) => void;
    }
  ) {
    this.connection = connection;
    this.botWalletAddress = new PublicKey(botWalletAddress);
    this.creditManager = creditManager;
    this.swapService = swapService;
    this.onSwapDeposit = opts?.onSwapDeposit;
  }

  /**
   * Register a pending deposit code (same codes used by the main DepositMonitor)
   * Call this from tip.ts when the user runs /tip deposit-token
   */
  registerDepositCode(code: string, discordId: string): void {
    this.pendingDeposits.set(code.toUpperCase(), {
      discordId,
      code,
      createdAt: Date.now(),
    });
  }

  start(): void {
    if (this.pollTimer) return;
    console.log(`[TokenDepositMonitor] Started polling for SPL token deposits`);
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
    // Slight delay to not overlap with SOL monitor's immediate poll
    setTimeout(() => this.poll(), 5_000);
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async poll(): Promise<void> {
    try {
      const opts: { limit: number; until?: string } = { limit: 30 };
      if (this.lastSignature) {
        opts.until = this.lastSignature;
      }

      const signatures: ConfirmedSignatureInfo[] = await this.connection.getSignaturesForAddress(
        this.botWalletAddress,
        opts
      );

      if (!signatures.length) return;
      this.lastSignature = signatures[0].signature;

      // Process oldest → newest
      for (const sig of signatures.reverse()) {
        if (this.processedSignatures.has(sig.signature)) continue;
        if (sig.err) continue;
        await this.processTransaction(sig.signature);
      }

      // Clean up expired codes
      for (const [code, deposit] of this.pendingDeposits) {
        if (Date.now() - deposit.createdAt > DEPOSIT_CODE_EXPIRY_MS) {
          this.pendingDeposits.delete(code);
        }
      }
    } catch (err) {
      console.error('[TokenDepositMonitor] Poll error:', err);
    }
  }

  private async processTransaction(signature: string): Promise<void> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      if (!tx) return;

      // Extract memo first — if no JTT- memo, skip (SOL monitor handles unmatched)
      const memo = this.extractMemo(tx);
      if (!memo) return;

      const normalizedMemo = memo.trim().toUpperCase();
      if (!normalizedMemo.startsWith(DEPOSIT_CODE_PREFIX)) return;

      const pendingDeposit = this.pendingDeposits.get(normalizedMemo);
      if (!pendingDeposit) return; // Not our deposit code

      // Look for SPL token transfer to bot wallet
      const tokenTransfer = this.extractSplTokenTransfer(tx);
      if (!tokenTransfer) return; // Not an SPL token deposit (SOL monitor handles SOL)

      this.processedSignatures.add(signature);
      this.pendingDeposits.delete(normalizedMemo);

      const { mint, amount } = tokenTransfer;
      const tokenInfo = Object.entries(DEPOSIT_TOKENS).find(([, t]) => t.mint === mint);
      const tokenSymbol = tokenInfo?.[0] ?? 'UNKNOWN';

      console.log(
        `[TokenDepositMonitor] Detected ${tokenSymbol} deposit from ${pendingDeposit.discordId} ` +
        `(${amount} smallest units, sig: ${signature.slice(0, 16)}...)`
      );

      // Execute swap: token → SOL
      const swapResult = await this.swapService.swapTokenToSOL(mint, amount);

      if (!swapResult.success || !swapResult.outputLamports) {
        console.error(
          `[TokenDepositMonitor] Swap failed for ${pendingDeposit.discordId}: ${swapResult.error}`
        );
        // NOTE: Refund logic not implemented in beta. Requires:
        // 1. Storing user's registered withdrawal wallet on registration
        // 2. Parsing TokenSwapService error for refund eligibility
        // 3. Implementing safe transfer back with fee recovery
        // For now, log the event and alert ops team for manual recovery.
        return;
      }

      // Credit the SOL proceeds to the user's balance
      await this.creditManager.deposit(pendingDeposit.discordId, swapResult.outputLamports, {
        signature: swapResult.signature,
        memo: `token-swap:${tokenSymbol}→SOL`,
      });

      console.log(
        `[TokenDepositMonitor] Credited ${swapResult.outputLamports / 1e9} SOL to ` +
        `${pendingDeposit.discordId} after ${tokenSymbol}→SOL swap`
      );

      this.onSwapDeposit?.(
        pendingDeposit.discordId,
        tokenSymbol,
        swapResult.outputLamports,
        swapResult.signature ?? signature
      );
    } catch (err) {
      console.error(`[TokenDepositMonitor] Error processing tx ${signature}:`, err);
    }
  }

  /**
   * Extract an SPL token transfer TO the bot wallet from a transaction
   * Returns { mint, amount } if found, null otherwise
   */
  private extractSplTokenTransfer(
    tx: ParsedTransactionWithMeta
  ): { mint: string; amount: number } | null {
    const tokenBalances = tx.meta?.postTokenBalances;
    const preTokenBalances = tx.meta?.preTokenBalances;
    if (!tokenBalances || !preTokenBalances) return null;

    const keys = tx.transaction.message.accountKeys;
    const botAddress = this.botWalletAddress.toBase58();

    for (const post of tokenBalances) {
      const accountKey = keys[post.accountIndex];
      const ownerAddress =
        post.owner ??
        (typeof accountKey === 'object' && 'owner' in accountKey
          ? (accountKey as { owner?: string }).owner
          : undefined);

      if (ownerAddress !== botAddress) continue;

      // Find the pre-balance for this account
      const pre = preTokenBalances.find((b) => b.accountIndex === post.accountIndex);
      const preAmount = parseInt(pre?.uiTokenAmount?.amount ?? '0');
      const postAmount = parseInt(post.uiTokenAmount?.amount ?? '0');
      const delta = postAmount - preAmount;

      if (delta <= 0) continue; // Balance didn't increase

      // Only process supported tokens
      const mint = post.mint;
      if (!Object.values(DEPOSIT_TOKENS).some((t) => t.mint === mint)) continue;

      return { mint, amount: delta };
    }

    return null;
  }

  private extractMemo(tx: ParsedTransactionWithMeta): string | null {
    const instructions = tx.transaction.message.instructions;
    for (const ix of instructions) {
      if ('program' in ix && ix.program === 'spl-memo') {
        if ('parsed' in ix) return String(ix.parsed);
      }
      const programId =
        'programId' in ix
          ? typeof ix.programId === 'string'
            ? ix.programId
            : ix.programId.toBase58()
          : null;
      if (
        programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' ||
        programId === 'Memo1UhkJBfCR6MNB4GBYB8YHaiSyHrS'
      ) {
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
