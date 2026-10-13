// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
import { Connection, PublicKey } from '@solana/web3.js';
import {
  cooldownProgramId,
  evaluateLock,
  hashTarget,
  lockAddress,
  SCOPE_ALL,
  SCOPE_CATEGORY,
  SCOPE_GAME,
  zeroTarget,
  type LockStatus,
} from './codec.js';
import { decodeLock } from './layout.js';

export interface IsLockedOpts {
  game?: string;
  category?: string;
  programId?: PublicKey;
}

/**
 * Check if a wallet is locked.
 * Priority: All > Category > Game.
 * Returns the strongest active lock that covers the requested scope.
 */
export async function isLocked(
  connection: Connection,
  wallet: PublicKey,
  opts?: IsLockedOpts,
): Promise<LockStatus> {
  const programId = cooldownProgramId(opts?.programId);
  const nowSeconds = Math.floor(Date.now() / 1000);

  // Always check All scope first.
  const allPda = lockAddress(wallet, SCOPE_ALL, zeroTarget(), programId);

  const pdas: PublicKey[] = [allPda];

  if (opts?.category) {
    const catTarget = hashTarget(`category:${opts.category}`);
    pdas.push(lockAddress(wallet, SCOPE_CATEGORY, catTarget, programId));
  }
  if (opts?.game) {
    // game format expected: "provider:game_slug", hash it as-is.
    const gameTarget = hashTarget(opts.game.includes(':') ? opts.game : `game:${opts.game}`);
    pdas.push(lockAddress(wallet, SCOPE_GAME, gameTarget, programId));
  }

  const accounts = await connection.getMultipleAccountsInfo(pdas);

  for (const info of accounts) {
    if (!info || !info.owner.equals(programId)) continue;
    const lock = decodeLock(info.data);
    const status = evaluateLock(lock, nowSeconds);
    if (status.locked) return status;
  }

  return { locked: false, scope: null, endTime: null };
}
