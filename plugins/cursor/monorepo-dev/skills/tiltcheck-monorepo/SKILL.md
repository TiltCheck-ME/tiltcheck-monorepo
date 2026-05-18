---
name: tiltcheck-monorepo
description: TiltCheck monorepo layout, pnpm commands, ports, and local dev gotchas. Use when starting services, building packages, or navigating apps/ and packages/.
---

# TiltCheck Monorepo

pnpm v10 workspace + Turborepo. Node 20. ESM (`"type": "module"`).

## Services (dev)

| Service | Command | Port |
| :--- | :--- | :--- |
| web | `pnpm -C apps/web dev` | 3001 |
| api | `pnpm --filter @tiltcheck/api dev` | 8080 |
| discord-bot | `pnpm --filter @tiltcheck/discord-bot dev` | 8080 health |
| user-dashboard | `pnpm --filter @tiltcheck/user-dashboard dev` | 6001 |
| control-room | `pnpm --filter @tiltcheck/control-room dev` | 3003 |
| trust-rollup | `pnpm --filter @tiltcheck/trust-rollup dev` | 3005 |

## Env

- Copy `.env.example` to `.env` at repo root.
- Local without credentials: `SKIP_ENV_VALIDATION=true`, `SKIP_DISCORD_LOGIN=true`.
- `VAULT_ENCRYPTION_KEY`: 64 hex chars (32 bytes); dummy dev key OK.
- API uses root `.env` via `tsx watch --env-file=../../.env`.

## Build / test

- After changing `packages/` or `modules/`: `pnpm --filter <pkg>... build`
- Lint: `pnpm lint`
- Tests: `pnpm test` (builds `@tiltcheck/database` first)
- Trust smoke: `pnpm trust:start`
- `apps/web` production build may fail prerender on main; use `pnpm -C apps/web dev` for UI work.

## Gotchas

- PostgreSQL `ECONNREFUSED` on API startup is non-fatal without DB; HTTP still serves.
- Invalid Sentry DSN in dev is harmless.
- Do not expose private runtime internals in OSS boundaries.
