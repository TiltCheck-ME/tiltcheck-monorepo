<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# LockVault Module

Disposable time-locked vault wallets for anti-tilt & savings flows.

## Goals
- Non-custodial (user-originated temporary wallet)
- Enforced unlock time (no early release unless emergency flow added later)
- Minimal friction: one command `/vault lock` with amount + duration
- Transparent: events emitted via Event Router (`vault.locked`, `vault.extended`, `vault.unlocked`)

## Commands (Discord)
- `/vault lock amount:<amt> duration:<dur> reason:<text?>`
- `/vault status`
- `/vault extend id:<vaultId> additional:<dur>`
- `/vault unlock id:<vaultId>`

## Data Model
```
LockVaultRecord {
  id: string;
  userId: string;
  vaultAddress: string;
  createdAt: number;
  unlockAt: number;
  lockedAmountSOL: number; // 0 => ALL snapshot
  status: 'locked' | 'extended' | 'unlock-requested' | 'unlocked' | 'emergency-unlocked';
  reason?: string;
  extendedCount: number;
  history: { ts: number; action: string; note?: string }[];
}
```

## Persistence
Stored JSON at `data/lockvault.json` (configurable via `LOCKVAULT_STORE_PATH`).

## Wallet lock enforcement
- Account-level wallet locks are enforced inside the LockVault domain layer for owner-driven mutators, including deposit, lock creation, unlock/release, guardian changes, and owner-initiated withdrawal execution paths.
- The API router still performs early rejects for the primary HTTP flows, but domain checks are the fail-closed source of truth so future callers cannot bypass the lock by skipping one route helper.

## Future Enhancements
- Price oracle conversion USD->SOL
- Partial withdrawals after lock expires
- Emergency unlock with trust penalty
- Multi-signature locks (group vaults)
- Risk heuristics (tilt detection auto-suggest lock)
