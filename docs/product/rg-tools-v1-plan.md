<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 -->

# RG Tools v1 Plan

**Made for Degens. By Degens.**

This plan scopes the first responsible gaming tools that sit around LockVault, buddy accountability, and session guardrails. It is product and program requirements only. No on-chain implementation should start until Section C is reviewed by engineering, security, and counsel.

## Cross-surface discovery and handoffs

This section complements the vault program sections below. It defines where users find each RG tool without duplicating every control on every surface.

### Product line

RG v1 is the first pass at player-side controls that reduce regret without pretending software can guarantee restraint. The stack should be blunt about limits:

- Non-custodial controls only.
- No medical, diagnostic, or regulator-endorsement claims.
- Every hard setting has a clear owner.
- Every live-session nudge has a dashboard escape hatch for durable setup.

### Surface ownership

| Surface | Job | Not Its Job |
| :--- | :--- | :--- |
| Chrome extension | In-casino detection, quick session actions, license strip, cash-out nudges, and dashboard handoffs. | Long-form configuration, partner graph management, legal explanations. |
| Dashboard | Durable user settings, vault rules, buddy relationships, safety controls, and profile history. | Constant in-session UI while the casino tab is active. |
| Discord | Commands, support delivery, buddy alerts, and community reminders. | Sensitive configuration that needs review, consent, or long-form copy. |
| Web tools | Public explainers, SEO discovery, unauthenticated education, and login handoff. | Acting as the canonical settings store. |

### Cross-surface discovery map

| Tool / Flow | Primary Entry Point | Secondary Entry Point | Support Surface | Dashboard Destination | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Session brake and cash-out intent | Extension sidebar `EMERGENCY BRAKE` and redeem threshold controls | Dashboard safety lane | Discord support prompt during intervention | `/dashboard?tab=safety` | Extension is where urgency happens. Dashboard owns cooldown and durable safety settings. |
| Solana timelock vault | Dashboard vault lane | Extension `Open Vault Controls` / `Vault Rules` | Discord help and status commands | `/tools/auto-vault` | Pre-lock review must stay in dashboard until program policy and signer model are final. |
| Buddy / 2-of-3 accountability | Dashboard buddy lane | Extension `Buddy Controls` quick action | Discord buddy alerts and support-only pings | `/tools/buddy-system` | Partner graph, consent, and thresholds stay dashboard-owned. Discord only delivers messages. |
| Fairness toolkit | Web tools index and verification pages | Extension fairness / license affordances | Discord help link to verifier | `/tools/verify` plus `/tools/session-stats` | Copy must define source, window, and degraded state. No guarantee language. |
| Tilt detection and interventions | Extension sidebar while playing | Dashboard safety lane | Discord optional buddy delivery | `/dashboard?tab=safety` | Sensitivity, snooze, and privacy settings belong in dashboard. Extension shows live state. |
| License / trust surfacing | Extension license strip | Casino trust and web tools pages | Discord `/status` and help links | `/dashboard?tab=safety` when user wants controls | Source and stale-date metadata must be visible where verdicts are shown. |
| Trivia jackpot treasury | Discord, only if voluntary donation rules ship | Web transparency page | Dashboard history if account-linked | Deferred | Penalty-funded jackpots stay out of v1. Counsel review before copy ships. |

### Deep-link contract

Extension buttons should open the canonical dashboard host with simple, durable targets:

- Profile overview: `https://dashboard.tiltcheck.me/dashboard`
- Safety controls: `https://dashboard.tiltcheck.me/dashboard?tab=safety`
- Vault rules: `https://dashboard.tiltcheck.me/dashboard?tab=vault`
- Buddy controls: `https://dashboard.tiltcheck.me/dashboard?tab=buddies`

Web handoff routes can keep using `getDashboardHandoffUrl(...)` for environment-aware routing, but the user-facing IA should still name the dashboard lane that owns the setting.

### QA checklist: where do I click

Use this checklist before closing RG v1 surface-routing work:

- Extension signed out: user can still find login, demo mode, and the dashboard entry point.
- Extension signed in: `THE DASHBOARD`, `VAULT RULES`, `SAFETY SETTINGS`, and `BUDDY CONTROLS` each open a dashboard URL instead of an API endpoint or dead route.
- Session brake: user sees the immediate action in the extension and a clear route to durable safety settings.
- Vault: extension quick action opens dashboard-owned vault rules; web AutoVault explainer also routes there.
- Buddy system: dashboard is the only place to manage partners and thresholds; Discord is described as delivery.
- Fairness and trust: web explains definitions; extension shows only concise verdicts and links out for deeper control.
- Discord: help copy points users to dashboard or web explainers when the task needs review or configuration.
- Legal tone: no guarantee, treatment, diagnosis, endorsement, or custodial-control language.

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

