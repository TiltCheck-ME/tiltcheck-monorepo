<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-06 -->

# Non-Custodial On-Chain Voluntary Cooldown Vault: Architectural Specification & Audit Dossier

Status: Production Deployed (Solana Devnet)  
Program ID: `7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2`  
Upgrade Authority Loader: `BPFLoaderUpgradeab1e11111111111111111111111`  
ProgramData Address: `47CqtAVQAJuFM6w2DLw7wf7tLN6hoE5D5XzXRgaMxmXi` (187,869 bytes)  
Classification: Cryptographic Voluntary Self-Exclusion & Timelock Registry  
Custody Model: 100% Non-Custodial (Zero fund custody, zero private key possession)  

---

## 1. Executive Summary & Threat Model

The TiltCheck Voluntary Cooldown Vault is an immutable, on-chain self-exclusion timelock mechanism built with the Anchor Framework on Solana. Unlike centralized self-exclusion lists that rely on operator goodwill, internal database state, or custodial token locking, this system implements mathematical self-exclusion enforced directly through Program Derived Addresses (PDAs).

```
+---------------------------------------------------------------------------------------------------+
|                                  NON-CUSTODIAL GUARANTEE                                          |
|                                                                                                   |
|  * ZERO FUNDS MOVED: The Cooldown program NEVER accepts SOL, SPL tokens, or financial assets.     |
|  * ZERO KEY CUSTODY: The program NEVER generates, stores, or intercepts user private keys.       |
|  * NON-REVERSIBLE TIMELOCKS: Once an on-chain lock is signed, it CANNOT be shortened or revoked. |
|  * INDEPENDENT VERIFICATION: Any surface can derive and verify active locks via public RPC nodes. |
+---------------------------------------------------------------------------------------------------+
```

### Threat Model & Attack Vector Mitigations

