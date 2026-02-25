/**
 * Token Swap Service — Bot-side Jupiter swap execution
 *
 * Unlike the non-custodial swap-engine in modules/justthetip (which returns a
 * Solana Pay URL for the user to sign), this service executes swaps using the
 * BOT'S keypair. Used when users send SPL tokens to the bot wallet for deposit.
 *
 * Flow:
 *   1. User sends any supported SPL token to bot wallet (with JTT-XXXXXX memo)
 *   2. DepositMonitor detects the token transfer, calls this service
 *   3. Bot executes Jupiter swap: token → SOL using its own keypair
 *   4. CreditManager credits the resulting SOL to the user's balance
 */

import {
  Connection,
  Keypair,
  VersionedTransaction,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import bs58 from 'bs58';

const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Supported input tokens for deposits (symbol → mint address + decimals)
export const DEPOSIT_TOKENS: Record<string, { mint: string; decimals: number; name: string }> = {
  SOL: { mint: SOL_MINT, decimals: 9, name: 'Solana' },
  USDC: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, name: 'USD Coin' },
  USDT: { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, name: 'Tether USD' },
  BONK: { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5, name: 'Bonk' },
  JUP: { mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, name: 'Jupiter' },
  RAY: { mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', decimals: 6, name: 'Raydium' },
  WBTC: { mint: '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh', decimals: 8, name: 'Wrapped BTC' },
  WETH: { mint: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', decimals: 8, name: 'Wrapped ETH' },
  ORCA: { mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', decimals: 6, name: 'Orca' },
};

export interface SwapDepositResult {
  success: boolean;
  inputToken: string;
  inputAmount: number; // in smallest units
  outputLamports: number; // SOL received after swap
  signature?: string;
  error?: string;
}

export class TokenSwapService {
  private keypair: Keypair;
  private connection: Connection;
  private feeWallet: string | undefined;

  constructor(privateKeyOrKeypair: string | Keypair, connection: Connection) {
    if (typeof privateKeyOrKeypair === 'string') {
      const trimmed = privateKeyOrKeypair.trim();
      if (trimmed.startsWith('[')) {
        const arr = JSON.parse(trimmed) as number[];
        this.keypair = Keypair.fromSecretKey(Uint8Array.from(arr));
      } else {
        this.keypair = Keypair.fromSecretKey(bs58.decode(trimmed));
      }
    } else {
      this.keypair = privateKeyOrKeypair;
    }
    this.connection = connection;
    this.feeWallet = process.env.JUSTTHETIP_FEE_WALLET;
  }

  get address(): string {
    return this.keypair.publicKey.toBase58();
  }

  /**
   * Get a Jupiter quote for swapping a token to SOL
   */
  async getQuote(
    inputMint: string,
    inputAmountSmallest: number,
    slippageBps = 100 // 1% default for bot swaps
  ): Promise<{ outAmount: number; priceImpactPct: number; quoteResponse: unknown } | null> {
    const params = new URLSearchParams({
      inputMint,
      outputMint: SOL_MINT,
      amount: inputAmountSmallest.toString(),
      slippageBps: slippageBps.toString(),
      onlyDirectRoutes: 'false',
    });

    // Add platform fee if configured
    if (this.feeWallet) {
      params.set('platformFeeBps', '70'); // 0.7% platform fee
    }

    try {
      const res = await fetch(`${JUPITER_QUOTE_API}/quote?${params}`);
      if (!res.ok) {
        const err = await res.text();
        console.error(`[TokenSwap] Jupiter quote error ${res.status}:`, err);
        return null;
      }
      const data = await res.json() as { outAmount: string; priceImpactPct: string };
      return {
        outAmount: parseInt(data.outAmount),
        priceImpactPct: parseFloat(data.priceImpactPct),
        quoteResponse: data,
      };
    } catch (err) {
      console.error('[TokenSwap] Quote fetch error:', err);
      return null;
    }
  }

  /**
   * Execute a Jupiter swap using the bot's keypair
   * Returns the amount of SOL lamports received
   */
  async swapTokenToSOL(
    inputMint: string,
    inputAmountSmallest: number,
    slippageBps = 100
  ): Promise<SwapDepositResult> {
    const tokenSymbol = Object.entries(DEPOSIT_TOKENS).find(
      ([, t]) => t.mint === inputMint
    )?.[0] ?? inputMint.slice(0, 8);

    // Skip if already SOL
    if (inputMint === SOL_MINT) {
      return {
        success: true,
        inputToken: 'SOL',
        inputAmount: inputAmountSmallest,
        outputLamports: inputAmountSmallest,
      };
    }

    // Step 1: Get quote
    const quote = await this.getQuote(inputMint, inputAmountSmallest, slippageBps);
    if (!quote) {
      return {
        success: false,
        inputToken: tokenSymbol,
        inputAmount: inputAmountSmallest,
        outputLamports: 0,
        error: 'Failed to get Jupiter swap quote',
      };
    }

    // Reject if price impact is too high (>5%)
    if (quote.priceImpactPct > 5) {
      return {
        success: false,
        inputToken: tokenSymbol,
        inputAmount: inputAmountSmallest,
        outputLamports: 0,
        error: `Price impact too high: ${quote.priceImpactPct.toFixed(2)}%. Swap rejected.`,
      };
    }

    // Step 2: Get swap transaction
    try {
      const swapBody: Record<string, unknown> = {
        quoteResponse: quote.quoteResponse,
        userPublicKey: this.keypair.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      };

      if (this.feeWallet) {
        swapBody.feeAccount = this.feeWallet;
      }

      const swapRes = await fetch(`${JUPITER_QUOTE_API}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(swapBody),
      });

      if (!swapRes.ok) {
        const err = await swapRes.text();
        console.error(`[TokenSwap] Swap tx error ${swapRes.status}:`, err);
        return {
          success: false,
          inputToken: tokenSymbol,
          inputAmount: inputAmountSmallest,
          outputLamports: 0,
          error: `Failed to build swap transaction: ${swapRes.status}`,
        };
      }

      const swapData = await swapRes.json() as { swapTransaction: string };

      // Step 3: Sign and send transaction with bot keypair
      const txBytes = Buffer.from(swapData.swapTransaction, 'base64');
      const tx = VersionedTransaction.deserialize(txBytes);
      tx.sign([this.keypair]);

      const signature = await this.connection.sendTransaction(tx, {
        maxRetries: 3,
        skipPreflight: false,
      });

      // Wait for confirmation
      const latestBlockhash = await this.connection.getLatestBlockhash();
      await this.connection.confirmTransaction(
        { signature, ...latestBlockhash },
        'confirmed'
      );

      console.log(
        `[TokenSwap] Swapped ${inputAmountSmallest} ${tokenSymbol} → ${quote.outAmount / LAMPORTS_PER_SOL} SOL (sig: ${signature.slice(0, 16)}...)`
      );

      return {
        success: true,
        inputToken: tokenSymbol,
        inputAmount: inputAmountSmallest,
        outputLamports: quote.outAmount,
        signature,
      };
    } catch (err) {
      console.error('[TokenSwap] Swap execution error:', err);
      return {
        success: false,
        inputToken: tokenSymbol,
        inputAmount: inputAmountSmallest,
        outputLamports: 0,
        error: err instanceof Error ? err.message : 'Unknown swap error',
      };
    }
  }

  /**
   * Check the bot's SPL token balance for a given mint
   */
  async getTokenBalance(mintAddress: string): Promise<number> {
    try {
      const mint = new PublicKey(mintAddress);
      const accounts = await this.connection.getParsedTokenAccountsByOwner(
        this.keypair.publicKey,
        { mint }
      );
      if (!accounts.value.length) return 0;
      const info = accounts.value[0].account.data.parsed?.info;
      return parseInt(info?.tokenAmount?.amount ?? '0');
    } catch {
      return 0;
    }
  }
}
