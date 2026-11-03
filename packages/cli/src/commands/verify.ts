/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */

import { Command } from 'commander';
import crypto from 'node:crypto';

export interface ProvablyFairResult {
  status: 'verified';
  standard: string;
  inputs: {
    serverSeed: string;
    clientSeed: string;
    nonce: number;
  };
  receipt: {
    hmacSha256: string;
    leadingBytesHex: string;
    leadingBytesInt: number;
    normalizedFloat: number;
  };
  outcomes: {
    dice: number;
    crashMultiplier: number;
    houseEdgePercent: number;
  };
  disclaimer: string;
}

/**
 * Computes standard provably fair HMAC-SHA256 hash and game outcomes.
 * Matches Stake, Roobet, and BC.Game standard algorithms.
 */
export function computeProvablyFair(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  houseEdgePercent: number = 1.0
): ProvablyFairResult {
  if (!serverSeed || typeof serverSeed !== 'string' || serverSeed.trim() === '') {
    throw new Error('Server seed is required.');
  }
  if (!clientSeed || typeof clientSeed !== 'string' || clientSeed.trim() === '') {
    throw new Error('Client seed is required.');
  }
  if (!Number.isInteger(nonce) || nonce < 0 || !Number.isSafeInteger(nonce)) {
    throw new Error('Nonce must be a non-negative safe integer (0 <= nonce <= 9007199254740991).');
  }
  if (
    typeof houseEdgePercent !== 'number' ||
    isNaN(houseEdgePercent) ||
    houseEdgePercent < 0 ||
    houseEdgePercent >= 100
  ) {
    throw new Error('House edge percentage must be a number between 0 and 100.');
  }

  const houseEdgeFraction = houseEdgePercent / 100;
  const message = `${clientSeed}:${nonce}`;
  const hmacSha256 = crypto
    .createHmac('sha256', serverSeed)
    .update(message)
    .digest('hex');

  // Extract first 4 bytes (8 hex chars)
  const leadingBytesHex = hmacSha256.substring(0, 8);
  const leadingBytesInt = parseInt(leadingBytesHex, 16);
  const normalizedFloat = leadingBytesInt / 0xffffffff;

  // Dice standard: float * 10001 / 100 -> range 0.00 to 100.00
  const dice = Math.min(100.0, Math.floor(normalizedFloat * 10001) / 100);

  // Crash / Limbo multiplier standard: (1 - houseEdge) / (1 - float)
  let crashMultiplier: number;
  if (normalizedFloat === 1) {
    crashMultiplier = 1000000;
  } else {
    const raw = (1 - houseEdgeFraction) / (1 - normalizedFloat);
    crashMultiplier = Math.floor(raw * 100) / 100;
  }

  return {
    status: 'verified',
    standard: 'HMAC-SHA256 (Stake / Roobet / BC.Game)',
    inputs: {
      serverSeed,
      clientSeed,
      nonce,
    },
    receipt: {
      hmacSha256,
      leadingBytesHex,
      leadingBytesInt,
      normalizedFloat,
    },
    outcomes: {
      dice,
      crashMultiplier,
      houseEdgePercent,
    },
    disclaimer:
      'Single-bet cryptographic receipt verified offline. Does not guarantee overall RTP or platform solvency.',
  };
}

export function formatProvablyFairText(result: ProvablyFairResult): string {
  const lines = [
    '======================================================================',
    'TILTCHECK PROVABLY FAIR VERIFIER',
    `Standard: ${result.standard}`,
    '======================================================================',
    '',
    'INPUT PARAMETERS:',
    `  Server Seed: ${result.inputs.serverSeed}`,
    `  Client Seed: ${result.inputs.clientSeed}`,
    `  Nonce:       ${result.inputs.nonce}`,
    '',
    'HASH RECEIPT:',
    `  HMAC-SHA256:      ${result.receipt.hmacSha256}`,
    `  Leading 4 Bytes:  ${result.receipt.leadingBytesHex} (int: ${result.receipt.leadingBytesInt})`,
    `  Normalized Float: ${result.receipt.normalizedFloat.toFixed(8)}`,
    '',
    'GAME OUTCOMES:',
    `  Dice (0.00 - 100.00): ${result.outcomes.dice.toFixed(2)}`,
    `  Crash Multiplier:     ${result.outcomes.crashMultiplier.toFixed(2)}x (House Edge: ${result.outcomes.houseEdgePercent.toFixed(2)}%)`,
    '',
    'STATUS:',
    '  Cryptographic receipt verified locally with zero remote calls.',
    '  NOTE: Single-bet verification confirms only mathematics for this specific round.',
    '  It does not detect hidden RTP downgrades, platform solvency, or predatory terms.',
    '======================================================================',
    'Made for Degens. By Degens.',
  ];
  return lines.join('\n');
}

export const verifyCommand = new Command('verify')
  .description('Offline HMAC-SHA256 provably fair bet verifier (Stake, Roobet, BC.Game)')
  .argument('<serverSeed>', 'Revealed server seed from the casino')
  .argument('<clientSeed>', 'Client seed set by the player')
  .argument('<nonce>', 'Bet nonce / counter (non-negative integer)')
  .option('-j, --json', 'Output receipt as raw JSON')
  .option('-e, --house-edge <percent>', 'House edge percentage for crash calculation (default: 1.0)', '1.0')
  .action((serverSeedStr: string, clientSeedStr: string, nonceStr: string, options: { json?: boolean; houseEdge: string }) => {
    try {
      const parsedNonce = parseInt(nonceStr, 10);
      if (isNaN(parsedNonce) || String(parsedNonce) !== nonceStr.trim()) {
        throw new Error(`Invalid nonce "${nonceStr}". Nonce must be a non-negative integer.`);
      }
      const parsedEdge = parseFloat(options.houseEdge);
      if (isNaN(parsedEdge) || parsedEdge < 0 || parsedEdge >= 100) {
        throw new Error(`Invalid house edge "${options.houseEdge}". Must be between 0 and 100.`);
      }

      const result = computeProvablyFair(serverSeedStr, clientSeedStr, parsedNonce, parsedEdge);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatProvablyFairText(result));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (options.json) {
        console.error(JSON.stringify({ error: msg, status: 'failed' }, null, 2));
      } else {
        console.error(`[tiltcheck verify error] ${msg}`);
      }
      process.exit(1);
    }
  });
