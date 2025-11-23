# 17 - LockVault Module Spec

Disposable Magic-style wallets used as *intentional friction* devices to prevent tilt-driven bankroll nuking. Users lock funds for a fixed interval; early unlock blocked.

## Rationale
Tilt moments drive impulsive, high-risk actions. By encouraging players to proactively time-lock a portion of their assets, we reduce harm without custodial control. Vault wallets are generated per lock (Keypair for MVP; Magic integration later) and never reused.

## Core Principles
- Non-custodial: user funds reside in a user-controlled disposable wallet.
- Time enforcement: unlock only after `unlockAt`. No silent bypass.
- Simple mental model: "Parking funds until Future Me is calmer.".
- Event-driven: all actions create auditable events.
- Cheap infra: JSON persistence; no DB requirement initially.

## Commands (Discord)
```
/vault lock amount:<"5 SOL"|"$100"|"all"> duration:<"24h"|"3d"|"90m"> reason:<optional>
/vault status
/vault extend id:<vaultId> additional:<duration>
/vault unlock id:<vaultId>
```

## Event Types (proposed)
- vault.locked
- vault.extended
- vault.unlocked
(For now cast as `any` until types package updated.)

## Data Model
```
LockVaultRecord {
  id: string;                // unique vault id
  userId: string;            // Discord user
  vaultAddress: string;      // ephemeral wallet public key
  createdAt: number;
  unlockAt: number;          // ms epoch
  lockedAmountSOL: number;   // normalized SOL (0 => ALL snapshot)
  originalInput: string;     // raw amount input
  status: 'locked' | 'extended' | 'unlock-requested' | 'unlocked' | 'emergency-unlocked';
  reason?: string;           // user-provided rationale
  extendedCount: number;     // how many times extended
  history: { ts: number; action: string; note?: string }[];
}
```

## Duration Parsing
MVP supports shorthand: `30m`, `12h`, `3d`. Min 10m, Max 30d.

## Amount Parsing
Natural language via existing parser. USD treated 1:1 to SOL until oracle integration. `all` stores `0` as sentinel.

## Persistence Strategy
- JSON file at `data/lockvault.json` (override via `LOCKVAULT_STORE_PATH`).
- Debounced writes (250ms) after mutating operations.
- On startup load existing vault records.

## Security / Trust Considerations
- No private key persistence of generated vaults in MVP.
- Real SOL transfer logic deferred (would require secure key mgmt / user signing flows).
- Early unlock path not implemented to avoid accidental vulnerability.
- Future: penalty events on emergency unlock affecting trust engines.

## Roadmap Enhancements
1. USD/SOL conversion via pricing oracle.
2. Real transfer flows (user signs send to vault / unlock return tx).
3. Multi-user consensus vault (group locking).
4. Automated tilt triggers (suggest lock based on behavior).
5. Analytics: average lock duration, extension frequency.

## Anti-Patterns Avoided
- No custodial balance ledger.
- No hidden override to unlock before time.
- No reliance on centralized session state.

## Integration Points
- Discord bot commands (added in `/apps/discord-bot/src/commands/lockvault.ts`).
- EventRouter event emissions for telemetry & daily rollup inclusion.
- Natural language parser for user-friendly amounts/durations.

## Future Type Integration
Add new event types to `@tiltcheck/types` and remove `as any` casts.
