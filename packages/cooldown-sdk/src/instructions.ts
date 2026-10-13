// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { anchorDiscriminator, cooldownProgramId, lockAddress } from './codec.js';

function concat(parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return out;
}

function encodeI64(value: number): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigInt64(0, BigInt(value), true);
  return b;
}

function ix(
  name: string,
  keys: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[],
  data: Uint8Array,
  programId: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from(concat([anchorDiscriminator('global', name), data])),
  });
}

/**
 * Build a set_lock instruction.
 * scope: 0 = All, 1 = Category, 2 = Game
 * targetId: 32-byte hash from hashTarget(), or zeroTarget() for All scope
 * endTime: unix seconds
 */
export function setLock(
  owner: PublicKey,
  scope: number,
  targetId: Uint8Array,
  endTime: number,
  programId: PublicKey = cooldownProgramId(),
): TransactionInstruction {
  const lockPda = lockAddress(owner, scope, targetId, programId);
  const data = concat([
    Uint8Array.of(scope),
    targetId.length === 32 ? targetId : new Uint8Array(32),
    encodeI64(endTime),
  ]);
  return ix(
    'set_lock',
    [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: lockPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
    programId,
  );
}

/**
 * Build an extend_lock instruction.
 * scope and targetId identify which PDA to extend.
 */
export function extendLock(
  owner: PublicKey,
  scope: number,
  targetId: Uint8Array,
  newEndTime: number,
  programId: PublicKey = cooldownProgramId(),
): TransactionInstruction {
  const lockPda = lockAddress(owner, scope, targetId, programId);
  return ix(
    'extend_lock',
    [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: lockPda, isSigner: false, isWritable: true },
    ],
    encodeI64(newEndTime),
    programId,
  );
}
