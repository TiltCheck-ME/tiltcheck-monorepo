// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
import { sha256 } from '@noble/hashes/sha2';
import { PublicKey } from '@solana/web3.js';

/** Devnet program id. Override with COOLDOWN_PROGRAM_ID env var or opts.programId. */
export const COOLDOWN_PROGRAM_ID = new PublicKey('7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2');

export const SCOPE_ALL = 0;
export const SCOPE_CATEGORY = 1;
export const SCOPE_GAME = 2;

export type ScopeName = 'all' | 'category' | 'game';

export interface LockStatus {
  locked: boolean;
  scope: ScopeName | null;
  endTime: number | null;
}

export interface DecodedLock {
  owner: string;
  scope: number;
  targetId: Uint8Array;
  endTime: number;
  createdAt: number;
  bump: number;
}

export function cooldownProgramId(override?: PublicKey): PublicKey {
  if (override) return override;
  const fromEnv = typeof process !== 'undefined' ? process.env?.COOLDOWN_PROGRAM_ID : undefined;
  if (fromEnv) return new PublicKey(fromEnv);
  return COOLDOWN_PROGRAM_ID;
}

export function anchorDiscriminator(namespace: 'global' | 'account', name: string): Uint8Array {
  return sha256(new TextEncoder().encode(`${namespace}:${name}`)).subarray(0, 8);
}

/**
 * Hash a target string the same way the program expects.
 * Game target: sha256("provider:game_slug")
 * Category target: sha256("category:slug")
 * All scope: zeroed 32 bytes
 */
export function hashTarget(input: string): Uint8Array {
  return sha256(new TextEncoder().encode(input));
}

export function zeroTarget(): Uint8Array {
  return new Uint8Array(32);
}

export function lockAddress(
  owner: PublicKey,
  scope: number,
  targetId: Uint8Array,
  programId: PublicKey = cooldownProgramId(),
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('lock'), owner.toBuffer(), Buffer.from([scope]), Buffer.from(targetId)],
    programId,
  )[0];
}

export function scopeName(scope: number): ScopeName | null {
  if (scope === SCOPE_ALL) return 'all';
  if (scope === SCOPE_CATEGORY) return 'category';
  if (scope === SCOPE_GAME) return 'game';
  return null;
}

const CLEAR: LockStatus = { locked: false, scope: null, endTime: null };

export function evaluateLock(lock: DecodedLock | null, nowSeconds: number): LockStatus {
  if (!lock) return CLEAR;
  const scope = scopeName(lock.scope);
  if (!scope || nowSeconds > lock.endTime) {
    return { locked: false, scope, endTime: lock.endTime };
  }
  return { locked: true, scope, endTime: lock.endTime };
}
