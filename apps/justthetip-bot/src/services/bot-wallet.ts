/**
 * Bot Wallet Service
 *
 * Manages the bot's custodial Solana wallet for sending SOL on behalf of users.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import bs58 from 'bs58';

// Safety limits
const MAX_SEND_LAMPORTS = 5 * LAMPORTS_PER_SOL; // 5 SOL per tx cap
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_TXS = 30;

export class BotWalletService {
  private keypair: Keypair;
  private connection: Connection;
  private recentTxTimestamps: number[] = [];

  readonly address: string;

  constructor(privateKey: string, connection: Connection) {
    this.keypair = this.parsePrivateKey(privateKey);
    this.connection = connection;
    this.address = this.keypair.publicKey.toBase58();
  }

  private parsePrivateKey(key: string): Keypair {
    // Try JSON array format first
    const trimmed = key.trim();
    if (trimmed.startsWith('[')) {
      const arr = JSON.parse(trimmed) as number[];
      return Keypair.fromSecretKey(Uint8Array.from(arr));
    }
    // Base58 format
    const decoded = bs58.decode(trimmed);
    return Keypair.fromSecretKey(decoded);
  }

  async getBalance(): Promise<number> {
    return this.connection.getBalance(this.keypair.publicKey);
  }

  async sendSOL(toAddress: string, amountLamports: number): Promise<string> {
    // Safety: per-tx cap
    if (amountLamports > MAX_SEND_LAMPORTS) {
      throw new Error(`Amount exceeds per-transaction cap of ${MAX_SEND_LAMPORTS / LAMPORTS_PER_SOL} SOL`);
    }

    if (amountLamports <= 0) {
      throw new Error('Amount must be positive');
    }

    // Rate limiting
    this.cleanupRateLimit();
    if (this.recentTxTimestamps.length >= RATE_LIMIT_MAX_TXS) {
      throw new Error('Rate limit exceeded. Please try again in a minute.');
    }

    // Balance check
    const balance = await this.getBalance();
    // Need enough for amount + tx fee (~5000 lamports)
    if (balance < amountLamports + 10_000) {
      throw new Error('Bot wallet has insufficient funds');
    }

    const toPubkey = new PublicKey(toAddress);

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.keypair.publicKey,
        toPubkey,
        lamports: amountLamports,
      })
    );

    const signature = await sendAndConfirmTransaction(this.connection, tx, [this.keypair]);

    this.recentTxTimestamps.push(Date.now());

    console.log(`[BotWallet] Sent ${amountLamports / LAMPORTS_PER_SOL} SOL to ${toAddress.slice(0, 8)}... (sig: ${signature.slice(0, 16)}...)`);

    return signature;
  }

  async getRecentTransactions(limit = 20) {
    return this.connection.getSignaturesForAddress(this.keypair.publicKey, { limit });
  }

  private cleanupRateLimit(): void {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
    this.recentTxTimestamps = this.recentTxTimestamps.filter(ts => ts > cutoff);
  }
}
