/**
 * Swap Engine - Jupiter Integration for Token Swaps
 * 
 * Allows users to swap between supported Solana tokens (including wrapped assets)
 * using Jupiter aggregator for best rates.
 * 
 * Features:
 * - Get swap quotes from Jupiter
 * - Execute swaps via Solana Pay deep links
 * - Support for wrapped tokens (wLTC, wBTC, etc.)
 * - Flat fee model consistent with tipping
 */

import { Connection } from '@solana/web3.js';
import { createQR } from '@solana/pay';
import { eventRouter } from '@tiltcheck/event-router';
import { pricingOracle } from '@tiltcheck/pricing-oracle';
import { v4 as uuidv4 } from 'uuid';
import { swapDefaults } from './config.js';
import type { SwapQuote } from '@tiltcheck/types';

const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP_API = 'https://quote-api.jup.ag/v6/swap';

// Platform fee wallet (same as tip fee wallet)
const FEE_WALLET = process.env.JUSTTHETIP_FEE_WALLET || '';

/**
 * Supported tokens for swaps
 * Maps common symbols to their Solana mint addresses
 */
export const SUPPORTED_TOKENS: Record<string, { mint: string; decimals: number; name: string }> = {
  'SOL': {
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    name: 'Solana',
  },
  'USDC': {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    name: 'USD Coin',
  },
  'USDT': {
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6,
    name: 'Tether USD',
  },
  'BONK': {
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5,
    name: 'Bonk',
  },
  'JUP': {
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    name: 'Jupiter',
  },
  'RAY': {
    mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    name: 'Raydium',
  },
  'ORCA': {
    mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
    decimals: 6,
    name: 'Orca',
  },
  // Wrapped assets (bridged from other chains)
  'WBTC': {
    mint: '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
    decimals: 8,
    name: 'Wrapped Bitcoin (Wormhole)',
  },
  'WETH': {
    mint: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
    decimals: 8,
    name: 'Wrapped Ether (Wormhole)',
  },
  // Note: There's no widely adopted wrapped LTC on Solana yet.
  // Users with LTC would need to bridge to a supported token first.
  // Placeholder for future LTC bridge support:
  // 'WLTC': {
  //   mint: 'TBD',
  //   decimals: 8,
  //   name: 'Wrapped Litecoin',
  // },
};

/**
 * Result of a swap quote request
 */
export interface SwapQuoteResult {
  success: boolean;
  quote?: SwapQuote;
  error?: string;
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  outputAmount?: number;
  priceImpactPct?: number;
  routeDescription?: string;
}

/**
 * Result of a swap execution request
 */
export interface SwapExecutionResult {
  success: boolean;
  swapId: string;
  quote?: SwapQuote;
  url?: string; // Solana Pay URL for user to sign
  qrCode?: string; // Base64 QR code
  error?: string;
}

/**
 * Jupiter quote response structure
 */
interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
}

/**
 * Get token mint address from symbol
 */
export function getTokenMint(symbol: string): string | undefined {
  const token = SUPPORTED_TOKENS[symbol.toUpperCase()];
  return token?.mint;
}

/**
 * Get token info from symbol
 */
export function getTokenInfo(symbol: string): typeof SUPPORTED_TOKENS[string] | undefined {
  return SUPPORTED_TOKENS[symbol.toUpperCase()];
}

/**
 * Check if a token is supported for swaps
 */
export function isTokenSupported(symbol: string): boolean {
  return symbol.toUpperCase() in SUPPORTED_TOKENS;
}

/**
 * Get list of supported token symbols
 */
export function getSupportedTokens(): string[] {
  return Object.keys(SUPPORTED_TOKENS);
}

/**
 * Get a swap quote from Jupiter
 */
