# Identity Service (TiltCheck Ecosystem)

Unified profile + trust score layer shared by all bots & web surfaces.

## Features
- One-time Discord verification via Magic (issuer DID stored)
- Wallet linking (non-custodial)
- Email preference storage
- Trust score aggregation from gameplay, link risk, tilt, tipping behavior
- Legal acceptance tracking (terms + privacy versions)
- Simple JSON file persistence (upgrade later to durable DB)

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /identity/:discordId | Fetch profile |
| POST | /identity/:discordId/wallet | Add wallet (type, address) |
| POST | /identity/:discordId/email | Set email |
| POST | /identity/:discordId/trust-signal | Push trust signal |
| POST | /identity/:discordId/accept-legal | Record legal acceptance |
| POST | /identity/:discordId/magic-link | Attach Magic issuer DID |
| GET | /legal/terms | Raw Terms text |
| GET | /legal/privacy | Raw Privacy text |
| GET | /health | Health probe |

## Trust Score (v1)
Base 50. Each signal modifies score: `score += value * weight * 50`.
Clamp 0..100.
Bands: 0–39 RED, 40–69 YELLOW, 70–84 GREEN, 85–100 PLATINUM.

## Environment Variables
- `IDENTITY_PORT` (default 8090)
- `IDENTITY_DATA_FILE` (path to identity.json)
- `IDENTITY_TERMS_VERSION` (default v1)
- `IDENTITY_PRIVACY_VERSION` (default v1)
- `IDENTITY_REQUIRE_LEGAL` (default true) – set to `false` to skip legal acceptance
- `DISCORD_USER_OAUTH_URL` – user login (identify/email scopes)
- `DISCORD_BOT_INVITE_URL` – bot install (bot applications.commands scopes)

## Legal Flow
Front-end loads `/legal/terms` + `/legal/privacy`, records acceptance via `/identity/:discordId/accept-legal` (versions taken from env), then redirects to `DISCORD_USER_OAUTH_URL` for Discord social login.

## Dev
```bash
pnpm --filter @tiltcheck/identity-service dev
```

## Future Upgrades
- Replace JSON with SQLite or Postgres
- Rate-limit per Discord ID
- Signature verification for trust-signal origin
- Webhook/event emission after trustScore changes
