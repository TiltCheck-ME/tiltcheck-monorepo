<!-- Copyright 2024-2026 TiltCheck | v1.1.0 | Last Edited: 2026-03-26 -->

# TiltCheck Deployment Guide

> **⚠️ DEPRECATION NOTICE:**
> The deployment strategy has been unified. All previous deployment approaches (Railway, Render, Vercel, self-hosting, PM2 ecosystem files) are considered **DEPRECATED** and should no longer be used. They have been found to cause pipeline breakages and configuration spread.
>
> All new deployment instructions now exist exclusively in the root directory: [`/DEPLOYMENT_PLAN.md`](../DEPLOYMENT_PLAN.md)

## Summary of the Current Plan
To simplify the architecture and leverage a single cloud provider, the entire TiltCheck ecosystem is deployed on **Google Cloud Platform (GCP)**.

-   **All Services:** Frontend, Backend, APIs, and Bots are containerized and orchestrated on GCP (e.g., using Cloud Run, GKE, or other services).

## Exceptions to the Unified Strategy

### Compliance-Edge Worker
While the primary infrastructure is hosted on GCP, certain logic must run at the "edge" for performance and relevance. The `compliance-edge` service is a Cloudflare Worker that provides informational geo-compliance nudges to users.

-   **Purpose:** To inform users of local gambling regulations based on their region, without blocking access.
-   **Justification:** A Cloudflare Worker is the ideal tool for this task as it executes directly on Cloudflare's global network, close to the user, allowing for low-latency location detection and response. This is an intentional and approved exception to the GCP-only deployment strategy.

### See `DEPLOYMENT_PLAN.md` in the root folder for step-by-step instructions on the main deployment.

---
**TiltCheck Ecosystem © 2024–2026**