export async function getSwapQuote(
  userId: string,
  inputToken: string,
  outputToken: string,
  inputAmount: number,
  slippageBps: number = swapDefaults.slippageBps,
): Promise<SwapQuoteResult> {
  const inputInfo = getTokenInfo(inputToken);
  const outputInfo = getTokenInfo(outputToken);

  if (!inputInfo) {
    return {
      success: false,
      error: `Unsupported input token: ${inputToken}. Supported: ${getSupportedTokens().join(', ')}`,
      inputToken,
      outputToken,
      inputAmount,
    };
  }

  if (!outputInfo) {
    return {
      success: false,
      error: `Unsupported output token: ${outputToken}. Supported: ${getSupportedTokens().join(', ')}`,
      inputToken,
      outputToken,
      inputAmount,
    };
  }

  if (inputToken.toUpperCase() === outputToken.toUpperCase()) {
    return {
      success: false,
      error: 'Input and output tokens must be different',
      inputToken,
      outputToken,
      inputAmount,
    };
  }

  // Convert amount to smallest units (lamports for SOL, etc.)
  const inputAmountSmallest = Math.floor(inputAmount * Math.pow(10, inputInfo.decimals));

  try {
    // Build Jupiter quote URL
    const quoteUrl = new URL(JUPITER_QUOTE_API);
    quoteUrl.searchParams.set('inputMint', inputInfo.mint);
    quoteUrl.searchParams.set('outputMint', outputInfo.mint);
    quoteUrl.searchParams.set('amount', inputAmountSmallest.toString());
    quoteUrl.searchParams.set('slippageBps', slippageBps.toString());
    
    // Add platform fee if configured
    if (FEE_WALLET && swapDefaults.platformFeeBps > 0) {
      quoteUrl.searchParams.set('platformFeeBps', swapDefaults.platformFeeBps.toString());
    }

    const response = await fetch(quoteUrl.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SwapEngine] Jupiter quote failed:', response.status, errorText);
      return {
        success: false,
        error: `Failed to get swap quote: ${response.status}`,
        inputToken,
        outputToken,
        inputAmount,
      };
    }

    const jupiterQuote = (await response.json()) as JupiterQuoteResponse;

    // Convert output amount from smallest units
    const outputAmount = parseInt(jupiterQuote.outAmount) / Math.pow(10, outputInfo.decimals);
    const minOutputAmount = parseInt(jupiterQuote.otherAmountThreshold) / Math.pow(10, outputInfo.decimals);

    // Calculate rate
    const rate = outputAmount / inputAmount;

    // Build route description
    const routeLabels = jupiterQuote.routePlan.map(r => r.swapInfo.label).join(' → ');

    // Create SwapQuote object
    const quote: SwapQuote = {
      userId,
      inputMint: inputInfo.mint,
      outputMint: outputInfo.mint,
      inputAmount,
      estimatedOutputAmount: outputAmount,
      rate,
      slippageBps,
      generatedAt: Date.now(),
      routePlan: jupiterQuote.routePlan,
      minOutputAmount,
      platformFeeBps: swapDefaults.platformFeeBps,
      networkFeeLamports: swapDefaults.networkFeeLamports,
      finalOutputAfterFees: minOutputAmount, // After slippage protection
    };

    // Emit quote event
    void eventRouter.publish('swap.quote', 'justthetip', {
      userId,
      inputToken,
      outputToken,
      inputAmount,
      outputAmount,
      rate,
      priceImpactPct: parseFloat(jupiterQuote.priceImpactPct),
    });

    return {
      success: true,
      quote,
      inputToken,
      outputToken,
      inputAmount,
      outputAmount,
      priceImpactPct: parseFloat(jupiterQuote.priceImpactPct),
      routeDescription: routeLabels,
    };
  } catch (error) {
    console.error('[SwapEngine] Quote error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get swap quote',
      inputToken,
      outputToken,
      inputAmount,
    };
  }
}

/**
 * Create a swap transaction for user to sign
 * Returns a Solana Pay URL that opens in the user's wallet
 */
