# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06

# Railway Setup Guide

One-time steps required in Railway and GitHub before the `deploy-railway.yml` workflow can run.

---

## 1. Create a Railway Project

1. Log in at [railway.app](https://railway.app).
2. Create a new project named `tiltcheck`.
3. Add a service for each app in the monorepo:
   - `api`
   - `web`
   - `discord-bot`
   - `trust-rollup`
   - `control-room`
   - `game-arena`
   - `user-dashboard`

---

## 2. Generate a Railway API Token

1. Go to Railway account settings > API Tokens.
2. Create a token with deploy permissions.
3. Add it to the GitHub repository as the secret `RAILWAY_TOKEN`.

---

## 3. Add Environment Variables per Service

Set the following variables in Railway for each service that requires them:

| Variable | Description |
| :--- | :--- |
| `NODE_ENV` | Set to `production` |
| `JWT_SECRET` | JWT signing secret |
| `SESSION_SECRET` | Session signing secret |
| `DATABASE_URL` | Neon/PostgreSQL connection string |
| `DISCORD_TOKEN` | Discord bot token (discord-bot only) |

Use Railway's shared variables or set per-service via the Railway dashboard or CLI:

```bash
railway variables set NODE_ENV=production --service api --environment production
```

---

## 4. Service Ports

Each service listens on a fixed port. Set `PORT` in Railway to match:

| Service | Port |
| :--- | :--- |
| `api` | 3001 |
| `web` | 3000 |
| `discord-bot` | 8080 |
| `trust-rollup` | 8082 |
| `control-room` | 3001 |
| `game-arena` | 8080 |
| `user-dashboard` | 6001 |

---

## 5. WebSocket Services

`game-arena` uses Socket.io. Enable sticky sessions in Railway:

- In the Railway service settings, enable **Session Affinity** (if available under networking).
- Alternatively, configure the `SOCKET_IO_STICKY` environment variable if the service supports it.

---

## 6. Deploy via GitHub Actions

The `deploy-railway.yml` workflow handles CI/CD automatically on every push to `main` that touches `apps/`, `packages/`, or `modules/`. It:

1. Builds and pushes each service image to GitHub Container Registry (GHCR).
2. Runs `railway up` to deploy the new image to the production environment.

To trigger a manual deploy:

```bash
gh workflow run deploy-railway.yml
```

---

## 7. Health Checks

Each service exposes a `/health` endpoint (except `web`, which uses `/`). Railway will restart a service automatically if the health check fails after `restartPolicyMaxRetries` attempts.

---

## 8. Rollback

To roll back a service to a previous deployment:

```bash
railway rollback --service <service-name> --environment production
```

Or use the Railway dashboard: select the service, open the **Deployments** tab, and redeploy any previous build.

---

**TiltCheck Ecosystem © 2024–2026**
