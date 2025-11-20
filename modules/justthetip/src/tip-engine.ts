/**
 * Tip Engine
 * Handles direct wallet-to-wallet SOL transfers
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
} from '@solana/web3.js';
import { eventRouter } from '@tiltcheck/event-router';
import { pricingOracle } from '@tiltcheck/pricing-oracle';
import { getWallet } from './wallet-manager.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const FLAT_FEE_SOL = 0.0007; // ~$0.07 at $100/SOL

const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export interface TipRequest {
  senderId: string;
  recipientId: string;
  amount: number; // SOL or USD depending on currency
  currency: 'SOL' | 'USD';
  isAll?: boolean; // Send full balance
}

export interface TipResult {
  success: boolean;
  tipId: string;
  signature?: string;
  amount: number; // Actual SOL sent
  fee: number; // Fee deducted
  error?: string;
}

interface PendingTip {
  id: string;
  senderId: string;
  recipientId: string;
  amount: number; // SOL
  createdAt: number;
  expiresAt: number;
}

const pendingTips = new Map<string, PendingTip[]>(); // recipientId → tips

// Persistence (simple JSON file) -------------------------------------------------
const PENDING_TIPS_PATH = process.env.PENDING_TIPS_STORE_PATH || path.join(process.cwd(), 'data', 'pending-tips.json');

function ensureStoreDir(): void {
  const dir = path.dirname(PENDING_TIPS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadPendingTipsFromDisk(): void {
  try {
    if (fs.existsSync(PENDING_TIPS_PATH)) {
      const raw = fs.readFileSync(PENDING_TIPS_PATH, 'utf8');
      const data: PendingTip[] = JSON.parse(raw);
      for (const tip of data) {
        if (!pendingTips.has(tip.recipientId)) pendingTips.set(tip.recipientId, []);
        pendingTips.get(tip.recipientId)!.push(tip);
      }
      console.log(`[JustTheTip] Loaded ${data.length} pending tips from disk`);
    }
  } catch (error) {
    console.error('[JustTheTip] Failed to load pending tips store:', error);
  }
}

function savePendingTipsToDisk(): void {
  try {
    ensureStoreDir();
    const all: PendingTip[] = [];
    for (const arr of pendingTips.values()) all.push(...arr);
    fs.writeFileSync(PENDING_TIPS_PATH, JSON.stringify(all, null, 2), 'utf8');
  } catch (error) {
    console.error('[JustTheTip] Failed to persist pending tips store:', error);
  }
}

// Load at module init
loadPendingTipsFromDisk();

// Periodic flush (every 30s)
setInterval(() => savePendingTipsToDisk(), 30_000).unref();

/**
 * Execute tip (non-custodial, requires sender signature)
 */
