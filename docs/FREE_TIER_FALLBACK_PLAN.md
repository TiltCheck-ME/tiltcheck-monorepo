# Free-Tier Fallback Deployment Plan

**Objective:** Provide a zero-cost, production-viable hosting plan for the MVP in case of GCP billing issues or other primary provider failures.

This plan leverages the "VPS-Free" strategy outlined in `DEPLOYMENT_PLAN.md`.

---

## Architecture Overview

The strategy is to split services between providers that offer generous, long-term free tiers.

| Service Component | Provider | Plan Tier | Cost | Notes |
|-------------------|----------|-----------|------|-------|
| **Web Layer** (`apps/web`) | Vercel | Hobby | Free | Global CDN, CI/CD included. Perfect for static/PWA frontends. |
| **Runtime Layer** (`apps/api`, `apps/discord-bot`) | Railway | Starter | Free* | Dockerfile deployment. Free tier has usage limits. |
| **Database** | Supabase | Free | Free | Postgres DB, Auth, and Storage. |

_*Railway's free tier includes a monthly grant of compute hours. Sufficient for MVP load, but monitor usage._

---

## Activation Steps

If the primary GCP deployment fails or is unavailable, follow these steps to activate the fallback plan.

### 1. Web Layer (Vercel)

- **Action:** Create a new project in Vercel linked to the `tiltcheck-monorepo` repository.
- **Configuration:**
  - **Root Directory:** `apps/web`
  - **Build Command:** `pnpm --filter @tiltcheck/landing-page build`
  - **Output Directory:** `dist`
- **Domain:**
  - Assign `tiltcheck.me` and `www.tiltcheck.me` to the Vercel project.
  - Update your DNS provider to point the `A` record for `tiltcheck.me` to Vercel's IP and the `CNAME` for `www` to Vercel's endpoint.

### 2. Runtime Layer (Railway)

- **Action:** Create a new project in Railway. For each service (`api`, `discord-bot`), create a new service pointing to the `Dockerfile` in its respective directory.
- **Configuration:**
  - **`apps/api`:**
    - **Dockerfile Path:** `apps/api/Dockerfile`
    - **Environment Variables:** Set `DATABASE_URL` from Supabase, `JWT_SECRET`, etc.
    - **Public URL:** Railway will generate a public URL (e.g., `api-production.up.railway.app`).
  - **`apps/discord-bot`:**
    - **Dockerfile Path:** `apps/discord-bot/Dockerfile`
    - **Environment Variables:** Set `DISCORD_TOKEN`, `DATABASE_URL`, etc.
    - **Networking:** This service does not need a public URL.

### 3. Update Environment Variables

- In the Vercel project for `apps/web`, update the environment variables (e.g., `VITE_HUB_URL`) to point to the new Railway public URL for the `api` service.
- Redeploy the Vercel project to apply the new API endpoint.

---

## Contingency

If Railway's free tier is exhausted, **Render** offers a similar free tier for Docker-based services and can be used as a secondary fallback for the runtime layer. The setup process is nearly identical.