| Threat Vector | Attack Scenario | Mitigation in Protocol |
| :--- | :--- | :--- |
| **Lock Shortening** | A compromised client attempts to reduce `endTime` during a tilt episode. | **Prevented On-Chain:** `instructions/extend_lock.rs` and `set_lock.rs` strictly assert `new_end_time > current_end_time`. Transactions attempting to decrease or prematurely unlock fail on-chain with `CooldownError::LockCannotBeShortened`. |
| **PDA Collision** | A malicious actor crafts a scope/target hash that collides with another user's lock. | **Prevented Cryptographically:** PDA derivation includes the player's 32-byte public key in seeds: `['lock', owner, [scope], target_id]`. Distinct players cannot collide, even with identical target hashes. |
| **Unauthorized Modification** | An attacker submits an instruction to extend or alter another user's lock PDA. | **Prevented via Signer Check:** Both `SetLock` and `ExtendLock` account structs require `owner: Signer<'info>`. The Solana runtime rejects transactions without the matching Ed25519 signature. |
| **Replay / Stale Lock Tampering** | An attacker attempts to set an expired timestamp to bypass exclusion. | **Prevented On-Chain:** `set_lock` validates `end_time > Clock::get()?.unix_timestamp`, throwing `CooldownError::EndTimeInPast` if expired. |
| **RPC / Node Outage Denial** | Devnet RPC node outage prevents lock status checking. | **Local Fallback:** Extension and API maintain multi-layer caching with in-flight verification and fail-closed options (`COOLDOWN_GUARD_FAIL_CLOSED`). |

---

## 2. On-Chain Program Specification (`programs/cooldown`)

### 2.1 State Layout

The program defines a single account struct: `Lock`. Every active or historical lock PDA adheres to this exact 90-byte memory layout (8-byte Anchor discriminator + 82-byte struct payload):

```rust
#[account]
pub struct Lock {
    /// Owner of the self-exclusion lock (32 bytes)
    pub owner: Pubkey,
    /// Exclusion scope: 0 = All, 1 = Category, 2 = Game (1 byte)
    pub scope: u8,
    /// 32-byte target identifier:
    /// - Scope 0 (All): zeroTarget() [32 zeroes]
    /// - Scope 1 (Category): sha256("category:<slug>")
    /// - Scope 2 (Game): sha256("game:<slug>") or raw hash (32 bytes)
    pub target_id: [u8; 32],
    /// Unix timestamp when lock expires (8 bytes, i64)
    pub end_time: i64,
    /// Unix timestamp when lock was initiated (8 bytes, i64)
    pub created_at: i64,
    /// Canonical PDA bump seed (1 byte, u8)
    pub bump: u8,
}
```

#### Memory Byte Offsets

| Field | Type | Offset | Size | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `discriminator` | `[u8; 8]` | 0 | 8 | Anchor account discriminator (`sha256("account:Lock")[0..8]`) |
| `owner` | `Pubkey` | 8 | 32 | Player Solana address |
| `scope` | `u8` | 40 | 1 | `0 = All`, `1 = Category`, `2 = Game` |
| `target_id` | `[u8; 32]` | 41 | 32 | Scope target hash |
| `end_time` | `i64` | 73 | 8 | Expiration unix timestamp (Little-Endian) |
| `created_at` | `i64` | 81 | 8 | Creation unix timestamp (Little-Endian) |
| `bump` | `u8` | 89 | 1 | PDA canonical bump seed |
| **Total Size** | | | **90 bytes** | |

### 2.2 PDA Derivation Specification

PDA derivation is strictly deterministic. The program address is derived via:

$$\text{PDA} = \text{PublicKey.findProgramAddressSync}([\text{"lock"}, \text{owner}, [\text{scope}], \text{targetId}], \text{PROGRAM\_ID})$$

```typescript
export function lockAddress(
  owner: PublicKey,
  scope: number,
  targetId: Uint8Array,
  programId: PublicKey = COOLDOWN_PROGRAM_ID,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('lock'), owner.toBuffer(), Buffer.from([scope]), Buffer.from(targetId)],
    programId,
  )[0];
}
```

### 2.3 Instruction Interfaces

#### Instruction 1: `set_lock`

- **Discriminator:** `0x4a2d89840b56d5f2` (`sha256("global:set_lock")[0..8]`)
- **Accounts:**
  1. `owner`: `[signer, writable]` - Payer and lock owner.
  2. `lock`: `[writable]` - Program Derived Address for the lock.
  3. `system_program`: `[]` - System Program for PDA allocation and rent exemption.
- **Parameters:**
  - `scope: u8` (`0 = All`, `1 = Category`, `2 = Game`)
  - `target_id: [u8; 32]`
  - `end_time: i64` (must be greater than current on-chain clock unix timestamp)
- **Behavior:**
  - If the PDA does not exist: Initializes account, transfers rent, writes initial state.
  - If the PDA already exists (Upsert): Validates `end_time > lock.end_time`, strengthens lock duration.

#### Instruction 2: `extend_lock`

- **Discriminator:** `0x44978c908b7a76aa` (`sha256("global:extend_lock")[0..8]`)
- **Accounts:**
  1. `owner`: `[signer]` - Lock owner.
  2. `lock`: `[writable]` - Existing PDA lock account.
- **Parameters:**
  - `new_end_time: i64`
- **Behavior:**
  - Asserts `new_end_time > lock.end_time`.
  - Mutates `lock.end_time = new_end_time`.
  - Emits `LockExtended` on-chain event.

---

## 3. Scope Hierarchy & Evaluation Algorithm

The Cooldown protocol enforces a strict three-tier protection hierarchy:

$$\text{Scope Priority: } \text{SCOPE\_ALL (0)} > \text{SCOPE\_CATEGORY (1)} > \text{SCOPE\_GAME (2)}$$

```
+-------------------------------------------------------------------+
|                      LOCK EVALUATION HIERARCHY                    |
|                                                                   |
|   1. Query SCOPE_ALL (target: zeroTarget)                         |
|      |                                                            |
|      +---> Active? ===> RETURN LOCKED (Scope: 'all')              |
|      |                                                            |
|   2. Query SCOPE_CATEGORY (target: sha256("category:<slug>"))     |
|      |                                                            |
|      +---> Active? ===> RETURN LOCKED (Scope: 'category')         |
|      |                                                            |
|   3. Query SCOPE_GAME (target: sha256("game:<slug>"))             |
|      |                                                            |
|      +---> Active? ===> RETURN LOCKED (Scope: 'game')             |
|      |                                                            |
|   4. None Active ===> RETURN UNLOCKED                             |
+-------------------------------------------------------------------+
```

### Precedence Matrix

| Active On-Chain Locks | Requested Check Context | Evaluated Result | Effective Policy |
| :--- | :--- | :--- | :--- |
| `SCOPE_ALL` active | `game: "pragmatic:plinko"` | **LOCKED (`all`)** | Global lock preempts all game-specific requests. |
| `SCOPE_ALL` active | `category: "crash"` | **LOCKED (`all`)** | Global lock preempts all category-specific requests. |
| `SCOPE_CATEGORY ("crash")` active | `category: "crash"` | **LOCKED (`category`)** | Direct category exclusion enforced. |
| `SCOPE_CATEGORY ("crash")` active | `game: "spribe:crash"` | **LOCKED (`category`)** | Crash category covers all crash games. |
| `SCOPE_CATEGORY ("crash")` active | `game: "relax:dice"` | **UNLOCKED** | Dice game is outside the crash category. |
| `SCOPE_GAME ("relax:dice")` active | `game: "relax:dice"` | **LOCKED (`game`)** | Target game blocked. |
| `SCOPE_GAME ("relax:dice")` active | `game: "pragmatic:plinko"` | **UNLOCKED** | Plinko is unaffected by dice lock. |
| Any lock with `end_time < now` | Any context | **UNLOCKED** | Expired locks are non-blocking. |

---

## 4. Cross-Surface Multi-Layer Sync Architecture

TiltCheck synchronizes on-chain state across 4 distinct surfaces without custodial intermediaries:

```
+-----------------------------------------------------------------------------------------------------+
|                                   CROSS-SURFACE ARCHITECTURE                                        |
|                                                                                                     |
|  +--------------------+                                              +----------------------------+ |
|  |     Web Vault      | --[window.postMessage]---------------------> |      Chrome Extension      | |
|  | (tiltcheck.me/     |                                              |  * Deposit Barrier Block   | |
|  |      cooldown)     |                                              |  * In-Session HUD Timer    | |
|  +--------------------+                                              +----------------------------+ |
|            |                                                                        ^               |
|    [Wallet Standard]                                                                |               |
|            |                                                                  [SSE Stream /         |
|            v                                                                   Polling Sync]        |
|  +--------------------+               +----------------------------+                |               |
|  |   Solana Devnet    | <------------ |       Central API          | ---------------+               |
|  |  (Anchor Program)  |               |  (GET /cooldown/check)     |                                |
|  +--------------------+               +----------------------------+                                |
|                                                     ^                                               |
|                                                     |                                               |
|                                            [Internal API Proxy]                                     |
|                                                     |                                               |
|                                       +----------------------------+                                |
|                                       |       User Dashboard       |                                |
|                                       |  * On-Chain Vault Card     |                                |
|                                       |  * Live Ticker Countdown   |                                |
|                                       +----------------------------+                                |
+-----------------------------------------------------------------------------------------------------+
```

### 4.1 Surface 1: Web Vault (`apps/web/src/app/cooldown/page.tsx`)
- **Role:** Non-custodial transaction creation and signing.
- **Wallet Adapters:** Wallet Standard signers (Phantom, Backpack, Solflare, Brave, Ledger).
- **Event Dispatch:** Dispatches window `postMessage` on wallet connection and transaction confirmation:
  - `WALLET_CONNECTED`: `{ wallet: string, cluster: 'devnet' }`
  - `LOCK_UPDATED`: `{ wallet: string, locked: boolean, scope: string, endTime: number, pda: string }`

### 4.2 Surface 2: Central API Gateway (`apps/api/src/routes/cooldown.ts`)
- **Role:** High-speed RPC aggregation, in-memory TTL caching, and real-time Server-Sent Events (SSE).
- **Endpoints:**
  - `GET /cooldown/check?wallet=<pubkey>&verbose=true`: Returns `{ locked, scope, endTime, pda, timeRemainingSecs, verifiedAt }`.
  - `POST /cooldown/verify-tx`: Validates transaction signatures on Solana, clears cache, and triggers broadcast.
  - `GET /cooldown/stream?wallet=<pubkey>`: Real-time SSE push connection for extensions and external clients.

### 4.3 Surface 3: Browser Extension (`apps/chrome-extension`)
- **Role:** Real-time client-side enforcement and in-session harm reduction.
- **Components:**
  - `background.js`: Manages 5-minute periodic alarms and persistent SSE stream connections.
  - `content.ts`: Window event bridge captures `LOCK_UPDATED` directly from `tiltcheck.me/cooldown`.
  - `deposit-barrier.ts`: Injects `#tiltcheck-cooldown-hud` countdown timer on supported casinos (Stake, Roobet, BC.Game, Rollbit) and disables deposit action triggers.

