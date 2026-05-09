<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 -->

# RG Tools v1 Plan

**Made for Degens. By Degens.**

This plan scopes the first responsible gaming tools that sit around LockVault, buddy accountability, and session guardrails. It is product and program requirements only. No on-chain implementation should start until Section C is reviewed by engineering, security, and counsel.

## Section A: Solo Vault v1

Solo Vault v1 is the baseline user-owned lock flow.

- User chooses amount, duration, and reason.
- User signs the funding transaction from their own wallet.
- Program enforces `unlockAt`.
- No hidden operator override.
- Early unlock is not a v1 feature.
- Every lock, extension, unlock request, and unlock completion emits an auditable event.

The solo path remains the default for users who do not want a buddy or joint-control terms.

## Section B: Buddy Accountability v1

Buddy Accountability v1 is the social guardrail around user behavior.

- User invites a buddy from the dashboard.
- Buddy accepts explicit visibility and notification terms.
- Buddy can receive tilt alerts, cooldown breach alerts, and vault unlock notifications.
- Buddy cannot move funds, seize funds, or impersonate the user.
- Buddy controls are dashboard-owned; extension and Discord only mirror the active state and send nudges.

This lane is notification-first. It does not become a signing lane until Section C is approved.

## Section C: Buddy 2-of-3 Multisig Vault

### Goal

Add an accountability partner to vault exits without creating a pure 2-of-2 freeze risk. The vault should slow down tilt-driven withdrawals while preserving a user-owned break-glass route if the buddy is unavailable, malicious, or compromised.

### Signers

| Signer              | Owner                      | Purpose                                    | Required Controls                                              |
| ------------------- | -------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| Primary user wallet | User                       | Funds, configures, and initiates exits     | Must be the wallet that created the vault intent               |
| Buddy signer        | Accountability partner     | Confirms normal exit after cooldown        | Must accept joint-control terms before activation              |
| Recovery signer     | User-owned break-glass key | Prevents buddy lock-in or partner griefing | Must be registered at setup and protected with strong warnings |

The 2-of-3 set is `primary user wallet`, `buddy signer`, and `recovery signer`.

### Signer Rules

| Action                   | Required Signers                                                                                       | Program Rule                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Create vault             | Primary user wallet                                                                                    | Creates the vault config and signer set before funds move                |
| Fund vault               | Primary user wallet                                                                                    | Deposit transaction only; no buddy approval required                     |
| Extend lock              | Primary user wallet                                                                                    | Allowed only when it increases `unlockAt`; never shortens a lock         |
| Normal release           | Primary user wallet plus buddy signer                                                                  | Allowed after `unlockAt` and after final risk disclosure                 |
| Break-glass release      | Primary user wallet plus recovery signer                                                               | Allowed after `unlockAt` plus an extra break-glass delay                 |
| Buddy replacement        | Primary user wallet plus current buddy signer, or primary user wallet plus recovery signer after delay | Must notify old buddy, new buddy, and user                               |
| Recovery signer rotation | Primary user wallet plus recovery signer                                                               | Must enforce a pending period before new recovery key can release funds  |
| Early unlock             | Not supported in v1                                                                                    | Big yikes path. Do not ship without separate legal and security approval |

Break-glass is not an instant bypass. It is the escape hatch for partner failure, not a "I'm due" button for nuking the cooldown because variance got spicy.

### UX Flows

#### Setup

1. User selects `Buddy Vault` from LockVault.
2. Product explains that this is a joint-control safety tool, not custody, investment advice, or a casino feature.
3. User chooses amount, duration, buddy, and recovery signer.
4. Buddy receives an invite with the exact signer responsibilities and risk language.
5. Buddy accepts terms.
6. User confirms recovery key storage warnings.
7. Vault becomes active only after all signer metadata is registered and the user signs the funding transaction.

#### Normal Release

1. User requests release after `unlockAt`.
2. UI shows amount, vault age, reason, buddy identity, and "cash out before you degen it back" copy.
3. Buddy receives an approval request with the same release details.
4. If buddy signs, user signs, and the program releases funds.
5. Event stream records `buddy_vault.release_requested`, `buddy_vault.buddy_approved`, and `buddy_vault.released`.

#### Buddy Refusal Or Timeout

1. User requests release after `unlockAt`.
2. Buddy rejects, ignores, or times out.
3. UI offers break-glass release with an extra delay and plain-language warnings.
4. User signs with primary wallet and recovery signer after the delay.
5. Buddy receives notice that break-glass was used.
6. Trust Engine receives the event, but no punitive score should ship until policy is reviewed.

