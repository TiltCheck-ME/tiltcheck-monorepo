/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. */
/**
 * JustTheTip — Shared Rain Escrow Logic
 * Creates ephemeral Solana escrow keypairs, polls for funding,
 * and executes split payouts to linked wallets.
 * Used by dad-bot /rain, justthetip-bot /rain, and triviadrop.
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import crypto from 'crypto';

const COMMUNITY_WALLET = 'DLP9VYyuLze7VZ7oMG6S77YT3BxZZBDJniTFx1NeDcem';

// ── Escrow keypair encryption ──────────────────────────────────────────────────

export function encryptKeypair(secretKeyHex: string, password: string): string {
  const key = crypto.createHash('sha256').update(password).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const enc = Buffer.concat([cipher.update(secretKeyHex, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

export function decryptKeypair(encrypted: string, password: string): string {
  const [ivHex, encHex] = encrypted.split(':');
  const key = crypto.createHash('sha256').update(password).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
}

// ── Escrow creation ────────────────────────────────────────────────────────────

export interface EscrowConfig {
  amountSol: number;
  rpcUrl?: string;
}

export interface Escrow {
  keypair: Keypair;
  publicKey: string;
  lamports: number;
  solanaPayUrl: string;
}

export function createEscrow(config: EscrowConfig): Escrow {
  const keypair = Keypair.generate();
  const lamports = Math.floor(config.amountSol * LAMPORTS_PER_SOL);
  const solanaPayUrl = `solana:${keypair.publicKey.toBase58()}?amount=${config.amountSol.toFixed(4)}&label=TiltCheckEscrow&message=TiltCheck+Escrow`;

  return { keypair, publicKey: keypair.publicKey.toBase58(), lamports, solanaPayUrl };
}

// ── Funding poll ───────────────────────────────────────────────────────────────

export async function pollForFunding(
  publicKey: PublicKey,
  requiredLamports: number,
  options?: { rpcUrl?: string; attempts?: number; intervalMs?: number },
): Promise<boolean> {
  const rpcUrl = options?.rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const attempts = options?.attempts ?? 30;
  const intervalMs = options?.intervalMs ?? 5000;
  const connection = new Connection(rpcUrl, 'confirmed');

  for (let i = 0; i < attempts; i++) {
    const balance = await connection.getBalance(publicKey).catch(() => 0);
    if (balance >= requiredLamports) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

// ── Split payout ───────────────────────────────────────────────────────────────

export interface PayoutRecipient {
  userId: string;
  walletAddress: string | null; // null = send to community wallet
}

export interface PayoutResult {
  success: boolean;
  signature?: string;
  payouts: Array<{ userId: string; destination: string; lamports: number; linked: boolean }>;
  dustLamports: number;
  error?: string;
}

export async function executeSplitPayout(
  escrowKeypair: Keypair,
  totalLamports: number,
  recipients: PayoutRecipient[],
  options?: { rpcUrl?: string },
): Promise<PayoutResult> {
  if (recipients.length === 0) {
    return { success: false, payouts: [], dustLamports: totalLamports, error: 'No recipients' };
  }

  const rpcUrl = options?.rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  const sharePerUser = Math.floor(totalLamports / recipients.length);
  const transaction = new Transaction();
  const payouts: PayoutResult['payouts'] = [];
  let totalPaid = 0;

  for (const r of recipients) {
    const dest = r.walletAddress || COMMUNITY_WALLET;
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: escrowKeypair.publicKey,
        toPubkey: new PublicKey(dest),
        lamports: sharePerUser,
      }),
    );
    totalPaid += sharePerUser;
    payouts.push({ userId: r.userId, destination: dest, lamports: sharePerUser, linked: !!r.walletAddress });
  }

  const dust = totalLamports - totalPaid;
  if (dust > 0) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: escrowKeypair.publicKey,
        toPubkey: new PublicKey(COMMUNITY_WALLET),
        lamports: dust,
      }),
    );
  }

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [escrowKeypair]);
    return { success: true, signature, payouts, dustLamports: dust };
  } catch (err) {
    return { success: false, payouts, dustLamports: dust, error: err instanceof Error ? err.message : 'Payout failed' };
  }
}

// ── Refund to host ─────────────────────────────────────────────────────────────

export async function refundToWallet(
  escrowKeypair: Keypair,
  lamports: number,
  walletAddress: string,
  options?: { rpcUrl?: string },
): Promise<{ success: boolean; signature?: string; error?: string }> {
  const rpcUrl = options?.rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  try {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: escrowKeypair.publicKey,
        toPubkey: new PublicKey(walletAddress),
        lamports,
      }),
    );
    const signature = await sendAndConfirmTransaction(connection, tx, [escrowKeypair]);
    return { success: true, signature };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Refund failed' };
  }
}

export { COMMUNITY_WALLET };