### 4.4 Surface 4: User Dashboard (`apps/user-dashboard`)
- **Role:** Persistent monitoring, profile linking, and quick-extend triggers.
- **Components:**
  - `src/index.ts`: Exposes `GET /api/user/:discordId/cooldown-status` proxying to canonical API with `DegenIdentity` wallet fallback.
  - `public/index.html` & `public/js/app.js`: Renders `#cooldown-vault-card` in `#vault-tab` with live 1s ticker countdown, PDA display, and `+7d Extend` URL routing (`https://tiltcheck.me/cooldown?wallet=<wallet>&extend=7`).

---

## 5. Verification, Test Harnesses & CI Pipelines

The Cooldown system is verified across three independent test suites:

### 5.1 Rust In-Crate LiteSVM Integration Tests (`programs/cooldown/tests/cooldown.rs`)
Direct execution on simulated Solana VM:
1. `clock_warp_shows_lock_active_then_expired`: Validates temporal decay.
2. `set_lock_rejects_end_time_in_the_past`: Validates retroactive protection.
3. `set_lock_rejects_invalid_scope`: Validates scope bounds (`u8 <= 2`).
4. `game_lock_does_not_block_different_game`: Validates target isolation.
5. `set_game_lock_stores_the_record`: Validates storage integrity.
6. `extend_lock_moves_end_forward`: Validates forward extension.
7. `all_scope_lock_has_its_own_pda`: Validates PDA separation.
8. `shorten_returns_lock_cannot_be_shortened`: Validates immutability.
9. `upsert_strengthens_existing_lock`: Validates idempotent extension.