export async function executeTip(request: TipRequest, senderKeypair: Keypair): Promise<TipResult> {
  const tipId = uuidv4();
  
  try {
    // Get sender wallet
    const senderWallet = getWallet(request.senderId);
    if (!senderWallet) {
      return {
        success: false,
        tipId,
        amount: 0,
        fee: 0,
        error: 'Sender wallet not registered',
      };
    }

    // Get recipient wallet
    const recipientWallet = getWallet(request.recipientId);
    if (!recipientWallet) {
      // Create pending tip
      const amount = request.currency === 'USD'
        ? request.amount / pricingOracle.getUsdPrice('SOL')
        : request.amount;
      
      const pending: PendingTip = {
        id: tipId,
        senderId: request.senderId,
        recipientId: request.recipientId,
        amount,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      if (!pendingTips.has(request.recipientId)) {
        pendingTips.set(request.recipientId, []);
      }
      pendingTips.get(request.recipientId)!.push(pending);
      savePendingTipsToDisk();

      void eventRouter.publish('tip.pending', 'justthetip', {
        tipId,
        senderId: request.senderId,
        recipientId: request.recipientId,
        amount,
        expiresAt: pending.expiresAt,
      });

      return {
        success: true,
        tipId,
        amount,
        fee: FLAT_FEE_SOL,
        error: 'Recipient not registered - tip pending for 24h',
      };
    }

    // Convert to SOL if needed
    let amountSol = request.amount;
    if (request.currency === 'USD') {
      amountSol = request.amount / pricingOracle.getUsdPrice('SOL');
    }

    // Handle "all" - get sender balance
    if (request.isAll) {
      const senderPubkey = new PublicKey(senderWallet.address);
      const balance = await connection.getBalance(senderPubkey);
      amountSol = (balance / LAMPORTS_PER_SOL) - FLAT_FEE_SOL - 0.001; // Reserve for rent + gas
    }

    // Deduct flat fee
    const netAmount = amountSol - FLAT_FEE_SOL;
    
    if (netAmount <= 0) {
      return {
        success: false,
        tipId,
        amount: 0,
        fee: FLAT_FEE_SOL,
        error: 'Amount too small after fee deduction',
      };
    }

    // Create transfer transaction
    const senderPubkey = new PublicKey(senderWallet.address);
    const recipientPubkey = new PublicKey(recipientWallet.address);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: senderPubkey,
        toPubkey: recipientPubkey,
        lamports: Math.floor(netAmount * LAMPORTS_PER_SOL),
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPubkey;

    // Sign transaction
    transaction.sign(senderKeypair);

    // Send transaction
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    // Confirm transaction
    await connection.confirmTransaction(signature, 'confirmed');

    // Emit success event
    void eventRouter.publish('tip.sent', 'justthetip', {
      tipId,
      senderId: request.senderId,
      recipientId: request.recipientId,
      amount: netAmount,
      fee: FLAT_FEE_SOL,
      signature,
      currency: request.currency,
    });

    console.log(`[JustTheTip] Tip sent: ${netAmount} SOL from ${request.senderId} to ${request.recipientId}`);

    return {
      success: true,
      tipId,
      signature,
      amount: netAmount,
      fee: FLAT_FEE_SOL,
    };
  } catch (error) {
    console.error('[JustTheTip] Tip execution failed:', error);
    
    void eventRouter.publish('tip.failed', 'justthetip', {
      tipId,
      senderId: request.senderId,
      recipientId: request.recipientId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      tipId,
      amount: 0,
      fee: 0,
      error: error instanceof Error ? error.message : 'Transaction failed',
    };
  }
}

/**
 * Get pending tips for user
 */
export function getPendingTips(userId: string): PendingTip[] {
  return pendingTips.get(userId) || [];
}

/**
 * Process pending tips when user registers wallet
 */
export async function processPendingTips(userId: string): Promise<void> {
  const pending = pendingTips.get(userId);
  if (!pending || pending.length === 0) return;

  console.log(`[JustTheTip] Processing ${pending.length} pending tips for ${userId}`);

  // Filter expired tips
  const now = Date.now();
  const validTips = pending.filter(tip => tip.expiresAt > now);
  const expiredTips = pending.filter(tip => tip.expiresAt <= now);

  // Return expired tips to senders
  for (const tip of expiredTips) {
    void eventRouter.publish('tip.expired', 'justthetip', {
      tipId: tip.id,
      senderId: tip.senderId,
      recipientId: tip.recipientId,
      amount: tip.amount,
    });
  }

  // TODO: Auto-process valid tips (requires stored sender signatures or escrow)
  // For now, just notify that user should re-initiate tips
  for (const tip of validTips) {
    void eventRouter.publish('tip.ready', 'justthetip', {
      tipId: tip.id,
      senderId: tip.senderId,
      recipientId: tip.recipientId,
      amount: tip.amount,
    });
  }

  // Clear processed tips
  pendingTips.delete(userId);
  savePendingTipsToDisk();
}

// Expose manual persistence helpers (optional external use)
export const pendingTipsPersistence = {
  save: savePendingTipsToDisk,
  load: loadPendingTipsFromDisk,
  path: PENDING_TIPS_PATH,
};
