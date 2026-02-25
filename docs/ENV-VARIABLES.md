# TiltCheck Environment Variables

This document catalogs the primary environment variables used across the TiltCheck monorepo. Many of these variables are required for local development or production deployment.

> **Note**: This reference is based on the root `.env` template. Refer to individual app `.env.example` files (e.g., in `apps/discord-bot` or `services/dashboard`) for specific module configurations.

## Core Deployment

Variables defining the basic application runtime and network parameters.

| Variable | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Sets the application environment (development vs. production). | `development` | `production` |
| `PORT` | The primary port used by the core service or router. | `8080` | `3000` |
| `PUBLIC_BASE_URL` | The public-facing URL of the application. | `http://localhost:3000` | `https://tiltcheck.me` |

## Discord Channels & Roles

Variables for routing bot messages and mapping roles.

| Variable | Description |
| :--- | :--- |
| `TRUST_ALERTS_CHANNEL_ID` | Channel ID for trust-related alerts and score drops. |
| `SUPPORT_CHANNEL_ID` | Channel ID where users can open support tickets. |
| `MOD_CHANNEL_ID` | Channel ID for moderation queues (e.g., FreeSpinScan approvals). |
| `MOD_ROLE_ID` | The ID of the Discord role permitted to perform mod actions. |

## Security & Auth

Keys and secrets for signing tokens and defining administrative access.

| Variable | Description |
| :--- | :--- |
| `JWT_SECRET` | Secret key used for signing internal JSON Web Tokens. Must be a secure random string (Min 32 chars). |
| `SESSION_SECRET` | Secret key used for session management. Must be a secure random string (Min 32 chars). |
| `ADMIN_PASSWORD` | Password used for manual administrative overrides. |
| `ALLOWED_ORIGINS` | Comma-separated list of CORS-allowed origins (e.g., `http://localhost:3000,https://tiltcheck.me`). |

## Blockchain (Solana)

Configuration for Solana interactions, primarily used by the JustTheTip module.

| Variable | Description |
| :--- | :--- |
| `SOLANA_RPC_URL` | The RPC endpoint for Solana network interactions. |
| `JUSTTHETIP_FEE_WALLET` | The public address where platform fees are routed. |
| `GAS_WALLET_PUBLIC` | The public address used for covering minimal gas fees if structured that way. |

## Feature Flags & Bot Settings

Toggles for ecosystem features and throttling limits.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `SUSLINK_AUTO_SCAN` | Whether the bot automatically scans links posted in chat. | `true` |
| `SUSLINK_AUTO_SCAN`                | Whether the bot automatically scans links posted in chat. | `true`  |
| `TRUST_THRESHOLD`                  | The minimum trust score required for certain actions.     | `60`    |
| `MOD_NOTIFICATIONS_ENABLED`        | Enables notifications to the mod channel.                 | `true`  |
| `MOD_RATE_LIMIT_WINDOW_MS`         | Rate limit window in milliseconds for moderation actions. | `60000` |
| `MOD_MAX_NOTIFICATIONS_PER_WINDOW` | Max notifications allowed within the window. | `10` |
| `MOD_DEDUPE_WINDOW_MS` | Time to wait before sending a duplicate alert. | `300000` |
| `SKIP_DISCORD_LOGIN` | Flag for local testing to bypass Discord OAuth. | `false` |
| `ENABLE_CASINO_VERIFICATION` | Enforces verification checks before listing a casino. | `true` |

## Internal Services & Api

URLs and keys for inter-service communication within the monorepo.

| Variable | Description | Example |
| :--- | :--- | :--- |
| `BACKEND_URL` | Internal URL for the core backend service. | `http://localhost:3000` |
| `NEXT_PUBLIC_BACKEND_URL` | Public exposed backend URL (for Next.js apps). | `http://localhost:3000` |
| `DASHBOARD_URL` | URL where the dashboard service is hosted. | `http://localhost:3000/dashboard` |
| `TILTCHECK_API_URL` | Base URL for the TiltCheck API endpoints. | `http://localhost:3000/api` |
| `CASINO_API_KEY` | Key for accessing the Casino Collector data. | `tiltcheck-casino-collector-2024` |
| `CASINO_API_PORT` | Port for the Casino Collector API. | `6002` |

## Data Storage & Logging

Paths for local file-based storage and logging directories.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `LOCKVAULT_STORE_PATH` | Path to JSON store for LockVault data. | `./data/lockvault-store.json` |
| `LOCKVAULT_STORE_PATH`    | Path to JSON store for LockVault data.       | `./data/lockvault-store.json`      |
| `PENDING_TIPS_STORE_PATH` | Path to JSON store for pending tips data.    | `./data/pending-tips-store.json`   |
| `COLLECTCLOCK_LOG_DIR`    | Directory for CollectClock logs.             | `./logs/collectclock`              |
| `LANDING_LOG_PATH` | File path for landing page interaction logs. | `./logs/landing.log` |

## External APIs

Keys for 3rd party AI or telemetry services.

| Variable | Description |
| :--- | :--- |
| `OPENAI_API_KEY` | API Key for OpenAI used for trust NLP, survey qualification, etc. |
| `ELASTIC_URL` | URL for Elastic Cloud Serverless observability. |
| `ELASTIC_API_KEY` | API Key for Elastic Cloud telemetry data shipping. |
| `SUPABASE_URL` | The URL for your Supabase project instance. |
| `SUPABASE_ANON_KEY` | Supabase Anonymous Role Key for client operations. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key for backend operations. |

## Discord Bot Configuration

Required variables for connecting Discord applications.

| Variable | Description | Use |
| :--- | :--- | :--- |
| `TILT_DISCORD_BOT_TOKEN` | Main TiltCheck bot token. | API Authentication |
| `TILT_DISCORD_CLIENT_ID` | Client ID of the TiltCheck bot application. | OAuth & Config |
| `TILT_DISCORD_GUILD_ID` | The primary guild (server) the bot operates in. | Internal mapping |
| `TIP_DISCORD_BOT_TOKEN` | Specialized token for the JustTheTip bot. | API Authentication |
| `TIP_DISCORD_CLIENT_ID` | Client ID for the JustTheTip bot application. | OAuth & Config |
| `TIP_DISCORD_GUILD_ID` | Primary guild for the JustTheTip operations. | Internal mapping |
