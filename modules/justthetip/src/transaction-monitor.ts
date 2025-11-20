/**
 * Transaction Monitor
 * Listens for Solana transaction confirmations
 */

import { Connection } from '@solana/web3.js';
import { eventRouter } from '@tiltcheck/event-router';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

interface PendingTransaction {
  signature: string;
  userId: string;
  type: 'tip' | 'airdrop';
  amount: number;
  recipientId?: string;
  timestamp: number;
}

const pendingTransactions = new Map<string, PendingTransaction>();

/**
 * Track a transaction for confirmation
 */
export function trackTransaction(
  signature: string,
  userId: string,
  type: 'tip' | 'airdrop',
  amount: number,
  recipientId?: string
): void {
  pendingTransactions.set(signature, {
    signature,
    userId,
    type,
    amount,
    recipientId,
    timestamp: Date.now(),
  });

  // Start monitoring
  monitorTransaction(signature).catch(error => {
    console.error(`[TransactionMonitor] Failed to monitor ${signature}:`, error);
  });
}

/**
 * Monitor a transaction until confirmed or failed
 */
async function monitorTransaction(signature: string): Promise<void> {
  const tx = pendingTransactions.get(signature);
  if (!tx) return;

  try {
    console.log(`[TransactionMonitor] Monitoring ${signature}...`);

    // Wait for confirmation (30s timeout)
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      // Transaction failed
      console.error(`[TransactionMonitor] ${signature} failed:`, confirmation.value.err);
      
      void eventRouter.publish('tip.failed', 'justthetip', {
        signature,
        userId: tx.userId,
        recipientId: tx.recipientId,
        amount: tx.amount,
        error: JSON.stringify(confirmation.value.err),
      });

      pendingTransactions.delete(signature);
      return;
    }

    // Transaction succeeded
    console.log(`[TransactionMonitor] ✅ ${signature} confirmed!`);

    if (tx.type === 'tip') {
      void eventRouter.publish('tip.confirmed', 'justthetip', {
        signature,
        userId: tx.userId,
        recipientId: tx.recipientId,
        amount: tx.amount,
        timestamp: Date.now(),
      });
    } else {
      void eventRouter.publish('airdrop.confirmed', 'justthetip', {
        signature,
        userId: tx.userId,
        amount: tx.amount,
        timestamp: Date.now(),
      });
    }

    pendingTransactions.delete(signature);
  } catch (error) {
    console.error(`[TransactionMonitor] Error monitoring ${signature}:`, error);
    
    // Retry after 5 seconds (max 3 retries)
    const retryCount = (tx as any).retryCount || 0;
    if (retryCount < 3) {
      (tx as any).retryCount = retryCount + 1;
      setTimeout(() => monitorTransaction(signature), 5000);
    } else {
      pendingTransactions.delete(signature);
    }
  }
}

/**
 * Clean up old pending transactions (older than 5 minutes)
 */
export function cleanupPendingTransactions(): void {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  
  for (const [signature, tx] of pendingTransactions.entries()) {
    if (tx.timestamp < fiveMinutesAgo) {
      console.log(`[TransactionMonitor] Cleaning up stale transaction: ${signature}`);
      pendingTransactions.delete(signature);
    }
  }
}

// Clean up every minute
setInterval(cleanupPendingTransactions, 60 * 1000);

console.log('[TransactionMonitor] Transaction monitor initialized');