#### Buddy Replacement

1. User starts buddy replacement.
2. Current buddy co-signs replacement, or user uses recovery signer after a delay.
3. New buddy accepts terms.
4. No funds move during replacement.
5. Pending unlock requests pause until the signer set is settled.

#### Recovery Rotation

1. User starts recovery rotation from dashboard.
2. Product warns that losing both primary and recovery access can strand funds.
3. Old recovery signer co-signs the rotation.
4. Program enforces a pending period before the new recovery signer can be used for release.
5. User and buddy receive notifications.

### Threat Model

| Threat                          | Risk                                                   | Required Mitigation                                                              |
| ------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Malicious buddy refuses to sign | User funds can be delayed                              | Recovery path after `unlockAt` plus delay                                        |
| Buddy is compromised            | Attacker can approve a normal release with user        | Require primary user signature and notify user on every buddy action             |
| User is coerced by buddy        | Buddy pressure can defeat RG intent                    | Plain warnings, revocation path, replacement flow, and support escalation copy   |
| User self-coerces during tilt   | Recovery key becomes an impulse bypass                 | Extra break-glass delay, friction copy, and event logging                        |
| Recovery key is lost            | Break-glass route is unavailable                       | Setup warnings, rotation support, no activation without confirmation             |
| Primary wallet is compromised   | Attacker may combine with buddy or recovery compromise | User notifications, session checks, and optional high-risk hold before release   |
| Signer set is misconfigured     | Funds can be stranded                                  | Dry-run config validation before deposit and immutable signer snapshot per vault |
| Operator overreach              | Custody or hidden control concerns                     | Operator must not be a signer and must not have emergency unlock authority       |
| Legal joint-control ambiguity   | Terms may be unclear                                   | Counsel-approved buddy terms before launch                                       |

### Program Requirements

- Store immutable vault config with `vaultId`, `ownerWallet`, `buddySigner`, `recoverySigner`, `createdAt`, `unlockAt`, `breakGlassDelaySeconds`, and `status`.
- Reject signer sets where any two roles resolve to the same public key.
- Reject release before `unlockAt`.
- Reject break-glass release until `unlockAt + breakGlassDelaySeconds`.
- Allow lock extension only when the new `unlockAt` is later than the current value.
- Emit structured events for setup, funding, extension, release request, buddy approval, buddy rejection, break-glass start, break-glass completion, signer rotation, and failed validation.
- Never store private keys, seed phrases, recovery material, or buddy credentials.
- Keep operator services out of the signer set.
- Require deterministic client display of signer identities before funding.
- Provide a simulation or devnet-only proof before mainnet readiness review.

### API And Data Requirements

- `POST /vaults/buddy/intents` creates a pending setup intent.
- `POST /vaults/buddy/:vaultId/activate` records funded activation after wallet signature proof.
- `POST /vaults/buddy/:vaultId/release-requests` starts a normal release request.
- `POST /vaults/buddy/:vaultId/buddy-approvals` records buddy approval or rejection.
- `POST /vaults/buddy/:vaultId/break-glass` starts the recovery path.
- `POST /vaults/buddy/:vaultId/signers/replace-buddy` starts buddy replacement.
- `POST /vaults/buddy/:vaultId/signers/rotate-recovery` starts recovery rotation.

All endpoints must validate authenticated user identity, signer ownership proofs, request freshness, replay resistance, and idempotency keys.

### Legal And Risk Gates

- Counsel must approve joint-control terms before any user-facing activation.
- Product must state that TiltCheck does not custody funds, control keys, or guarantee recovery.
- Buddy acceptance must include duties, limits, abuse reporting, and no-financial-advice language.
- Break-glass copy must avoid implying emergency financial rescue.
- Mainnet launch requires a rollback plan that disables new buddy vault creation without affecting existing release rights.

### Open Decisions

- Exact chain and multisig primitive for v1.
- Break-glass delay length.
- Whether buddy rejection should require a reason.
- Whether Trust Engine should score break-glass usage in v1 or only log it.
- Whether recovery rotation requires buddy notice only or buddy acknowledgement.

### Implementation Readiness Checklist

- [ ] Counsel approves joint-control and non-custodial terms.
- [ ] Security reviews signer set rules and failure modes.
- [ ] Product approves setup, release, timeout, replacement, and recovery copy.
- [ ] Engineering chooses program primitive and writes a technical spec.
- [ ] Devnet test proves normal release, buddy timeout, break-glass release, and signer rotation.
- [ ] Rollback plan is documented before mainnet activation.