## Section D: Fairness Toolkit

The fairness toolkit covers provably fair education, seed verification helpers, seed rotation monitoring, and optional RTP drift monitors. It does not claim a casino is fair. It defines what was checked, where the data came from, and how much confidence the sample deserves.

### D1. Data Source Definition

Every fairness output must name its data source before showing a result.

| Field | Definition |
| :--- | :--- |
| `id` | Stable source identifier used by the UI/API. |
| `label` | Human-readable source name. |
| `type` | One of `operator-api`, `player-export`, `extension-capture`, `public-certification`, or `manual-entry`. |
| `state` | `live`, `degraded`, or `unknown`. |
| `schemaVersion` | Version actually returned by the source when available. |
| `expectedSchemaVersion` | Version the parser expects. |
| `lastCheckedAt` | Timestamp of the most recent source check. |
| `reason` | Blunt explanation for degraded or unknown output. |

State rules:

| State | Use When |
| :--- | :--- |
| `live` | Source is reachable, parser shape matches, and usable samples exist. |
| `degraded` | Source is unreachable, stale, or returns too few usable samples. |
| `unknown` | Source has not been checked or the API/schema changed enough that classification should pause. |

### D2. Window Definition

Every monitor must define the analysis window.

| Field | Definition |
| :--- | :--- |
| `id` | Stable window identifier. |
| `label` | Human-readable window name. |
| `unit` | `bet`, `spin`, `round`, or `session`. |
| `sampleSize` | Count of records inside the window. |
| `minimumSampleSize` | Minimum count required before showing classification-level language. |
| `startedAt` / `endedAt` | Optional timestamps bounding the window. |
| `sourceId` | Source feeding the window. |

Small windows stay degraded. A single bet can verify raw math, but it cannot prove long-run drift or seed hygiene. No cap, one receipt is not a courtroom.

### D3. Drift Definition

Drift is the signed delta between an observed metric and a declared baseline over a defined window:

```text
absoluteDelta = observedMetric - baselineMetric
relativeDelta = absoluteDelta / abs(baselineMetric)
```

If `baselineMetric` is zero, `relativeDelta` is `null`. Divide-by-zero math is not a vibe; call the absolute delta instead.

Direction:

| Direction | Definition |
| :--- | :--- |
| `below-baseline` | Observed metric is lower than baseline by at least the configured threshold. |
| `above-baseline` | Observed metric is higher than baseline by at least the configured threshold. |
| `flat` | Absolute delta is inside the configured threshold. |

Drift copy must say "observed", "baseline", "sample", and "window". It must not imply intent, fraud, or certainty from a small sample.

### D4. Seed Rotation Definition

Seed rotation monitors compare observed seed boundary timing against a declared interval.

Required framing:

| Field | Definition |
| :--- | :--- |
| `observedRotationCount` | Count of seed boundaries seen in the window. |
| `expectedRotationInterval` | Declared expected interval in the same unit as the window. |
| `observedAverageInterval` | Average observed interval between boundaries. |
| `tolerance` | Allowed distance from the declared schedule before surfacing a difference. |

If the expected interval is missing, the monitor state is `unknown`. If samples are too thin, state is `degraded`. The monitor can report a schedule difference; it does not infer motive.

### D5. Product Surfaces

Initial surfaces:

- `packages/shared/src/fairness-toolkit.ts` defines data source, window, drift, and seed rotation helpers.
- `apps/web/src/components/RtpDriftTicker.tsx` must show degraded or unknown states when the stats feed is unavailable or shape-shifted.
- `apps/web/src/app/tools/verify/page.tsx` remains the single-bet receipt checker and must keep warning that one bet is not a full trust verdict.

### D6. Copy Guardrails

Allowed:

- "Observed metric is below baseline for this window."
- "Source schema changed; drift classification is paused."
- "Window is too small for drift classification."
- "This verifies raw math for one receipt."

Not allowed:

- "Guaranteed fair."
- "Casino is rigged."
- "Proves fraud."
- "Live drift confirmed" when the API is unavailable, stale, or running demo data.

