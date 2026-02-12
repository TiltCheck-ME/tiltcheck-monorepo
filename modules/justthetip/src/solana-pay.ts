/**
 * Solana Pay Integration
 * Generate payment requests that users sign with their own wallets
 */

import { PublicKey, Transaction, SystemProgram, Connection, Keypair } from '@solana/web3.js';
import { encodeURL, createQR } from '@solana/pay';
import BigNumber from 'bignumber.js';

const FLAT_FEE_SOL = 0.0007; // ~$0.07 at $100/SOL
const FEE_WALLET = process.env.JUSTTHETIP_FEE_WALLET || '';

export interface SolanaPayRequest {
  url: string;
  qrCode: string; // Base64 encoded PNG
  transaction: Transaction;
  reference?: string; // Reference public key for tracking
}

/**
 * Create a Solana Pay transfer URL
 * Users scan this QR code with their Solana wallet to approve the transaction
 * 
 * NOTE: This creates a simple transfer WITHOUT the TiltCheck fee.
 * For tips with fees, use createTipWithFeeRequest()
 */
export async function createTransferRequest(
  recipientAddress: string,
  amountSOL: number,
  label?: string,
  message?: string,
): Promise<{ url: string; qrCode: string; reference: string }> {
  const recipient = new PublicKey(recipientAddress);
  const reference = new Keypair().publicKey;

  // Create Solana Pay URL
  const url = encodeURL({
    recipient,
    amount: new BigNumber(amountSOL),
    reference,
    label: label || 'TiltCheck Tip',
    message: message || `Sending ${amountSOL} SOL`,
  });

  // Generate QR code as base64 PNG
  const qr = createQR(url);
  const qrBlob = await qr.getRawData('png');
  if (!qrBlob) {
    throw new Error('Failed to generate QR code');
  }
  const qrArrayBuffer = await qrBlob.arrayBuffer();
  const qrBase64 = Buffer.from(qrArrayBuffer).toString('base64');

  return {
    url: url.toString(),
    qrCode: qrBase64,
    reference: reference.toBase58(),
  };
}

/**
 * Create a tip request WITH TiltCheck fee included
 * Creates a transaction with two transfers: tip amount + 0.0007 SOL fee
 */
export async function createTipWithFeeRequest(
  connection: Connection,
  senderAddress: string,
  recipientAddress: string,
  amountSOL: number,
  label?: string,
): Promise<{ url: string; qrCode: string; reference: string }> {
  if (!FEE_WALLET) {
    console.warn('[SolanaPay] No fee wallet configured - fee will not be collected');
    // Fall back to simple transfer without fee
    return createTransferRequest(recipientAddress, amountSOL, label);
  }

  const sender = new PublicKey(senderAddress);
  const recipient = new PublicKey(recipientAddress);
  const feeAccount = new PublicKey(FEE_WALLET);
  const reference = new Keypair().publicKey;

  // Build transaction with tip + fee
  const transaction = new Transaction();

  // Add tip transfer
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: sender,
      toPubkey: recipient,
      lamports: Math.floor(amountSOL * 1e9),
    })
  );

  // Add fee transfer
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: sender,
      toPubkey: feeAccount,
      lamports: Math.floor(FLAT_FEE_SOL * 1e9),
    })
  );

  // Add reference to the first instruction for tracking
  transaction.instructions[0].keys.push({
    pubkey: reference,
    isSigner: false,
    isWritable: false,
  });

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = sender;

  // Serialize transaction for Solana Pay
  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  const base64 = serialized.toString('base64');

  // Create transaction request URL
  const url = `solana:${base64}`;

  // Generate QR code
  const qr = createQR(url);
  const qrBlob = await qr.getRawData('png');
  if (!qrBlob) {
    throw new Error('Failed to generate QR code');
  }
  const qrArrayBuffer = await qrBlob.arrayBuffer();
  const qrBase64 = Buffer.from(qrArrayBuffer).toString('base64');

  return {
    url,
    qrCode: qrBase64,
    reference: reference.toBase58(),
  };
}

/**
 * Create a transaction request URL for complex transactions
 * (multiple transfers, fee deduction, etc)
 */
export async function createTransactionRequest(
  connection: Connection,
  senderAddress: string,
  transfers: Array<{ to: string; amountSOL: number }>,
  feeRecipient: string,
  feeSOL: number,
): Promise<{ url: string; qrCode: string; transaction: Transaction }> {
  const sender = new PublicKey(senderAddress);
  const feeAccount = new PublicKey(feeRecipient);

  // Build transaction
  const transaction = new Transaction();

  // Add transfers
  for (const transfer of transfers) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: new PublicKey(transfer.to),
        lamports: Math.floor(transfer.amountSOL * 1e9),
      })
    );
  }

  // Add fee
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: sender,
      toPubkey: feeAccount,
      lamports: Math.floor(feeSOL * 1e9),
    })
  );

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = sender;

  // Serialize transaction for Solana Pay
  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  const base64 = serialized.toString('base64');

  // Create transaction request URL
  // Format: solana:<base64-transaction>
  const url = `solana:${base64}`;

  // Generate QR code
  const qr = createQR(url);
  const qrBlob = await qr.getRawData('png');
  if (!qrBlob) {
    throw new Error('Failed to generate QR code');
  }
  const qrArrayBuffer = await qrBlob.arrayBuffer();
  const qrBase64 = Buffer.from(qrArrayBuffer).toString('base64');

  return {
    url,
    qrCode: qrBase64,
    transaction,
  };
}

/**
 * Create an airdrop request (multi-transfer) WITH optional TiltCheck fee included.
 * Builds a transaction with N transfers (one per recipient) plus fee transfer if configured.
 */
export async function createAirdropWithFeeRequest(
  connection: Connection,
  senderAddress: string,
  recipientAddresses: string[],
  amountPerRecipientSOL: number,
): Promise<{ url: string; qrCode: string; transaction: Transaction }> {
  const sender = new PublicKey(senderAddress);
  const transaction = new Transaction();

  // Add transfers for each recipient
  for (const addr of recipientAddresses) {
    const recipient = new PublicKey(addr);
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: recipient,
        lamports: Math.floor(amountPerRecipientSOL * 1e9),
      })
    );
  }

  // Optional fee transfer
  if (FEE_WALLET) {
    const feeAccount = new PublicKey(FEE_WALLET);
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: feeAccount,
        lamports: Math.floor(FLAT_FEE_SOL * 1e9),
      })
    );
  } else {
    console.warn('[SolanaPay] No fee wallet configured - airdrop fee will not be collected');
  }

  // Blockhash + fee payer
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = sender;

  // Serialize (unsigned, user will sign)
  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  const base64 = serialized.toString('base64');
  const url = `solana:${base64}`;

  // Generate QR
  const qr = createQR(url);
  const qrBlob = await qr.getRawData('png');
  if (!qrBlob) throw new Error('Failed to generate QR code');
  const qrArrayBuffer = await qrBlob.arrayBuffer();
  const qrBase64 = Buffer.from(qrArrayBuffer).toString('base64');

  return { url, qrCode: qrBase64, transaction };
}
