# Cloud Agent Environment Setup (Node/pnpm + Trust Engine Readiness)

Use this for Cursor cloud sessions so `pnpm trust:start` and `pnpm vitest --run` work without manual dependency/bootstrap steps.

## Startup command

Configure the cloud agent startup command to:

```bash
bash scripts/cloud-agent-env-setup.sh
```

## What this does

- Ensures Node is present.
- Ensures `pnpm` is available (via `corepack` when needed).
- Installs workspace dependencies only when `pnpm-lock.yaml` changes.
- Verifies `vitest` and `jsdom` can be imported/executed.
- Verifies `typescript` tooling is available.
- Prebuilds trust-engine dependency packages:
  - `@tiltcheck/event-router`
  - `@tiltcheck/database`
  - `@tiltcheck/config`
  - `@tiltcheck/trust-engines`
- Seeds runtime trust state (`data/casino-trust.json`) from v3 scrape artifacts when present.
- Verifies `pnpm trust:start` executes successfully.

## Notes

- The script is idempotent and safe to run every startup.
- Cache marker is stored at `${XDG_CACHE_HOME:-$HOME/.cache}/tiltcheck-cloud-agent/pnpm-lock.sha256`.
- If lockfile changes, dependencies are reinstalled automatically.
