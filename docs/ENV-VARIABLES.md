# Environment Variables Guide

This document describes the environment variables used across the TiltCheck monorepo.

To get started, copy the `.env.example` file to `.env` in the root of the project and fill in the required values.

## Core Deployment

| Variable | Description | Default / Example |
|---|---|---|
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` |
| `PORT` | The port the central API server runs on | `8080` |
| `PUBLIC_BASE_URL` | The public URL of the application | `http://localhost:3000` |

## App & Dashboard Configuration

| Variable | Description | Default / Example |
|---|---|---|
| `BACKEND_URL` | Application/Backend endpoint used internally | `http://localhost:3000` |
| `NEXT_PUBLIC_BACKEND_URL` | Application/Backend endpoint exposed to frontend apps | `http://localhost:3000` |
| `DASHBOARD_URL` | Main dashboard URL | `http://localhost:3000/dashboard` |
| `TILTCHECK_API_URL` | Main TiltCheck API URL | `http://localhost:3000/api` |

## Security & Auth

| Variable | Description | Default / Example |
|---|---|---|
| `JWT_SECRET` | Secret key used for signing JWTs | *(Required in prod)* |
| `SESSION_SECRET` | Secret key used for session encryption | *(Required in prod)* |
| `ADMIN_PASSWORD` | Optional admin password for initial setups | |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | `http://localhost:3000,https://tiltcheck.me` |

## Blockchain (Solana)

| Variable | Description | Default / Example |
|---|---|---|
| `SOLANA_RPC_URL` | The Solana RPC URL to connect to | `https://api.mainnet-beta.solana.com` |
| `JUSTTHETIP_FEE_WALLET` | Public key of the wallet collecting Tip bot fees | |
| `GAS_WALLET_PUBLIC` | Public key of gas sponsoring wallet | |

## Discord Bots

| Variable | Description | Default / Example |
|---|---|---|
| `TILT_DISCORD_BOT_TOKEN` | TiltGuard Bot Discord token | *(Required)* |
| `TILT_DISCORD_CLIENT_ID` | TiltGuard Bot Client ID | *(Required)* |
| `TILT_DISCORD_GUILD_ID` | TiltGuard Dev/Test Guild ID | |
| `TIP_DISCORD_BOT_TOKEN` | JustTheTip Bot Discord token | *(Required)* |
| `TIP_DISCORD_CLIENT_ID` | JustTheTip Bot Client ID | *(Required)* |
| `TRUST_ALERTS_CHANNEL_ID` | Channel ID for trust-related alerts | |
| `SUPPORT_CHANNEL_ID` | Channel ID for support tickets | |

## Supabase

| Variable | Description | Default / Example |
|---|---|---|
| `SUPABASE_URL` | URL of your Supabase instance | `https://*.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Anon Key | *(Required)* |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | *(Required)* |

## External APIs

| Variable | Description | Default / Example |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key for AI-driven chat/insights | `sk-...` |

## Elasticsearch / Observability

| Variable | Description | Default / Example |
|---|---|---|
| `ELASTIC_URL` | Elasticsearch endpoint URL | `https://...` |
| `ELASTIC_API_KEY` | Elasticsearch API Key for ingestion | *(Required)* |

## Feature Flags & Modules

| Variable | Description | Default / Example |
|---|---|---|
| `SUSLINK_AUTO_SCAN` | Whether to automatically scan links in Discord (`true`/`false`) | `true` |
| `TRUST_THRESHOLD` | Trust threshold for automatic flagging | `60` |
| `MOD_NOTIFICATIONS_ENABLED` | Enable mod alerts (`true`/`false`) | `true` |

> *Note: Many other specific feature flags or internal service configs (e.g., CASINO_API_KEY, LOG_LEVEL, DISCORD_BOT_HEALTH_PORT) can be found in the root `.env` file.*
