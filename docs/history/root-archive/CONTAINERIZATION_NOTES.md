## TiltCheck Containerization Summary

**Files Created/Updated:**

- **Dockerfile** (root): Multi-stage production container for API. Copies pre-built dist/, installs production dependencies only, uses `dumb-init` for signal handling.
- **apps/*/Dockerfile** (6 files): Individual production containers for each service (api, web, discord-bot, control-room, game-arena, trust-rollup). Web uses Nginx for static files.
- **docker-compose.yml**: Orchestrates all 7 services with dependency management, health checks, resource limits (128-1GB per service), volumes for /tmp, and develop watch mode for hot reload.
- **docker-compose.prod.yml**: Production overrides with aggressive restart policies and additional health check retries.
- **.dockerignore**: Optimized to exclude 35+ patterns (node_modules, dist/, .git, .env, tests, docs, etc.) for faster builds.

**Key Improvements:**

- **Security**: Non-root `node` user, dumb-init for PID1, no unnecessary packages.
- **Performance**: Multi-stage builds, layer caching via dependency separation, minimal final image size (~300-500MB per app).
- **Development**: `develop.watch` monitors src/, packages/, modules/ for auto-rebuild.
- **Production**: Resource limits prevent runaway containers; health checks detect issues early.
- **Networking**: Shared `tiltcheck-network` bridge with service-to-service discovery.
- **Environment**: All 50+ env vars loaded from .env file; NODE_ENV=production enforced in containers.

**Usage:**

```bash
# Development (hot reload enabled)
docker compose up

# Production 
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Build single service
docker compose build api

# View logs
docker compose logs -f api

# Stop all
docker compose down
```

**Notes:**
- Requires prebuilt `apps/*/dist/` directories. Build locally first: `pnpm run build:legacy` or `pnpm build`.
- Web app builds to static dist/ and serves via Nginx (no Node.js runtime needed).
- Production images are ~90% smaller than dev images due to prod-only dependencies.
