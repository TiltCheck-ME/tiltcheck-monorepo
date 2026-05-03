<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# Cloud Agent Environment Setup (Node 20 + pnpm 10.29.1)

Use this for Cursor cloud sessions so the agent image comes up with the TiltCheck monorepo toolchain ready by default instead of making every session manually bootstrap Node, pnpm, and workspace dependencies like a clown show.

## Startup command

Configure the cloud agent startup command in Cursor web to:

```bash
bash scripts/cloud-agent-env-setup.sh
```

## What this does

- Installs and pins a managed Node `20.19.0` toolchain when the base image does not already provide a working Node 20 runtime.
- Exposes `node`, `npm`, `npx`, `corepack`, and `pnpm` on `PATH` for future shells by wiring `$HOME/.local/bin`.
- Pins `pnpm` to `10.29.1`.
- Installs workspace dependencies only when the lockfile or toolchain fingerprint changes.
- Verifies `vitest`, `jsdom`, and `typescript` are available.
- Prebuilds workspace packages needed by the operator/dev flows:
  - `@tiltcheck/shared`
  - `@tiltcheck/auth`
  - `@tiltcheck/db`
  - `@tiltcheck/error-factory`
- Prebuilds trust-engine dependency packages:
  - `@tiltcheck/event-router`
  - `@tiltcheck/database`
  - `@tiltcheck/config`
  - `@tiltcheck/trust-engines`
- Seeds runtime trust state (`data/casino-trust.json`) from v3 scrape artifacts when present.
- Verifies the feature-targeted commands:
  - `pnpm --filter @tiltcheck/api exec vitest run tests/routes/partner.test.ts`
  - `pnpm --filter web exec tsc --noEmit`
  - `pnpm trust:start`

## What this does not magically fix

- `pnpm --filter web build` can still fail on repo-level Next prerender issues in untouched routes if main is already cooked.
- `pnpm --filter @tiltcheck/api build` can still fail on unresolved workspace package/type problems outside the scoped feature surface.

That is not the environment setup being broken. That is the repo telling on itself.

## Notes

- The script is idempotent and safe to run every startup.
- Managed toolchain cache lives under `${XDG_CACHE_HOME:-$HOME/.cache}/tiltcheck-cloud-agent`.
- Dependency reinstall is keyed by lockfile hash plus the pinned Node/pnpm versions.
- PATH persistence is written to `~/.profile` and `~/.bashrc` using a guarded block.
