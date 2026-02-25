# Monorepo Deployment Diagnosis & Plan

## Diagnosis of Previous Setup
The monorepo previously contained conflicting and redundant deployment mappings, including:
1. **GitHub Actions (`deploy-*`)**: Fragmented files attempting to deploy separate apps to Railway, using undefined Dockerfiles.
2. **PM2 `ecosystem.config.cjs`**: A monolithic VPS mapping utilizing PM2.
3. **Cloudflare `wrangler.toml`**: Trying to run parts of the codebase on Cloudflare edge.
4. **GitLab CI `.gitlab-ci.yml`**: Fragmented pipeline fixes left over from a previous host.
5. **Docker Compose**: A containerized stack for bots and APIs.

This spread lead to high costs, pipeline failures, and general confusion over whether the project should be on Vercel, Railway, Cloudflare, PM2, or Docker. 

## The Best & Most Cost-Effective Deployment Plan
To keep costs as close to **$0** as possible while maintaining a professional, easy-to-update deployment process with the **fewest deployments necessary**, we consolidate everything into exactly **two layers**:

### 1. Frontend Layer: Vercel (100% Free Tier)
**Target:** `apps/dashboard`, `apps/web` (Next.js/React static apps)
- **Why?** Vercel offers an incredibly generous free tier for Next.js applications and handles monorepos perfectly without any custom configuration.
- **How to Deploy:**
  1. Go to your Vercel dashboard.
  2. Import your GitHub repository (`tiltcheck-monorepo`).
  3. When asked for the "Root Directory", select `apps/dashboard`.
  4. Vercel will automatically detect Next.js. Deploy.
  5. Repeat the exact same process if you need `apps/web` live, just point the Root Directory to `apps/web`.

### 2. Backend & Bot Layer: Your Virtualmin VPS (IP: 85.209.95.175)
**Target:** `apps/discord-bot`, `apps/dad-bot`, `apps/api`, `apps/trust-rollup`, `apps/casino-api`, `apps/control-room`
- **Why?** You already have a Linux VPS running Virtualmin/Webmin! Deploying 5-6 different Node applications individually on PaaS providers like Railway, Render, or Fly.io can quickly add up to $30-$50+/month (since they bill per long-running service). By using your existing server, you can host all your backend services and bots for free, indefinitely, using either Docker Compose or PM2.
- **How to Deploy using Docker Compose (Recommended):**
  1. SSH into your VPS (e.g., `ssh jme@85.209.95.175`).
  2. Make sure Docker and Docker Compose are installed on the server.
  3. Clone this repository into a directory (e.g., `/home/jme/tiltcheck-monorepo`).
  4. Navigate into the repository folder: `cd /home/jme/tiltcheck-monorepo`
  5. Run `docker-compose up -d --build`. This automatically spins up **all** your Discord bots, background workers, and REST APIs as background containers.
  6. **Routing through Virtualmin:** You can configure Virtualmin to act as a Reverse Proxy. For instance, you can tell Virtualmin to forward traffic going to `tiltcheck.me/api` directly to your local Docker container running the API on port 3001.

*Note: You can also optionally use PM2 (as suggested by the old `ecosystem.config.cjs`) if you prefer running native Node processes instead of Docker. Both work perfectly on your server.*
## Actions Taken
- **Cleaned Repo**: I have completely removed the legacy `.gitlab-ci.yml`, `ecosystem.config.cjs`, `wrangler.toml`, and the broken `.github/workflows/deploy-*.yml` actions files.
- **Single Truth**: Your repository is now primed for a simple, two-pronged deployment strategy without competing deploy systems.

### Next Steps for CI/CD
In the future, if you want an automated deployment pipeline for the backend, you can create a single `.github/workflows/deploy-vps.yml` that essentially SSHs into your VPS, runs `git pull`, and `docker-compose up -d --build`. This minimizes moving parts and keeps deployment costs minimal.
