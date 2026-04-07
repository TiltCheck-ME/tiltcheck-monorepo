# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
# TiltCheck Web (Landing Page) - Production Implementation
# Optimized for Google Cloud Run (Single-Service Subgraph Build)

FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# [PHASE 1] Base Dependencies
# Cache lockfile separately to prevent full installs on simple code changes
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
RUN pnpm fetch

# [PHASE 2] Building (Next.js Standalone Mode)
FROM base AS build
COPY . .
# Perform full workspace install for monorepo dependency resolution
ENV CI=true
RUN pnpm install --frozen-lockfile
# Build shared package before Next.js requires its dist
RUN pnpm --filter @tiltcheck/shared build
# Next.js Build requires NODE_ENV=production to optimize bundles
ENV NODE_ENV=production
RUN pnpm --filter web build

# [PHASE 3] Production Surface
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Hardcode port for Cloud Run standard or use PORT env
ENV PORT=3000

# Copy internal packages first to resolve standalone dependencies
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

# Next.js standalone entry point - Corrected for monorepo standalone output
CMD ["node", "server.js"]