### 5.2 TypeScript End-to-End Devnet Smoke Suite (`scripts/smoke-anchor-devnet.ts`)
21 of 21 checks executed directly against live Devnet RPC (`pnpm smoke:cooldown`):
- Stage 1: Live Devnet Program Inspection & Executable Bytecode verification.
- Stage 2: Multi-Player Test Keypairs & PDA Derivation collision resistance.
- Stage 3: Instruction Serialization & Anchor Discriminator verification (`0x4a2d89840b56d5f2`, `0x44978c908b7a76aa`).
- Stage 4: Binary Account Layout Codec & Hierarchy evaluation.
- Stage 5: Multi-Surface Cross-Ecosystem Contract validation.

### 5.3 CI Pipeline Automation

| Workflow | Path | Trigger | Safety Function |
| :--- | :--- | :--- | :--- |
| **Cooldown Smoke** | `.github/workflows/cooldown-smoke.yml` | Push, PR, Daily Cron (`07:00 UTC`), `workflow_dispatch` | Continuous health monitor for live Anchor Devnet deployment. |
| **Railway Deploy Gate** | `.github/workflows/deploy-railway.yml` | Push to `main` | Blocks production container builds if Anchor contract checks fail. |
| **PR Subsystem Gate** | `.github/workflows/pr-test.yml` | Pull Request targeting `main` | Runs smoke tests when contract or SDK files are modified. |

---

## 6. Audit & Compliance Checklist

- [x] **Zero Custody:** Program contains no instruction capable of receiving or transferring SOL or SPL tokens.
- [x] **Zero Admin Backdoor:** No owner, admin, or governance key has authority to truncate, override, or clear player locks.
- [x] **Idempotent Strengthening:** Duplicate set transactions can only advance expiration forward.
- [x] **Client-Side Signers:** Only the user's private key held in their personal wallet can authorize PDA initialization.
- [x] **Deterministic PDAs:** Addresses derived using standard Solana cryptography (`findProgramAddressSync`).
- [x] **Brand Law Compliance:** 100% Zero Emojis across all contracts, SDKs, tests, and documentation.
- [x] **Production Status:** Deployed and verified on Solana Devnet (`7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2`).
