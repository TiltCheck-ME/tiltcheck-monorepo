/**
 * LTC Bridge - Native Litecoin to Solana Token Bridge
 * 
 * Allows users to deposit native LTC and receive Solana tokens (SOL, USDC, etc.)
 * Uses cross-chain swap services to convert LTC → Solana tokens.
 * 
 * Flow:
 * 1. User requests LTC deposit address
 * 2. System generates unique deposit address (via swap service)
 * 3. User sends LTC to deposit address
 * 4. Swap service converts LTC to requested Solana token
 * 5. Tokens arrive in user's Solana wallet
 * 
 * Supported swap backends:
 * - ChangeNOW (primary)
 * - Thorchain (future)
 * - SimpleSwap (fallback)
 * 
 * This is NON-CUSTODIAL - we never hold user LTC or private keys.
 * The swap service handles the conversion directly to user's wallet.
 */

import { eventRouter } from '@tiltcheck/event-router';
import { v4 as uuidv4 } from 'uuid';

// ChangeNOW API (one of the major cross-chain swap aggregators)
const CHANGENOW_API_URL = 'https://api.changenow.io/v2';
const CHANGENOW_API_KEY = process.env.CHANGENOW_API_KEY || '';

// Minimum amounts for LTC deposits (in LTC)
const MIN_LTC_DEPOSIT = 0.001; // ~$0.10 at current prices
const MAX_LTC_DEPOSIT = 10; // Safety limit

/**
 * Supported output tokens for LTC swaps
 * These are Solana tokens that can be received after LTC deposit
 */
export const LTC_SWAP_OUTPUTS = {
  'SOL': { ticker: 'sol', network: 'sol', name: 'Solana' },
  'USDC': { ticker: 'usdcsol', network: 'sol', name: 'USD Coin (Solana)' },
  'USDT': { ticker: 'usdtsol', network: 'sol', name: 'Tether (Solana)' },
} as const;

export type LtcOutputToken = keyof typeof LTC_SWAP_OUTPUTS;

/**
 * LTC deposit request result
 */
export interface LtcDepositRequest {
  success: boolean;
  depositId?: string;
  ltcAddress?: string;         // Address to send LTC to
  outputToken?: string;        // Token user will receive
  outputAddress?: string;      // User's Solana wallet
  minAmount?: number;          // Minimum LTC to send
  maxAmount?: number;          // Maximum LTC to send
  estimatedOutput?: number;    // Estimated output amount
  expiresAt?: number;          // When the deposit address expires
  error?: string;
}

/**
 * LTC swap rate quote
 */
export interface LtcSwapQuote {
  inputToken: 'LTC';
  outputToken: LtcOutputToken;
  rate: number;                // Output per 1 LTC
  minAmount: number;           // Min LTC input
  maxAmount: number;           // Max LTC input
  estimatedTime: number;       // Estimated completion time in minutes
  networkFee: number;          // Network fee in output token
}

/**
 * Deposit status tracking
 */
export interface LtcDepositStatus {
  depositId: string;
  status: 'waiting' | 'confirming' | 'exchanging' | 'sending' | 'finished' | 'failed' | 'refunded' | 'expired';
  ltcAmount?: number;
  outputAmount?: number;
  txHash?: string;             // Solana transaction hash
  ltcTxHash?: string;          // Litecoin transaction hash
  updatedAt: number;
}

// In-memory deposit tracking (would use database in production)
const activeDeposits = new Map<string, {
  userId: string;
  depositId: string;
  externalId?: string;         // Swap service ID
  ltcAddress: string;
  outputToken: LtcOutputToken;
  outputAddress: string;
  createdAt: number;
  status: LtcDepositStatus['status'];
}>();

/**
 * Get estimated swap rate for LTC to Solana token
 */
