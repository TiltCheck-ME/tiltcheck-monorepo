# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
# TiltCheck Trust Rollup - High-Speed Aggregator Container
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate
WORKDIR /app

# [PHASE 1] Dependency Caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch
FROM base AS build
COPY . .
# Install only the trust-rollup dependency subgraph
RUN pnpm install --frozen-lockfile --filter @tiltcheck/trust-rollup...
RUN pnpm --filter @tiltcheck/trust-rollup... build
RUN test -f apps/trust-rollup/dist/index.js || (echo 'BUILD ERROR: apps/trust-rollup/dist/index.js not produced' && exit 1)
# [PHASE 3] Production Runtime
FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

COPY --from=build /app/apps/trust-rollup/dist ./apps/trust-rollup/dist
COPY --from=build /app/apps/trust-rollup/package.json ./apps/trust-rollup/package.json
# node_modules has pnpm symlinks into packages/ and modules/; copy both so they resolve
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/modules ./modules
COPY --from=build /app/package.json ./package.json

EXPOSE 8082
CMD ["node", "apps/trust-rollup/dist/index.js"]