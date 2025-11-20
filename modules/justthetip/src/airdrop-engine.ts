/**
 * Airdrop Engine
 * Handles multi-send airdrops with single flat fee
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

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const FLAT_FEE_SOL = 0.0007; // Single fee for entire airdrop

const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export interface AirdropRequest {
  senderId: string;
  recipientIds: string[];
  amountPerUser: number; // SOL or USD per recipient
  currency: 'SOL' | 'USD';
}

export interface AirdropResult {
  success: boolean;
  airdropId: string;
  signature?: string;
  totalAmount: number; // Total SOL sent
  recipientCount: number;
  fee: number;
  skippedRecipients: string[]; // Users without wallets
  error?: string;
}

/**
 * Execute airdrop to multiple recipients
 */
export async function executeAirdrop(request: AirdropRequest, senderKeypair: Keypair): Promise<AirdropResult> {
  const airdropId = uuidv4();
  
  try {
    // Get sender wallet
    const senderWallet = getWallet(request.senderId);
    if (!senderWallet) {
      return {
        success: false,
        airdropId,
        totalAmount: 0,
        recipientCount: 0,
        fee: 0,
        skippedRecipients: request.recipientIds,
        error: 'Sender wallet not registered',
      };
    }

    // Filter recipients with registered wallets
    const validRecipients: Array<{ userId: string; address: string }> = [];
    const skippedRecipients: string[] = [];

    for (const recipientId of request.recipientIds) {
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
        airdropId,
        totalAmount: 0,
        recipientCount: 0,
        fee: 0,
        skippedRecipients,
        error: 'No recipients have registered wallets',
      };
    }

    // Convert to SOL if needed
    let amountPerUserSol = request.amountPerUser;
    if (request.currency === 'USD') {
      amountPerUserSol = request.amountPerUser / pricingOracle.getUsdPrice('SOL');
    }

    const totalAmount = amountPerUserSol * validRecipients.length + FLAT_FEE_SOL;

    // Check sender balance
    const senderPubkey = new PublicKey(senderWallet.address);
    const senderBalance = await connection.getBalance(senderPubkey);
    const senderBalanceSol = senderBalance / LAMPORTS_PER_SOL;

    if (senderBalanceSol < totalAmount + 0.001) {
      return {
        success: false,
        airdropId,
        totalAmount: 0,
        recipientCount: 0,
        fee: 0,
        skippedRecipients,
        error: `Insufficient balance. Need ${totalAmount.toFixed(4)} SOL, have ${senderBalanceSol.toFixed(4)} SOL`,
      };
    }

    // Create multi-transfer transaction
    const transaction = new Transaction();

    for (const recipient of validRecipients) {
      const recipientPubkey = new PublicKey(recipient.address);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: senderPubkey,
          toPubkey: recipientPubkey,
          lamports: Math.floor(amountPerUserSol * LAMPORTS_PER_SOL),
        })
      );
    }

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
    void eventRouter.publish('airdrop.completed', 'justthetip', {
      airdropId,
      senderId: request.senderId,
      recipientIds: validRecipients.map(r => r.userId),
      amountPerUser: amountPerUserSol,
      totalAmount: amountPerUserSol * validRecipients.length,
      recipientCount: validRecipients.length,
      fee: FLAT_FEE_SOL,
      signature,
      skippedCount: skippedRecipients.length,
    });

    console.log(`[JustTheTip] Airdrop sent: ${amountPerUserSol} SOL to ${validRecipients.length} recipients`);

    return {
      success: true,
      airdropId,
      signature,
      totalAmount: amountPerUserSol * validRecipients.length,
      recipientCount: validRecipients.length,
      fee: FLAT_FEE_SOL,
      skippedRecipients,
    };
  } catch (error) {
    console.error('[JustTheTip] Airdrop execution failed:', error);

    void eventRouter.publish('airdrop.failed', 'justthetip', {
      airdropId,
      senderId: request.senderId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      airdropId,
      totalAmount: 0,
      recipientCount: 0,
      fee: 0,
      skippedRecipients: request.recipientIds,
      error: error instanceof Error ? error.message : 'Transaction failed',
    };
  }
}
