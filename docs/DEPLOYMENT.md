<!-- Copyright 2024-2026 TiltCheck | v1.1.0 | Last Edited: 2026-02-25 -->

# TiltCheck Deployment Guide

> **⚠️ DEPRECATION NOTICE:**
> The deployment strategy has been unified. All previous deployment approaches (Railway, Render, Cloudflare Workers, PM2 ecosystem files) are considered **DEPRECATED** and should no longer be used. They have been found to cause pipeline breakages and configuration spread. 
>
> All new deployment instructions now exist exclusively in the root directory: [`/DEPLOYMENT_PLAN.md`](../DEPLOYMENT_PLAN.md)

## Summary of the Current Plan
To minimize costs and simplify the architecture, our environment is deployed as follows:

1. **Frontend Layer:** `apps/dashboard`, `apps/web`
   - Hosted on: **Vercel** (Free Tier)
2. **Backend & Bot Layer:** APIs, Discord Bots, Trust Rollups
   - Hosted on: **Virtualmin VPS** (100% Free / Self-Hosted) using Docker Compose (`docker-compose up -d --build`).

### See `DEPLOYMENT_PLAN.md` in the root folder for step-by-step instructions.

---
**TiltCheck Ecosystem © 2024–2026**

