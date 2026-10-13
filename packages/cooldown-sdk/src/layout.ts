// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
import { PublicKey } from '@solana/web3.js';
import { anchorDiscriminator, type DecodedLock } from './codec.js';

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function decodeLock(data: Uint8Array): DecodedLock | null {
  const disc = anchorDiscriminator('account', 'Lock');
  // 8 (disc) + 32 (owner) + 1 (scope) + 32 (target_id) + 8 (end_time) + 8 (created_at) + 1 (bump) = 90
  if (data.length < 90 || !sameBytes(data.subarray(0, 8), disc)) return null;

  let offset = 8;
  const owner = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;
  const scope = data[offset] ?? 0;
  offset += 1;
  const targetId = data.subarray(offset, offset + 32);
  offset += 32;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const endTime = Number(view.getBigInt64(offset, true));
  offset += 8;
  const createdAt = Number(view.getBigInt64(offset, true));
  offset += 8;
  const bump = data[offset] ?? 0;

  return { owner, scope, targetId, endTime, createdAt, bump };
}
