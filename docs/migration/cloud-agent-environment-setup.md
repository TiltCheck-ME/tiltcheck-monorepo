# Cloud Agent Environment Setup (Node/pnpm + Vitest)

Use this for Cursor cloud sessions so `pnpm vitest --run` works without a fresh dependency install each time.

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

## Notes

- The script is idempotent and safe to run every startup.
- Cache marker is stored at `${XDG_CACHE_HOME:-$HOME/.cache}/tiltcheck-cloud-agent/pnpm-lock.sha256`.
- If lockfile changes, dependencies are reinstalled automatically.
