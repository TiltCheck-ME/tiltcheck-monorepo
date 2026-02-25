/**
 * Jupiter swap integration for JustTheTip
 * Handles multi-coin → SOL swaps via Jupiter v6 API
 */

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inputAmount: number; // in lamports/smallest unit
  outputAmount: number; // in lamports
  priceImpactPct: number;
  routePlan: unknown[];
  swapTransaction?: string; // base64 encoded transaction
  quoteResponse?: unknown; // raw Jupiter response for executeSwap
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// Common tokens we support for deposit
export const SUPPORTED_INPUT_TOKENS: TokenInfo[] = [
  {
    address: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
  },
  {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  {
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
  },
  {
    address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    symbol: 'mSOL',
    name: 'Marinade staked SOL',
    decimals: 9,
  },
  {
    address: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
    symbol: 'ETH',
    name: 'Ether (Wormhole)',
    decimals: 8,
  },
  {
    address: '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
    symbol: 'WBTC',
    name: 'Wrapped BTC (Wormhole)',
    decimals: 8,
  },
  {
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    symbol: 'BONK',
    name: 'Bonk',
    decimals: 5,
  },
  {
    address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    symbol: 'JUP',
    name: 'Jupiter',
    decimals: 6,
  },
];

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';

/**
 * Get a swap quote from Jupiter
 */
export async function getSwapQuote(
  inputMint: string,
  inputAmount: number, // in smallest unit (lamports/micro-tokens)
  slippageBps = 50 // 0.5% default slippage
): Promise<SwapQuote> {
  const params = new URLSearchParams({
    inputMint,
    outputMint: SOL_MINT,
    amount: inputAmount.toString(),
    slippageBps: slippageBps.toString(),
    onlyDirectRoutes: 'false',
    asLegacyTransaction: 'false',
  });

  const res = await fetch(`${JUPITER_QUOTE_API}/quote?${params}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jupiter quote failed: ${err}`);
  }

  const data = await res.json();

  return {
    inputMint,
    outputMint: SOL_MINT,
    inputAmount: parseInt(data.inAmount),
    outputAmount: parseInt(data.outAmount),
    priceImpactPct: parseFloat(data.priceImpactPct),
    routePlan: data.routePlan || [],
    quoteResponse: data,
  };
}

/**
 * Get a swap transaction from Jupiter (user will sign this)
 */
export async function getSwapTransaction(
  quoteResponse: unknown,
  userPublicKey: string,
  feeAccountPubkey?: string // optional fee account for platform fee
): Promise<string> {
  const body: Record<string, unknown> = {
    quoteResponse,
    userPublicKey,
    wrapAndUnwrapSol: true,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: 'auto',
  };

  if (feeAccountPubkey) {
    body.feeAccount = feeAccountPubkey;
  }

  const res = await fetch(`${JUPITER_QUOTE_API}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jupiter swap transaction failed: ${err}`);
  }

  const data = await res.json();
  return data.swapTransaction; // base64 encoded versioned transaction
}

/**
 * Convert token amount from human-readable to smallest unit
 */
export function toSmallestUnit(amount: number, decimals: number): number {
  return Math.floor(amount * Math.pow(10, decimals));
}

/**
 * Convert from smallest unit to human-readable
 */
export function fromSmallestUnit(amount: number, decimals: number): number {
  return amount / Math.pow(10, decimals);
}

/**
 * Format SOL amount for display
 */
export function formatSol(lamports: number): string {
  const sol = lamports / 1e9;
  if (sol < 0.001) return `${(sol * 1000).toFixed(2)} mSOL`;
  return `${sol.toFixed(4)} SOL`;
}
