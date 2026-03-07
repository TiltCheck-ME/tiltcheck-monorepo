/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Prize Distribution Engine
 * Non-custodial Solana Pay prize distribution for JustTheTip
 * 
 * Features:
 * - Admin-triggered prize distributions
 * - Non-custodial flow (admin signs transactions)
 * - Flat fee respected
 * - Transaction logging and status tracking
 * - Network and wallet error handling
 */

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createQR } from '@solana/pay';
import { eventRouter } from '@tiltcheck/event-router';
import { getWallet, hasWallet } from './wallet-manager.js';
import { v4 as uuidv4 } from 'uuid';

const FLAT_FEE_SOL = 0.0007; // ~$0.07 at $100/SOL
const FEE_WALLET = process.env.JUSTTHETIP_FEE_WALLET || '';

// Admin users who can trigger prize distributions (Discord user IDs)
const ADMIN_USER_IDS = new Set(
  (process.env.PRIZE_ADMIN_USER_IDS || '').split(',').filter(id => id.trim())
);

// Prize distribution status tracking
export interface PrizeDistribution {
  id: string;
  hostId: string;
  context: 'trivia' | 'airdrop' | 'custom';
  totalPrize: number;
  recipientIds: string[];
  prizePerRecipient: number;
  status: 'pending' | 'ready' | 'distributed' | 'failed' | 'expired';
  paymentUrl?: string;
  signature?: string;
  createdAt: number;
  updatedAt: number;
  error?: string;
  // Transaction details for on-chain confirmation
  txDetails?: {
    blockhash: string;
    lastValidBlockHeight: number;
  };
}

// Active prize distributions
const prizeDistributions = new Map<string, PrizeDistribution>();

// Transaction log for auditing
export interface TransactionLog {
  id: string;
  distributionId: string;
  action: 'created' | 'signed' | 'confirmed' | 'failed';
  signature?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

const transactionLogs: TransactionLog[] = [];

/**
 * Check if a user is an admin for prize distribution
 */
export function isAdmin(userId: string): boolean {
  // Allow all users if no admin list is configured (dev mode)
  if (ADMIN_USER_IDS.size === 0) {
    return true;
  }
  return ADMIN_USER_IDS.has(userId);
}

/**
 * Create a prize distribution request
 * Returns a Solana Pay URL for the admin to sign
 */
export async function createPrizeDistribution(
  connection: Connection,
  hostId: string,
  recipientIds: string[],
  totalPrize: number,
  context: 'trivia' | 'airdrop' | 'custom' = 'trivia'
): Promise<{
  success: boolean;
  distribution?: PrizeDistribution;
  paymentUrl?: string;
  qrCode?: string;
  error?: string;
  skippedRecipients?: string[];
}> {
  const distributionId = uuidv4();

  // Log creation attempt
  logTransaction(distributionId, 'created', undefined, { hostId, recipientIds, totalPrize, context });

  try {
    // Validate host has wallet
    if (!hasWallet(hostId)) {
      return {
        success: false,
        error: 'Host does not have a registered wallet. Please register using /tip wallet first.',
      };
    }

    const hostWallet = getWallet(hostId);
    if (!hostWallet) {
      return {
        success: false,
        error: 'Host wallet not found',
      };
    }

    // Filter recipients with wallets
    const validRecipients: Array<{ userId: string; address: string }> = [];
    const skippedRecipients: string[] = [];

    for (const recipientId of recipientIds) {
      const wallet = getWallet(recipientId);
      if (wallet) {
        validRecipients.push({ userId: recipientId, address: wallet.address });
      } else {
        skippedRecipients.push(recipientId);
      }
    }

    if (validRecipients.length === 0) {
      return {
        success: false,
        error: 'No recipients have registered wallets. Prizes cannot be distributed.',
        skippedRecipients: recipientIds,
      };
    }

    // Calculate prize per recipient
    const prizePerRecipient = totalPrize / validRecipients.length;

    // Build the transaction
    const sender = new PublicKey(hostWallet.address);
    const transaction = new Transaction();

    // Add prize transfers for each recipient
    for (const recipient of validRecipients) {
      const recipientPubkey = new PublicKey(recipient.address);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: sender,
          toPubkey: recipientPubkey,
          lamports: Math.floor(prizePerRecipient * LAMPORTS_PER_SOL),
        })
      );
    }

    // Add flat fee transfer if configured
    if (FEE_WALLET) {
      const feeAccount = new PublicKey(FEE_WALLET);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: sender,
          toPubkey: feeAccount,
          lamports: Math.floor(FLAT_FEE_SOL * LAMPORTS_PER_SOL),
        })
      );
    }

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sender;

    // Serialize transaction for Solana Pay
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    const base64 = serialized.toString('base64');
    const paymentUrl = `solana:${base64}`;

    // Generate QR code
    let qrCode: string | undefined;
    try {
      const qr = createQR(paymentUrl);
      const qrBlob = await qr.getRawData('png');
      if (qrBlob) {
        const qrArrayBuffer = await qrBlob.arrayBuffer();
        qrCode = Buffer.from(qrArrayBuffer).toString('base64');
      }
    } catch (qrError) {
      console.warn('[PrizeDistribution] Failed to generate QR code:', qrError);
    }

    // Create distribution record
    const distribution: PrizeDistribution = {
      id: distributionId,
      hostId,
      context,
      totalPrize,
      recipientIds: validRecipients.map(r => r.userId),
      prizePerRecipient,
      status: 'ready',
      paymentUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      txDetails: {
        blockhash,
        lastValidBlockHeight,
      },
    };

    // Store distribution
    prizeDistributions.set(distributionId, distribution);

    // Emit event
    void eventRouter.publish('prize.created', 'justthetip', {
      distributionId,
      hostId,
      context,
      totalPrize,
      prizePerRecipient,
      recipientCount: validRecipients.length,
      skippedCount: skippedRecipients.length,
    });

    console.log(`[PrizeDistribution] Created distribution ${distributionId}: ${totalPrize} SOL to ${validRecipients.length} recipients`);

    return {
      success: true,
      distribution,
      paymentUrl,
      qrCode,
      skippedRecipients: skippedRecipients.length > 0 ? skippedRecipients : undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PrizeDistribution] Failed to create distribution:', error);

    logTransaction(distributionId, 'failed', undefined, { error: errorMessage });

    void eventRouter.publish('prize.failed', 'justthetip', {
      distributionId,
      hostId,
      error: errorMessage,
    });

    return {
      success: false,
      error: `Failed to create prize distribution: ${errorMessage}`,
    };
  }
}

