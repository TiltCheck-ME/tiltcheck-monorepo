/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * JustTheTip - Solana Execution Service
 * Handles on-chain transaction creation and execution.
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
import { getUsdPriceSync } from '@tiltcheck/utils';
import { v4 as uuidv4 } from 'uuid';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const FLAT_FEE_SOL = 0.0007;
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export interface ExecutionResult {
  success: boolean;
  id: string;
  signature?: string;
  amount: number;
  fee: number;
  error?: string;
}

/**
 * Execute a direct tip (non-custodial execution via provided Keypair)
 */
export async function executeDirectTip(params: {
  senderId: string;
  senderAddress: string;
  recipientId: string;
  recipientAddress: string;
  amount: number;
  currency: 'SOL' | 'USD';
  senderKeypair: Keypair;
}): Promise<ExecutionResult> {
  const id = uuidv4();
  const { senderId, senderAddress, recipientId, recipientAddress, amount, currency, senderKeypair } = params;

  try {
    let amountSol = amount;
    if (currency === 'USD') {
      const solPrice = getUsdPriceSync('SOL');
      if (!solPrice || solPrice <= 0) {
        throw new Error('Unable to get current SOL price');
      }
      amountSol = amount / solPrice;
    }

    const netAmount = amountSol - FLAT_FEE_SOL;
    if (netAmount <= 0) {
      throw new Error('Amount too small after fee deduction');
    }

    const senderPubkey = new PublicKey(senderAddress);
    const recipientPubkey = new PublicKey(recipientAddress);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: senderPubkey,
        toPubkey: recipientPubkey,
        lamports: Math.floor(netAmount * LAMPORTS_PER_SOL),
      })
    );

    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPubkey;
    transaction.sign(senderKeypair);

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    await connection.confirmTransaction(signature, 'confirmed');

    void eventRouter.publish('tip.sent', 'justthetip', {
      tipId: id,
      senderId,
      recipientId,
      amount: netAmount,
      fee: FLAT_FEE_SOL,
      signature,
      currency,
    });

    return {
      success: true,
      id,
      signature,
      amount: netAmount,
      fee: FLAT_FEE_SOL,
    };
  } catch (error) {
    console.error('[JustTheTip] Execution failed:', error);
    return {
      success: false,
      id,
      amount: 0,
      fee: 0,
      error: error instanceof Error ? error.message : 'Transaction failed',
    };
  }
}

/**
 * Execute a multi-send airdrop using a single flat fee
 */
export async function executeAirdrop(params: {
  senderId: string;
  senderAddress: string;
  recipients: Array<{ userId: string; address: string }>;
  amountPerUser: number;
  currency: 'SOL' | 'USD' | 'LAMPORTS';
  senderKeypair: Keypair;
}): Promise<any> {
  const id = uuidv4();
  const { senderId, senderAddress, recipients, amountPerUser, currency, senderKeypair } = params;

  try {
    let amountPerUserSol = amountPerUser;
    if (currency === 'USD') {
      const solPrice = getUsdPriceSync('SOL');
      if (!solPrice || solPrice <= 0) throw new Error('Unabled to get current SOL price');
      amountPerUserSol = amountPerUser / solPrice;
    } else if (currency === 'LAMPORTS') {
      amountPerUserSol = amountPerUser / LAMPORTS_PER_SOL;
    }

    const transaction = new Transaction();
    const senderPubkey = new PublicKey(senderAddress);

    for (const recipient of recipients) {
      const recipientPubkey = new PublicKey(recipient.address);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: senderPubkey,
          toPubkey: recipientPubkey,
          lamports: Math.floor(amountPerUserSol * LAMPORTS_PER_SOL),
        })
      );
    }

    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPubkey;
    transaction.sign(senderKeypair);

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    await connection.confirmTransaction(signature, 'confirmed');

    void eventRouter.publish('airdrop.completed', 'justthetip', {
      airdropId: id,
      senderId,
      recipientIds: recipients.map(r => r.userId),
      amountPerUser: amountPerUserSol,
      totalAmount: amountPerUserSol * recipients.length,
      signature,
      currency,
    });

    return {
      success: true,
      id,
      signature,
      totalAmount: amountPerUserSol * recipients.length,
      recipientCount: recipients.length,
      fee: FLAT_FEE_SOL,
    };
  } catch (error) {
    console.error('[JustTheTip] Airdrop failed:', error);
    return {
      success: false,
      id,
      error: error instanceof Error ? error.message : 'Airdrop failed',
    };
  }
}