export async function createSwapTransaction(
  _connection: Connection, // Reserved for future use (e.g., simulation)
  userWalletAddress: string,
  quote: SwapQuote,
): Promise<SwapExecutionResult> {
  const swapId = uuidv4();

  try {
    // Get swap transaction from Jupiter
    const swapResponse = await fetch(JUPITER_SWAP_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse: {
          inputMint: quote.inputMint,
          inAmount: Math.floor(quote.inputAmount * Math.pow(10, getDecimalsForMint(quote.inputMint))).toString(),
          outputMint: quote.outputMint,
          outAmount: Math.floor(quote.estimatedOutputAmount * Math.pow(10, getDecimalsForMint(quote.outputMint))).toString(),
          otherAmountThreshold: Math.floor(quote.minOutputAmount * Math.pow(10, getDecimalsForMint(quote.outputMint))).toString(),
          swapMode: 'ExactIn',
          slippageBps: quote.slippageBps,
          routePlan: quote.routePlan,
        },
        userPublicKey: userWalletAddress,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    });

    if (!swapResponse.ok) {
      const errorText = await swapResponse.text();
      console.error('[SwapEngine] Jupiter swap failed:', swapResponse.status, errorText);
      return {
        success: false,
        swapId,
        error: `Failed to create swap transaction: ${swapResponse.status}`,
      };
    }

    const swapData = await swapResponse.json() as { swapTransaction: string };
    
    // The swap transaction is base64 encoded
    const swapTransactionBase64 = swapData.swapTransaction;

    // Create Solana Pay URL
    // Format: solana:<base64-transaction>
    const url = `solana:${swapTransactionBase64}`;

    // Generate QR code
    const qr = createQR(url);
    const qrBlob = await qr.getRawData('png');
    if (!qrBlob) {
      throw new Error('Failed to generate QR code');
    }
    const qrArrayBuffer = await qrBlob.arrayBuffer();
    const qrBase64 = Buffer.from(qrArrayBuffer).toString('base64');

    // Emit swap requested event
    void eventRouter.publish('swap.requested', 'justthetip', {
      swapId,
      userId: quote.userId,
      inputMint: quote.inputMint,
      outputMint: quote.outputMint,
      inputAmount: quote.inputAmount,
      expectedOutput: quote.estimatedOutputAmount,
    });

    return {
      success: true,
      swapId,
      quote,
      url,
      qrCode: qrBase64,
    };
  } catch (error) {
    console.error('[SwapEngine] Create swap transaction error:', error);

    void eventRouter.publish('swap.failed', 'justthetip', {
      swapId,
      userId: quote.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      swapId,
      error: error instanceof Error ? error.message : 'Failed to create swap transaction',
    };
  }
}

/**
 * Get decimals for a mint address
 */
function getDecimalsForMint(mint: string): number {
  for (const token of Object.values(SUPPORTED_TOKENS)) {
    if (token.mint === mint) {
      return token.decimals;
    }
  }
  return 9; // Default to SOL decimals
}

/**
 * Format swap quote for display
 */
export function formatSwapQuote(
  inputToken: string,
  outputToken: string,
  inputAmount: number,
  outputAmount: number,
  priceImpactPct?: number,
): string {
  const inputInfo = getTokenInfo(inputToken);
  const outputInfo = getTokenInfo(outputToken);

  let message = `**Swap Quote**\n`;
  message += `📥 Input: ${inputAmount.toFixed(6)} ${inputToken} (${inputInfo?.name})\n`;
  message += `📤 Output: ~${outputAmount.toFixed(6)} ${outputToken} (${outputInfo?.name})\n`;
  message += `💱 Rate: 1 ${inputToken} ≈ ${(outputAmount / inputAmount).toFixed(6)} ${outputToken}\n`;
  
  if (priceImpactPct !== undefined) {
    const impactEmoji = priceImpactPct < 1 ? '✅' : priceImpactPct < 3 ? '⚠️' : '🔴';
    message += `${impactEmoji} Price Impact: ${priceImpactPct.toFixed(2)}%\n`;
  }

  message += `💰 Platform Fee: ${swapDefaults.platformFeeBps / 100}%\n`;
  
  return message;
}

/**
 * Get token price in USD (uses pricing oracle)
 */
export function getTokenPriceUsd(symbol: string): number | undefined {
  try {
    return pricingOracle.getUsdPrice(symbol.toUpperCase());
  } catch {
    return undefined;
  }
}

console.log('[SwapEngine] Loaded - Jupiter integration ready');