/**
 * Monitor a prize distribution for on-chain confirmation
 * Should be called after the host signs and submits the transaction
 */
export async function monitorPrizeDistribution(
  connection: Connection,
  distributionId: string,
  signature: string
): Promise<{
  success: boolean;
  confirmed: boolean;
  error?: string;
}> {
  const distribution = prizeDistributions.get(distributionId);
  if (!distribution) {
    return {
      success: false,
      confirmed: false,
      error: 'Distribution not found',
    };
  }

  logTransaction(distributionId, 'signed', signature);

  try {
    console.log(`[PrizeDistribution] Monitoring transaction ${signature} for distribution ${distributionId}`);

    // Update status
    distribution.signature = signature;
    distribution.status = 'pending';
    distribution.updatedAt = Date.now();

    // Wait for confirmation with timeout
    const confirmation = await Promise.race([
      connection.confirmTransaction(signature, 'confirmed'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction confirmation timeout (60s)')), 60000)
      ),
    ]) as Awaited<ReturnType<typeof connection.confirmTransaction>>;

    if (confirmation.value.err) {
      distribution.status = 'failed';
      distribution.error = JSON.stringify(confirmation.value.err);
      distribution.updatedAt = Date.now();

      logTransaction(distributionId, 'failed', signature, { error: confirmation.value.err });

      void eventRouter.publish('prize.failed', 'justthetip', {
        distributionId,
        signature,
        error: distribution.error,
      });

      return {
        success: false,
        confirmed: false,
        error: `Transaction failed: ${distribution.error}`,
      };
    }

    // Success!
    distribution.status = 'distributed';
    distribution.updatedAt = Date.now();

    logTransaction(distributionId, 'confirmed', signature, {
      recipientCount: distribution.recipientIds.length,
      totalPrize: distribution.totalPrize,
    });

    void eventRouter.publish('prize.distributed', 'justthetip', {
      distributionId,
      signature,
      hostId: distribution.hostId,
      recipientIds: distribution.recipientIds,
      totalPrize: distribution.totalPrize,
      prizePerRecipient: distribution.prizePerRecipient,
      context: distribution.context,
    });

    console.log(`[PrizeDistribution] ✅ Distribution ${distributionId} confirmed: ${signature}`);

    return {
      success: true,
      confirmed: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    distribution.status = 'failed';
    distribution.error = errorMessage;
    distribution.updatedAt = Date.now();

    logTransaction(distributionId, 'failed', signature, { error: errorMessage });

    console.error(`[PrizeDistribution] Failed to confirm distribution ${distributionId}:`, error);

    return {
      success: false,
      confirmed: false,
      error: errorMessage,
    };
  }
}

/**
 * Get a prize distribution by ID
 */
export function getPrizeDistribution(distributionId: string): PrizeDistribution | undefined {
  return prizeDistributions.get(distributionId);
}

/**
 * Get all prize distributions for a host
 */
export function getHostDistributions(hostId: string): PrizeDistribution[] {
  return Array.from(prizeDistributions.values())
    .filter(d => d.hostId === hostId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get transaction logs for a distribution
 */
export function getDistributionLogs(distributionId: string): TransactionLog[] {
  return transactionLogs.filter(log => log.distributionId === distributionId);
}

/**
 * Log a transaction event
 */
function logTransaction(
  distributionId: string,
  action: TransactionLog['action'],
  signature?: string,
  metadata?: Record<string, unknown>
): void {
  const log: TransactionLog = {
    id: uuidv4(),
    distributionId,
    action,
    signature,
    timestamp: Date.now(),
    metadata,
  };

  transactionLogs.push(log);

  // Keep only last 1000 logs to prevent memory issues
  if (transactionLogs.length > 1000) {
    transactionLogs.splice(0, transactionLogs.length - 1000);
  }
}

/**
 * Clean up expired distributions (older than 1 hour)
 */
export function cleanupExpiredDistributions(): number {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  let cleaned = 0;

  for (const [id, distribution] of prizeDistributions.entries()) {
    if (distribution.createdAt < oneHourAgo && distribution.status === 'ready') {
      distribution.status = 'expired';
      distribution.updatedAt = Date.now();
      prizeDistributions.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[PrizeDistribution] Cleaned up ${cleaned} expired distributions`);
  }

  return cleaned;
}

/**
 * Clear all prize distributions (for testing)
 */
export function clearPrizeDistributions(): void {
  prizeDistributions.clear();
  transactionLogs.length = 0;
}

// Clean up expired distributions every 10 minutes
setInterval(cleanupExpiredDistributions, 10 * 60 * 1000);

console.log('[PrizeDistribution] Prize distribution engine loaded');
