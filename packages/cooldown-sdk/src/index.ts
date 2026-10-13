// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
export {
  COOLDOWN_PROGRAM_ID,
  SCOPE_ALL,
  SCOPE_CATEGORY,
  SCOPE_GAME,
  anchorDiscriminator,
  cooldownProgramId,
  evaluateLock,
  hashTarget,
  lockAddress,
  scopeName,
  zeroTarget,
} from './codec.js';
export type { DecodedLock, LockStatus, ScopeName } from './codec.js';
export { decodeLock } from './layout.js';
export { setLock, extendLock } from './instructions.js';
export { isLocked } from './client.js';
export type { IsLockedOpts } from './client.js';