export async function getLtcSwapQuote(
  outputToken: LtcOutputToken = 'SOL',
  ltcAmount: number = 1,
): Promise<{ success: boolean; quote?: LtcSwapQuote; error?: string }> {
  if (!CHANGENOW_API_KEY) {
    // Return mock quote if API key not configured
    console.warn('[LTC Bridge] No API key configured, returning mock quote');
    return {
      success: true,
      quote: {
        inputToken: 'LTC',
        outputToken,
        rate: outputToken === 'SOL' ? 0.5 : 80, // Mock: 1 LTC ≈ 0.5 SOL or 80 USDC
        minAmount: MIN_LTC_DEPOSIT,
        maxAmount: MAX_LTC_DEPOSIT,
        estimatedTime: 15,
        networkFee: outputToken === 'SOL' ? 0.001 : 0.1,
      },
    };
  }

  const output = LTC_SWAP_OUTPUTS[outputToken];
  if (!output) {
    return { success: false, error: `Unsupported output token: ${outputToken}` };
  }

  try {
    // Get exchange rate from ChangeNOW
    const response = await fetch(
      `${CHANGENOW_API_URL}/exchange/estimated-amount?` +
      `fromCurrency=ltc&toCurrency=${output.ticker}&fromAmount=${ltcAmount}&fromNetwork=ltc&toNetwork=${output.network}&type=direct`,
      {
        headers: {
          'x-changenow-api-key': CHANGENOW_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LTC Bridge] Quote failed:', response.status, errorText);
      return { success: false, error: 'Failed to get swap quote' };
    }

    const data = await response.json() as {
      estimatedAmount: number;
      transactionSpeedForecast: string;
      networkFee: number;
    };

    // Get min/max amounts
    const rangeResponse = await fetch(
      `${CHANGENOW_API_URL}/exchange/range?fromCurrency=ltc&toCurrency=${output.ticker}&fromNetwork=ltc&toNetwork=${output.network}`,
      {
        headers: {
          'x-changenow-api-key': CHANGENOW_API_KEY,
        },
      }
    );

    let minAmount = MIN_LTC_DEPOSIT;
    let maxAmount = MAX_LTC_DEPOSIT;

    if (rangeResponse.ok) {
      const rangeData = await rangeResponse.json() as { minAmount: number; maxAmount: number };
      minAmount = Math.max(rangeData.minAmount, MIN_LTC_DEPOSIT);
      maxAmount = Math.min(rangeData.maxAmount || MAX_LTC_DEPOSIT, MAX_LTC_DEPOSIT);
    }

    return {
      success: true,
      quote: {
        inputToken: 'LTC',
        outputToken,
        rate: data.estimatedAmount / ltcAmount,
        minAmount,
        maxAmount,
        estimatedTime: parseInt(data.transactionSpeedForecast) || 15,
        networkFee: data.networkFee || 0,
      },
    };
  } catch (error) {
    console.error('[LTC Bridge] Quote error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get swap quote',
    };
  }
}

/**
 * Create an LTC deposit address for a user
 * User sends LTC to this address and receives Solana tokens in their wallet
 */
export async function createLtcDepositAddress(
  userId: string,
  solanaWalletAddress: string,
  outputToken: LtcOutputToken = 'SOL',
): Promise<LtcDepositRequest> {
  const depositId = uuidv4();

  const output = LTC_SWAP_OUTPUTS[outputToken];
  if (!output) {
    return { success: false, error: `Unsupported output token: ${outputToken}` };
  }

  if (!CHANGENOW_API_KEY) {
    // Return mock deposit address if API key not configured
    console.warn('[LTC Bridge] No API key configured, returning mock deposit');
    
    const mockLtcAddress = `ltc1q${depositId.replace(/-/g, '').substring(0, 38)}`;
    
    activeDeposits.set(depositId, {
      userId,
      depositId,
      ltcAddress: mockLtcAddress,
      outputToken,
      outputAddress: solanaWalletAddress,
      createdAt: Date.now(),
      status: 'waiting',
    });

    void eventRouter.publish('swap.requested', 'justthetip', {
      depositId,
      userId,
      type: 'ltc-bridge',
      inputToken: 'LTC',
      outputToken,
      outputAddress: solanaWalletAddress,
    });

    return {
      success: true,
      depositId,
      ltcAddress: mockLtcAddress,
      outputToken,
      outputAddress: solanaWalletAddress,
      minAmount: MIN_LTC_DEPOSIT,
      maxAmount: MAX_LTC_DEPOSIT,
      estimatedOutput: undefined, // Will be calculated when LTC is received
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };
  }

  try {
    // Create exchange transaction with ChangeNOW
    const response = await fetch(`${CHANGENOW_API_URL}/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-changenow-api-key': CHANGENOW_API_KEY,
      },
      body: JSON.stringify({
        fromCurrency: 'ltc',
        toCurrency: output.ticker,
        fromNetwork: 'ltc',
        toNetwork: output.network,
        address: solanaWalletAddress, // User's Solana wallet
        flow: 'standard', // Fixed-rate would be 'fixed-rate'
        type: 'direct',
        // Note: We don't specify amount - user can send any amount within limits
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LTC Bridge] Create deposit failed:', response.status, errorText);
      return { success: false, error: 'Failed to create deposit address' };
    }

    const data = await response.json() as {
      id: string;
      payinAddress: string;
      payoutAddress: string;
      fromAmount: number | null;
      toAmount: number | null;
      validUntil: string;
    };

    // Store deposit tracking info
    activeDeposits.set(depositId, {
      userId,
      depositId,
      externalId: data.id,
      ltcAddress: data.payinAddress,
      outputToken,
      outputAddress: solanaWalletAddress,
      createdAt: Date.now(),
      status: 'waiting',
    });

    void eventRouter.publish('swap.requested', 'justthetip', {
      depositId,
      externalId: data.id,
      userId,
      type: 'ltc-bridge',
      inputToken: 'LTC',
      outputToken,
      ltcAddress: data.payinAddress,
      outputAddress: solanaWalletAddress,
    });

    return {
      success: true,
      depositId,
      ltcAddress: data.payinAddress,
      outputToken,
      outputAddress: solanaWalletAddress,
      minAmount: MIN_LTC_DEPOSIT,
      maxAmount: MAX_LTC_DEPOSIT,
      expiresAt: data.validUntil ? new Date(data.validUntil).getTime() : Date.now() + 24 * 60 * 60 * 1000,
    };
  } catch (error) {
    console.error('[LTC Bridge] Create deposit error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create deposit address',
    };
  }
}

/**
 * Get status of an LTC deposit
 */
export async function getLtcDepositStatus(depositId: string): Promise<LtcDepositStatus | null> {
  const deposit = activeDeposits.get(depositId);
  if (!deposit) {
    return null;
  }

  if (!CHANGENOW_API_KEY || !deposit.externalId) {
    // Return mock status
    return {
      depositId,
      status: deposit.status,
      updatedAt: Date.now(),
    };
  }

  try {
    const response = await fetch(
      `${CHANGENOW_API_URL}/exchange/by-id?id=${deposit.externalId}`,
      {
        headers: {
          'x-changenow-api-key': CHANGENOW_API_KEY,
        },
      }
    );

    if (!response.ok) {
      return {
        depositId,
        status: deposit.status,
        updatedAt: Date.now(),
      };
    }

    const data = await response.json() as {
      status: string;
      amountFrom: number | null;
      amountTo: number | null;
      payinHash: string | null;
      payoutHash: string | null;
    };

    // Map ChangeNOW status to our status
    const statusMap: Record<string, LtcDepositStatus['status']> = {
      'new': 'waiting',
      'waiting': 'waiting',
      'confirming': 'confirming',
      'exchanging': 'exchanging',
      'sending': 'sending',
      'finished': 'finished',
      'failed': 'failed',
      'refunded': 'refunded',
      'expired': 'expired',
    };

    const status = statusMap[data.status] || 'waiting';

    // Update local cache
    deposit.status = status;

    // Emit event on status change
    if (status === 'finished') {
      void eventRouter.publish('swap.completed', 'justthetip', {
        depositId,
        userId: deposit.userId,
        inputToken: 'LTC',
        outputToken: deposit.outputToken,
        inputAmount: data.amountFrom,
        outputAmount: data.amountTo,
        txHash: data.payoutHash,
      });
    } else if (status === 'failed' || status === 'refunded') {
      void eventRouter.publish('swap.failed', 'justthetip', {
        depositId,
        userId: deposit.userId,
        status,
        error: `LTC deposit ${status}`,
      });
    }

    return {
      depositId,
      status,
      ltcAmount: data.amountFrom || undefined,
      outputAmount: data.amountTo || undefined,
      txHash: data.payoutHash || undefined,
      ltcTxHash: data.payinHash || undefined,
      updatedAt: Date.now(),
    };
  } catch (error) {
    console.error('[LTC Bridge] Get status error:', error);
    return {
      depositId,
      status: deposit.status,
      updatedAt: Date.now(),
    };
  }
}

/**
 * Get all pending deposits for a user
 */
export function getUserPendingDeposits(userId: string): Array<{
  depositId: string;
  ltcAddress: string;
  outputToken: LtcOutputToken;
  status: LtcDepositStatus['status'];
  createdAt: number;
}> {
  const results: Array<{
    depositId: string;
    ltcAddress: string;
    outputToken: LtcOutputToken;
    status: LtcDepositStatus['status'];
    createdAt: number;
  }> = [];

  for (const deposit of activeDeposits.values()) {
    if (deposit.userId === userId && deposit.status !== 'finished' && deposit.status !== 'failed') {
      results.push({
        depositId: deposit.depositId,
        ltcAddress: deposit.ltcAddress,
        outputToken: deposit.outputToken,
        status: deposit.status,
        createdAt: deposit.createdAt,
      });
    }
  }

  return results;
}

/**
 * Format LTC deposit instructions for display
 */
export function formatLtcDepositInstructions(deposit: LtcDepositRequest): string {
  if (!deposit.success || !deposit.ltcAddress) {
    return `❌ ${deposit.error || 'Failed to create deposit'}`;
  }

  return `
🪙 **LTC Deposit Ready**

Send LTC to this address to receive **${deposit.outputToken}** in your Solana wallet:

\`\`\`
${deposit.ltcAddress}
\`\`\`

📊 **Details:**
• Min deposit: ${deposit.minAmount} LTC
• Max deposit: ${deposit.maxAmount} LTC
• Output token: ${deposit.outputToken}
• Your wallet: \`${deposit.outputAddress?.substring(0, 8)}...${deposit.outputAddress?.substring(deposit.outputAddress.length - 8)}\`

⏰ **Important:**
• Address expires in 24 hours
• Send only LTC (Litecoin) to this address
• Tokens will arrive in ~15-30 minutes after confirmation

💡 Use \`/tip ltc status\` to check deposit status
`.trim();
}

/**
 * Get supported output tokens list
 */
export function getSupportedLtcOutputs(): string[] {
  return Object.keys(LTC_SWAP_OUTPUTS);
}

console.log('[LTC Bridge] Loaded - Native LTC to Solana bridge ready');
