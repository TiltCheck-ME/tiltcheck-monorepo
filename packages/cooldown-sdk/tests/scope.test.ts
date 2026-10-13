// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
import { describe, expect, it } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  anchorDiscriminator,
  evaluateLock,
  extendLock,
  hashTarget,
  lockAddress,
  SCOPE_ALL,
  SCOPE_CATEGORY,
  SCOPE_GAME,
  setLock,
  zeroTarget,
  type DecodedLock,
} from '../src/index.js';

const NOW = 1_800_000_000;

function makeLock(partial: Partial<DecodedLock> & Pick<DecodedLock, 'scope' | 'endTime'>): DecodedLock {
  return {
    owner: Keypair.generate().publicKey.toBase58(),
    targetId: new Uint8Array(32),
    createdAt: 1_700_000_000,
    bump: 1,
    ...partial,
  };
}

describe('hashTarget', () => {
  it('produces 32 bytes', () => {
    expect(hashTarget('category:crash').length).toBe(32);
    expect(hashTarget('pragmatic:plinko').length).toBe(32);
  });

  it('is deterministic', () => {
    const a = hashTarget('category:crash');
    const b = hashTarget('category:crash');
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it('differs for different inputs', () => {
    const a = hashTarget('category:crash');
    const b = hashTarget('category:slots-high-vol');
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
  });
});

describe('evaluateLock', () => {
  it('missing lock is not locked', () => {
    expect(evaluateLock(null, NOW)).toEqual({ locked: false, scope: null, endTime: null });
  });

  it('active all-scope lock is locked', () => {
    const lock = makeLock({ scope: SCOPE_ALL, endTime: NOW + 1 });
    const status = evaluateLock(lock, NOW);
    expect(status.locked).toBe(true);
    expect(status.scope).toBe('all');
    expect(status.endTime).toBe(NOW + 1);
  });

  it('expired lock is not locked', () => {
    const lock = makeLock({ scope: SCOPE_ALL, endTime: NOW - 1 });
    expect(evaluateLock(lock, NOW).locked).toBe(false);
  });

  it('category scope returns "category"', () => {
    const lock = makeLock({ scope: SCOPE_CATEGORY, endTime: NOW + 100 });
    expect(evaluateLock(lock, NOW).scope).toBe('category');
  });

  it('game scope returns "game"', () => {
    const lock = makeLock({ scope: SCOPE_GAME, endTime: NOW + 100 });
    expect(evaluateLock(lock, NOW).scope).toBe('game');
  });

  it('boundary: now === end_time is still active (Solana uses <=)', () => {
    // The program checks now <= end_time to decide active.
    // evaluateLock mirrors: locked when nowSeconds <= endTime.
    const lock = makeLock({ scope: SCOPE_ALL, endTime: NOW });
    // now > lock.endTime is false at equality, so locked = true.
    expect(evaluateLock(lock, NOW).locked).toBe(true);
    expect(evaluateLock(lock, NOW + 1).locked).toBe(false);
  });
});

describe('lockAddress', () => {
  const owner = Keypair.generate().publicKey;
  const programId = new PublicKey('7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2');

  it('all-scope uses zero target', () => {
    const pda = lockAddress(owner, SCOPE_ALL, zeroTarget(), programId);
    expect(pda).toBeInstanceOf(PublicKey);
  });

  it('different targets produce different PDAs', () => {
    const a = lockAddress(owner, SCOPE_GAME, hashTarget('pragmatic:plinko'), programId);
    const b = lockAddress(owner, SCOPE_GAME, hashTarget('pragmatic:crash'), programId);
    expect(a.toBase58()).not.toBe(b.toBase58());
  });

  it('different scopes produce different PDAs for the same target', () => {
    const target = hashTarget('crash');
    const a = lockAddress(owner, SCOPE_CATEGORY, target, programId);
    const b = lockAddress(owner, SCOPE_GAME, target, programId);
    expect(a.toBase58()).not.toBe(b.toBase58());
  });
});

describe('instruction builders', () => {
  const owner = Keypair.generate().publicKey;
  const programId = new PublicKey('7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2');
  const target = hashTarget('pragmatic:plinko');
  const endTime = NOW + 86_400;

  it('set_lock carries correct discriminator and owner signer', () => {
    const ix = setLock(owner, SCOPE_GAME, target, endTime, programId);
    const disc = anchorDiscriminator('global', 'set_lock');
    expect(Buffer.from(ix.data.subarray(0, 8)).equals(Buffer.from(disc))).toBe(true);
    expect(ix.keys[0]?.pubkey.equals(owner)).toBe(true);
    expect(ix.keys[0]?.isSigner).toBe(true);
  });

  it('extend_lock encodes new_end_time after discriminator', () => {
    const ix = extendLock(owner, SCOPE_GAME, target, endTime + 86_400, programId);
    const disc = anchorDiscriminator('global', 'extend_lock');
    expect(Buffer.from(ix.data.subarray(0, 8)).equals(Buffer.from(disc))).toBe(true);
    const encoded = new DataView(ix.data.buffer, ix.data.byteOffset + 8, 8).getBigInt64(0, true);
    expect(encoded).toBe(BigInt(endTime + 86_400));
  });

  it('set_lock for all-scope uses 32 zero bytes for target_id in payload', () => {
    const ix = setLock(owner, SCOPE_ALL, zeroTarget(), endTime, programId);
    // data layout: 8 disc | 1 scope | 32 target_id | 8 end_time
    const scopeByte = ix.data[8];
    expect(scopeByte).toBe(SCOPE_ALL);
    const targetBytes = ix.data.subarray(9, 41);
    expect(targetBytes.every((b) => b === 0)).toBe(true);
  });
});