## Section F: License And Trust Surfacing

Scope: surface license and trust signals in the browser extension and public casino proof pages without implying legal clearance, casino safety, or regulator endorsement.

Implementation rules:

- Show a compact extension badge plus a source/last-verified detail line.
- Keep web casino profile parity by showing the same source, last-verified, and stale-state metadata in the registry and trust cards.
- Treat stale or missing timestamps as limited evidence, not a clean bill.
- Cite source systems directly, such as the TiltCheck license registry, live trust-rollup feed, current page scan, and regulator verification links where available.
- Include a blunt disclaimer anywhere license evidence is rendered: not legal advice, and not regulator endorsement.

Current v1 threshold:

- License registry metadata is stale after 30 days.
- Live trust-rollup events are stale after 48 hours.
- Extension DOM scans are current at scan time, but older cached reads should warn after 7 days.

Out of scope:

- No new legal conclusions.
- No regulator approval language.
- No automated enforcement decision beyond the existing extension analysis gate.

## Section G: Early-Unlock Economics, Recovery Grants, And Trivia Treasury

RG Tools v1 also covers player-protection surfaces that reduce tilt loops without creating custody, payout, or contest-law risk. Core program surfaces include `LockVault` (timed locks, wallet action locks, guardian recovery, paid early-unlock friction), `Touch Grass`, `Degen Trivia`, and `Recovery Microgrants`.

### Non-custodial boundary (program)

TiltCheck does not hold user keys, execute wallet transfers from user accounts, or mint internal balances that pretend money moved. Wallet movements must be user-signed or explicitly handled by a reviewed treasury workflow.

### Early-unlock fees (harm reduction, not jackpot fuel)

Paid early-unlock fees are a harm-reduction friction mechanism, not jackpot fuel. For RG v1, the user-facing route is:

- debit the configured early-unlock fee from the LockVault ledger;
- log the configured dev skim for reconciliation;
- route the remaining recovery allocation to the recovery microgrant ledger;
- do not credit trivia jackpots from penalty, fee, or punishment mechanics.

### Recovery microgrant ledger

The recovery microgrant pool can receive early-unlock recovery allocations and other reviewed funding sources. Any payout path remains manual, reviewed, and non-custodial until a production treasury workflow is approved.

### Degen trivia

Degen Trivia remains a skill-based community activity and a safer attention redirect. Activity testing can continue, but payout language must stay conservative until public rules are approved.

### Trivia jackpot treasury (deferred funding)

Penalty-funded jackpots are deferred. No LockVault penalty, early-unlock fee, trust penalty, or similar friction mechanic may seed the trivia jackpot.

The only allowed funding path before legal review is voluntary donation to a published treasury address:

- publish the treasury address on a transparent web page;
- state that donations do not buy entry, odds, or a promised payout;
- state that no guaranteed prize pool exists;
- keep Discord command/help copy gated behind counsel review before enabling payout claims;
- reconcile any treasury movements publicly before promoting a trivia drop.

Open legal review:

- contest and sweepstakes treatment by jurisdiction;
- crypto payout restrictions and tax reporting;
- donation wording and no-consideration entry mechanics;
- winner selection, eligibility, and dispute rules.

### Launch gate (prize-bearing trivia)

Do not promote prize-bearing trivia until the public rules, treasury reconciliation process, Discord command copy, and payout workflow are reviewed. This is the line between a community game and a compliance-shaped failure mode.

## Appendix: Tracked work (TIL)

Short pointers for parallel engineering tracks; detail lives in issues.

- **Session brake / cash-out intent (TIL-122):** Extension owns the live brake; dashboard owns sensitivity, snooze, cooldown, history.
- **Solana timelock vault (TIL-124):** Dashboard owns pre-lock review until program policy ships.
- **Tilt detection + interventions (TIL-125):** Extension live UI; dashboard durable controls; avoid medical framing.
- **License / trust surfacing (TIL-126):** Extension strip; web evidence pages; source + stale-date visible; see Section F.
- **Buddy 2-of-3 design (TIL-127):** Aligned with Section C above.
- **Fairness toolkit (TIL-123):** Web owns education; extension compact affordances; define RTP/drift data source; see Section D.
- **Trivia jackpot treasury (TIL-129):** Deferred penalty-funded jackpots; voluntary-donation path and counsel review only; see Section G.
