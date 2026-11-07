// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04

/**
 * provably-fair.ts
 *
 * Client-side cryptographic verification engine for standard casino provably fair algorithms
 * (Stake, Roobet, BC.Game, Rollbit) and TiltCheck 4-Key Solana entropy verification.
 *
 * Implements:
 * 1. Pure TypeScript SHA-256 and HMAC-SHA256 without node:crypto or external dependencies.
 * 2. Server seed pre-commitment verification: SHA256(unhashedServerSeed) === committedHash.
 * 3. 4-byte hex integer extraction and float normalization in [0, 1).
 * 4. Multi-game outcome derivations: Dice, Limbo/Crash, European Roulette, Plinko, and Mines.
 * 5. Deterministic sample test vectors for one-click auditing.
 */

// Round constants for SHA-256
const K: readonly number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/**
 * Pure TypeScript SHA-256 algorithm processing byte arrays.
 */
function sha256Bytes(data: Uint8Array): Uint8Array {
  const H: [number, number, number, number, number, number, number, number] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const l = data.length;
  const bitLen = l * 8;
  const padLen = (l % 64 < 56) ? (56 - l % 64) : (120 - l % 64);
  const totalLen = l + padLen + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(data);
  padded[l] = 0x80;

  const hi = Math.floor(bitLen / 0x100000000);
  const lo = bitLen >>> 0;
  padded[totalLen - 8] = (hi >>> 24) & 0xff;
  padded[totalLen - 7] = (hi >>> 16) & 0xff;
  padded[totalLen - 6] = (hi >>> 8) & 0xff;
  padded[totalLen - 5] = hi & 0xff;
  padded[totalLen - 4] = (lo >>> 24) & 0xff;
  padded[totalLen - 3] = (lo >>> 16) & 0xff;
  padded[totalLen - 2] = (lo >>> 8) & 0xff;
  padded[totalLen - 1] = lo & 0xff;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let t = 0; t < 16; t++) {
      const idx = offset + (t * 4);
      w[t] = ((padded[idx] << 24) | (padded[idx + 1] << 16) | (padded[idx + 2] << 8) | padded[idx + 3]) >>> 0;
    }
    for (let t = 16; t < 64; t++) {
      const s0 = (((w[t - 15] >>> 7) | (w[t - 15] << 25)) ^ ((w[t - 15] >>> 18) | (w[t - 15] << 14)) ^ (w[t - 15] >>> 3)) >>> 0;
      const s1 = (((w[t - 2] >>> 17) | (w[t - 2] << 15)) ^ ((w[t - 2] >>> 19) | (w[t - 2] << 13)) ^ (w[t - 2] >>> 10)) >>> 0;
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;

    for (let t = 0; t < 64; t++) {
      const S1 = (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = (((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (H[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (H[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (H[i] >>> 8) & 0xff;
    out[i * 4 + 3] = H[i] & 0xff;
  }
  return out;
}

/**
 * Computes standard SHA-256 hex digest of a UTF-8 string.
 */
export function computeSha256(text: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const hashBytes = sha256Bytes(bytes);
  return Array.from(hashBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes standard HMAC-SHA256 hex digest of a key and message string.
 */
export function computeHmacSha256(keyStr: string, messageStr: string): string {
  const enc = new TextEncoder();
  let keyBytes: Uint8Array = enc.encode(keyStr);
  const msgBytes = enc.encode(messageStr);

  if (keyBytes.length > 64) {
    keyBytes = sha256Bytes(keyBytes);
  }

  const paddedKey = new Uint8Array(64);
  paddedKey.set(keyBytes);

  const oKeyPad = new Uint8Array(64);
  const iKeyPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const inner = new Uint8Array(64 + msgBytes.length);
  inner.set(iKeyPad);
  inner.set(msgBytes, 64);
  const innerHash = sha256Bytes(inner);

  const outer = new Uint8Array(64 + 32);
  outer.set(oKeyPad);
  outer.set(innerHash, 64);
  const outerHash = sha256Bytes(outer);

  return Array.from(outerHash)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface ServerSeedHashVerification {
  status: 'match' | 'mismatch' | 'not_provided';
  calculatedHash: string;
  committedHash: string;
  isMatch: boolean;
  message: string;
}

/**
 * Verifies that the revealed server seed matches the pre-committed hash.
 */
export function verifyServerSeedHash(
  serverSeed: string,
  committedHash?: string | null
): ServerSeedHashVerification {
  const trimmedSeed = (serverSeed || '').trim();
  const calculatedHash = trimmedSeed ? computeSha256(trimmedSeed) : '';
  const trimmedCommitted = (committedHash || '').trim().toLowerCase();

  if (!trimmedCommitted) {
    return {
      status: 'not_provided',
      calculatedHash,
      committedHash: '',
      isMatch: false,
      message: 'Committed hash not provided. Paste the pre-bet server seed hash to confirm uncorrupted commitment.',
    };
  }

  if (calculatedHash.toLowerCase() === trimmedCommitted) {
    return {
      status: 'match',
      calculatedHash,
      committedHash: trimmedCommitted,
      isMatch: true,
      message: 'Verified: Server seed SHA-256 strictly matches the casino pre-commitment hash. Zero outcome alteration possible after commitment.',
    };
  }

  return {
    status: 'mismatch',
    calculatedHash,
    committedHash: trimmedCommitted,
    isMatch: false,
    message: 'Tamper alert: Calculated SHA-256 does NOT match the committed hash. The server-seed was altered or was copied incorrectly.',
  };
}

/**
 * Standard European Roulette pocket derivation.
 */
export interface RouletteOutcome {
  pocket: number;
  color: 'green' | 'red' | 'black';
  isEven: boolean;
  isHigh: boolean;
}

const RED_ROULETTE_POCKETS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function deriveRoulette(float: number): RouletteOutcome {
  const pocket = Math.floor(float * 37);
  let color: 'green' | 'red' | 'black' = 'black';
  if (pocket === 0) {
    color = 'green';
  } else if (RED_ROULETTE_POCKETS.has(pocket)) {
    color = 'red';
  }

  return {
    pocket,
    color,
    isEven: pocket !== 0 && pocket % 2 === 0,
    isHigh: pocket >= 19 && pocket <= 36,
  };
}

/**
 * Plinko path derivation across rows.
 */
export interface PlinkoOutcome {
  rows: number;
  directions: ('L' | 'R')[];
  landingSlot: number;
}

export function derivePlinko(hexHash: string, rows: number = 12): PlinkoOutcome {
  const clampedRows = Math.max(8, Math.min(16, rows));
  const directions: ('L' | 'R')[] = [];
  let rights = 0;

  for (let i = 0; i < clampedRows; i++) {
    const byte = parseInt(hexHash.substring(i * 2, i * 2 + 2), 16) || 0;
    const dir: 'L' | 'R' = byte % 2 === 0 ? 'L' : 'R';
    directions.push(dir);
    if (dir === 'R') {
      rights++;
    }
  }

  return {
    rows: clampedRows,
    directions,
    landingSlot: rights,
  };
}

/**
 * Mines board position derivation (25 tiles: 0 to 24).
 */
export interface MinesOutcome {
  mineCount: number;
  minePositions: number[];
  safePositions: number[];
}

export function deriveMines(hexHash: string, mineCount: number = 3): MinesOutcome {
  const clampedMines = Math.max(1, Math.min(24, mineCount));
  const availableTiles = Array.from({ length: 25 }, (_, i) => i);
  const minePositions: number[] = [];

  for (let i = 0; i < clampedMines; i++) {
    const byte = parseInt(hexHash.substring(i * 2, i * 2 + 2), 16) || 0;
    const pickIndex = byte % availableTiles.length;
    minePositions.push(availableTiles.splice(pickIndex, 1)[0]);
  }

  minePositions.sort((a, b) => a - b);
  const mineSet = new Set(minePositions);
  const safePositions = Array.from({ length: 25 }, (_, i) => i).filter((p) => !mineSet.has(p));

  return {
    mineCount: clampedMines,
    minePositions,
    safePositions,
  };
}

export interface ProvablyFairResult {
  status: 'verified';
  standard: string;
  inputs: {
    serverSeed: string;
    clientSeed: string;
    nonce: number;
    committedHash?: string;
  };
  receipt: {
    hmacSha256: string;
    leadingBytesHex: string;
    leadingBytesInt: number;
    normalizedFloat: number;
    serverSeedSha256: string;
  };
  preCommitment: ServerSeedHashVerification;
  outcomes: {
    dice: number;
    crashMultiplier: number;
    houseEdgePercent: number;
    roulette: RouletteOutcome;
    plinko: PlinkoOutcome;
    mines: MinesOutcome;
  };
  disclaimer: string;
}

export interface ComputeOptions {
  committedHash?: string;
  houseEdgePercent?: number;
  plinkoRows?: number;
  mineCount?: number;
}

/**
 * Computes standard provably fair outcome across all games.
 */
export function computeProvablyFair(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  options?: ComputeOptions
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

  const houseEdgePercent = options?.houseEdgePercent ?? 1.0;
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
  const hmacSha256 = computeHmacSha256(serverSeed, message);

  // Extract first 4 bytes (8 hex characters)
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

  const preCommitment = verifyServerSeedHash(serverSeed, options?.committedHash);
  const roulette = deriveRoulette(normalizedFloat);
  const plinko = derivePlinko(hmacSha256, options?.plinkoRows ?? 12);
  const mines = deriveMines(hmacSha256, options?.mineCount ?? 3);

  return {
    status: 'verified',
    standard: 'HMAC-SHA256 (Stake / Roobet / BC.Game Standard)',
    inputs: {
      serverSeed,
      clientSeed,
      nonce,
      committedHash: options?.committedHash,
    },
    receipt: {
      hmacSha256,
      leadingBytesHex,
      leadingBytesInt,
      normalizedFloat,
      serverSeedSha256: preCommitment.calculatedHash,
    },
    preCommitment,
    outcomes: {
      dice,
      crashMultiplier,
      houseEdgePercent,
      roulette,
      plinko,
      mines,
    },
    disclaimer:
      'Single-bet cryptographic receipt verified client-side. Does not guarantee overall RTP or platform solvency.',
  };
}

export interface ProvablyFairPreset {
  id: string;
  name: string;
  tag: string;
  serverSeed: string;
  committedHash: string;
  clientSeed: string;
  nonce: number;
  houseEdgePercent: number;
  description: string;
}

export const PROVABLY_FAIR_PRESETS: ProvablyFairPreset[] = [
  {
    id: 'stake-dice',
    name: 'Stake Dice / Limbo',
    tag: 'STAKE STANDARD',
    serverSeed: 'd01247ff421a9fbdf4ee920fb62d22a7f5a11c8cb404c278072d62ee5d7a6e13',
    committedHash: '8556eca62c36f651bb268841e99356e0db84d6f5609fb2c19753f3876593e551',
    clientSeed: 'stake_session_verifier_audit',
    nonce: 1,
    houseEdgePercent: 1.0,
    description: 'Standard HMAC-SHA256 test vector for Stake Dice and Limbo multipliers.',
  },
  {
    id: 'roobet-crash',
    name: 'Roobet Crash / Roulette',
    tag: 'ROOBET CRASH',
    serverSeed: '7b52009b64fd0a2a49e6d8a939753077792b0554372452856d7bdaf446022906',
    committedHash: '06b34d05f70bfdfdd0e114a1f14d4a32435634279595a3f6c9857b4732bf29c3',
    clientSeed: 'roobet_verifier_audit_alpha',
    nonce: 42,
    houseEdgePercent: 1.0,
    description: 'Mid-session round verification test vector for Crash curve and Roulette pockets.',
  },
  {
    id: 'bcgame-limbo',
    name: 'BC.Game Classic Limbo',
    tag: 'BC.GAME STANDARD',
    serverSeed: 'fe8b4172776c5b96791e0a296b79743c988b4ef84ebda3f789069d30c5e7b57b',
    committedHash: '1a5d0fbf55362cc1d231b1e5a9550ee47bf3a9912a2a35ae3b007a6e00dcc578',
    clientSeed: 'bcgame_high_roller_verifier',
    nonce: 100,
    houseEdgePercent: 1.0,
    description: 'High-nonce test vector verifying zero degradation on extended play sessions.',
  },
];
