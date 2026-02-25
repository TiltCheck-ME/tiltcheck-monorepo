/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Auto-Refund Scheduler
 *
 * Runs periodically to:
 * 1. Refund expired pending tips (credit back to sender)
 * 2. Auto-refund stale balances (send on-chain to user's registered wallet)
 */

import { CreditManager } from './credit-manager.js';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

type SendRefundCallback = (walletAddress: string, amountLamports: number) => Promise<string | null>;

export class AutoRefundScheduler {
  private creditManager: CreditManager;
  private sendRefund: SendRefundCallback;
  private timer: ReturnType<typeof setInterval> | null = null;
  private intervalMs: number;

  constructor(
    creditManager: CreditManager,
    sendRefund: SendRefundCallback,
    intervalMs = DEFAULT_INTERVAL_MS
  ) {
    this.creditManager = creditManager;
    this.sendRefund = sendRefund;
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.timer) return;
    console.log(`[AutoRefund] Started scheduler (interval: ${this.intervalMs / 1000}s)`);
    this.timer = setInterval(() => this.run(), this.intervalMs);
    // Run once on start after a short delay
    setTimeout(() => this.run(), 5000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[AutoRefund] Stopped scheduler');
    }
  }

  async run(): Promise<{ pendingRefunded: number; staleRefunded: number }> {
    let pendingRefunded = 0;
    let staleRefunded = 0;

    try {
      // 1. Refund expired pending tips
      pendingRefunded = await this.creditManager.refundExpiredPendingTips();
      if (pendingRefunded > 0) {
        console.log(`[AutoRefund] Refunded ${pendingRefunded} expired pending tip(s)`);
      }
    } catch (err) {
      console.error('[AutoRefund] Error refunding pending tips:', err);
    }

    try {
      // 2. Auto-refund stale balances via on-chain transfer
      const staleBalances = await this.creditManager.getStaleBalancesForRefund();
      for (const balance of staleBalances) {
        if (!balance.wallet_address || balance.balance_lamports <= 0) continue;

        try {
          const signature = await this.sendRefund(balance.wallet_address, balance.balance_lamports);
          if (signature) {
            await this.creditManager.refund(balance.discord_id, 'auto-refund: inactivity');
            staleRefunded++;
            console.log(
              `[AutoRefund] Refunded ${balance.balance_lamports} lamports to ${balance.discord_id} (${balance.wallet_address.slice(0, 8)}...)`
            );
          }
        } catch (err) {
          console.error(`[AutoRefund] Failed to refund ${balance.discord_id}:`, err);
        }
      }

      if (staleRefunded > 0) {
        console.log(`[AutoRefund] Refunded ${staleRefunded} stale balance(s)`);
      }
    } catch (err) {
      console.error('[AutoRefund] Error processing stale balances:', err);
    }

    return { pendingRefunded, staleRefunded };
  }
}
