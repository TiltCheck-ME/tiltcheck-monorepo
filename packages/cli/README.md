<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 -->

# @tiltcheck/cli

TiltCheck CLI is an offline-first provably fair verifier and casino intelligence toolkit. It executes 100% locally with zero remote API dependencies, zero trackers, and zero telemetry.

---

## Why

Most players trust casino-rendered green checkmarks and vague "provably fair" claims without checking the math. When a slot drains a bankroll twice as fast as expected, degens assume bad variance. In reality, casinos regularly configure provider slots to low-tier 94% or 92% RTP profiles.

TiltCheck CLI strips the marketing noise. It checks the cryptographic hashes offline, reveals active slot downgrade tiers, and generates tamper-proof Ed25519 self-exclusion lock commitments before a session goes full tilt.

---

## Installation & Execution

From the monorepo root:

```bash
# Build the CLI
pnpm --filter @tiltcheck/cli build

# Run directly via Node
node packages/cli/bin/tiltcheck.cjs --help
```

---

## Commands

### 1. `tiltcheck verify <serverSeed> <clientSeed> <nonce>`

Offline HMAC-SHA256 provably fair bet verifier matching crypto and sweeps casino algorithms (Stake, Roobet, BC.Game).

- Computes the SHA256 HMAC of `clientSeed:nonce` keyed by `serverSeed`.
- Extracts the leading 4 bytes (32-bit integer) and converts to normalized float in `[0, 1)`.
- Calculates standard game outcomes:
  - **Dice:** `0.00` to `100.00`
  - **Crash / Limbo Multiplier:** Derived using casino house edge standard (default 1.0%).

```bash
# Verify a single bet round
node packages/cli/bin/tiltcheck.cjs verify "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9" "my-client-seed" 1

# Output raw JSON receipt
node packages/cli/bin/tiltcheck.cjs verify "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9" "my-client-seed" 1 --json
```

### 2. `tiltcheck rtp <operator>`

Offline terminal inspection reading RTP tiers from local datasets (`casinos.json` and `provider-master-rtp.json`).

- Surfaces Originals RTP (e.g. Stake Originals 99.00% / 1% edge).
- Compares certified GLI/eCOGRA provider tiers (Pragmatic Play, Hacksaw, Play'n GO).
- Computes mathematical bankroll bleed acceleration for lowered slot configurations (e.g. +57% bleed on 94.50%, +129% bleed on 92.00%).

```bash
# Inspect operator RTP configuration
node packages/cli/bin/tiltcheck.cjs rtp stake

# Filter certified provider tiers
node packages/cli/bin/tiltcheck.cjs rtp stake --provider pragmatic
```

### 3. `tiltcheck trust <operator>`

Offline inspection of casino licenses, trust grades, risk levels, vault support, and audited receipts.

- Surfaces regulatory jurisdiction (e.g. Curaçao, Anjouan, Isle of Man, sweepstakes models).
- Inspects vault support (GraphQL native APIs vs DOM fallbacks) and playthrough terms.
- Emits explicit critical warnings for rogue and blacklisted casinos.

```bash
# Inspect operator trust dossier
node packages/cli/bin/tiltcheck.cjs trust roobet

# Check known rogue casino warning
node packages/cli/bin/tiltcheck.cjs trust "Planet 7"
```

### 4. `tiltcheck cooldown <hours>`

Generates an offline, cryptographically signed Ed25519 voluntary cooldown lock commitment.

- Generates an in-memory Ed25519 keypair offline.
- Creates a timestamped commitment specifying `durationHours`, `createdAt`, `lockedUntil`, and `scope`.
- Signs the canonical JSON payload and verifies the signature locally.
- Emits a token formatted for consumption by the TiltCheck browser extension to enforce client-side deposit locks and spin brakes.

```bash
# Lock in a 24-hour voluntary cooldown commitment
node packages/cli/bin/tiltcheck.cjs cooldown 24

# Generate 72-hour lock for specific casino scope with JSON output
node packages/cli/bin/tiltcheck.cjs cooldown 72 --scope stake-us-only --json
```

### 5. `tiltcheck about`

Displays TiltCheck's non-custodial manifesto, architectural principles, and core mission.

---

## Testing

```bash
# Run unit test suite
pnpm --filter @tiltcheck/cli test

# Run clean and rebuild cycle
pnpm --filter @tiltcheck/cli clean
pnpm --filter @tiltcheck/cli build
```

---

Made for Degens. By Degens.
