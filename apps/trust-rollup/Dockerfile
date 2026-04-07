# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
# TiltCheck Trust Rollup - High-Speed Aggregator Container
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable
WORKDIR /app

# [PHASE 1] Dependency Caching
# Only copy lockfile and workspace config to cache deps separately from source
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# Build the virtual store
RUN pnpm fetch

# [PHASE 2] Building
FROM base AS build
COPY . .
# Install only the trust-rollup dependency subgraph
RUN pnpm install --frozen-lockfile --filter @tiltcheck/trust-rollup...
RUN pnpm --filter @tiltcheck/trust-rollup... build
RUN test -f apps/trust-rollup/dist/index.js || (echo 'BUILD ERROR: apps/trust-rollup/dist/index.js not produced' && exit 1)
# Create self-contained deploy with real copies of workspace packages (no symlinks)
RUN pnpm --filter @tiltcheck/trust-rollup deploy /prod

# [PHASE 3] Production Runtime
FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

COPY --from=build /prod .

EXPOSE 8082
CMD ["node", "dist/index.js"]
