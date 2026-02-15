/**
 * Transaction Monitor
 * Listens for Solana transaction confirmations
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { eventRouter } from '@tiltcheck/event-router';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

interface PendingTransaction {
  signature?: string;
  reference?: string;
  userId: string;
  type: 'tip' | 'airdrop';
  amount: number;
  recipientId?: string;
  timestamp: number;
  retryCount?: number;
}

const pendingTransactions = new Map<string, PendingTransaction>(); // key: signature OR reference

/**
 * Track a transaction for confirmation by signature
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
    retryCount: 0,
  });

  // Start monitoring
  monitorTransaction(signature).catch(error => {
    console.error(`[TransactionMonitor] Failed to monitor signature ${signature}:`, error);
  });
}

/**
 * Track a transaction for confirmation by reference public key
 */
export function trackTransactionByReference(
  reference: string,
  userId: string,
  type: 'tip' | 'airdrop',
  amount: number,
  recipientId?: string
): void {
  pendingTransactions.set(reference, {
    reference,
    userId,
    type,
    amount,
    recipientId,
    timestamp: Date.now(),
    retryCount: 0,
  });

  // Start monitoring
  monitorTransactionByReference(reference).catch(error => {
    console.error(`[TransactionMonitor] Failed to monitor reference ${reference}:`, error);
  });
}

/**
 * Monitor a transaction until confirmed or failed by signature
 */
async function monitorTransaction(signature: string): Promise<void> {
  const tx = pendingTransactions.get(signature);
  if (!tx) return;

  try {
    console.log(`[TransactionMonitor] Monitoring signature ${signature}...`);

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
    handleConfirmedTransaction(signature, tx);
    pendingTransactions.delete(signature);
  } catch (error) {
    console.error(`[TransactionMonitor] Error monitoring ${signature}:`, error);
    
    // Retry
    if ((tx.retryCount || 0) < 3) {
      tx.retryCount = (tx.retryCount || 0) + 1;
      setTimeout(() => monitorTransaction(signature), 5000);
    } else {
      pendingTransactions.delete(signature);
    }
  }
}

/**
 * Monitor a transaction until confirmed by reference
 */
async function monitorTransactionByReference(reference: string): Promise<void> {
  const tx = pendingTransactions.get(reference);
  if (!tx) return;

  try {
    console.log(`[TransactionMonitor] Polling for reference ${reference}...`);
    const refPubKey = new PublicKey(reference);

    // Look for transactions with this reference
    const signatures = await connection.getSignaturesForAddress(refPubKey, { limit: 1 }, 'confirmed');

    if (signatures.length > 0) {
      const signature = signatures[0].signature;
      console.log(`[TransactionMonitor] ✅ Found transaction for reference ${reference}: ${signature}`);
      
      handleConfirmedTransaction(signature, tx);
      pendingTransactions.delete(reference);
      return;
    }

    // Still pending, retry after 5 seconds (up to 20 times = 100 seconds)
    if ((tx.retryCount || 0) < 20) {
      tx.retryCount = (tx.retryCount || 0) + 1;
      setTimeout(() => monitorTransactionByReference(reference), 5000);
    } else {
      console.log(`[TransactionMonitor] Timeout waiting for reference ${reference}`);
      pendingTransactions.delete(reference);
    }
  } catch (error) {
    console.error(`[TransactionMonitor] Error polling reference ${reference}:`, error);
    setTimeout(() => monitorTransactionByReference(reference), 5000);
  }
}

function handleConfirmedTransaction(signature: string, tx: PendingTransaction) {
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
