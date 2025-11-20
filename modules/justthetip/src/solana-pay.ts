/**
 * Solana Pay Integration
 * Generate payment requests that users sign with their own wallets
 */

import { PublicKey, Transaction, SystemProgram, Connection } from '@solana/web3.js';
import { encodeURL, createQR } from '@solana/pay';
import BigNumber from 'bignumber.js';

export interface SolanaPayRequest {
  url: string;
  qrCode: string; // Base64 encoded PNG
  transaction: Transaction;
}

/**
 * Create a Solana Pay transfer URL
 * Users scan this QR code with their Solana wallet to approve the transaction
 */
export async function createTransferRequest(
  recipientAddress: string,
  amountSOL: number,
  label?: string,
  message?: string,
): Promise<{ url: string; qrCode: string }> {
  const recipient = new PublicKey(recipientAddress);

  // Create Solana Pay URL
  const url = encodeURL({
    recipient,
    amount: new BigNumber(amountSOL),
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
