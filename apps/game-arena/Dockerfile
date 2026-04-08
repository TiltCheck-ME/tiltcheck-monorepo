# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
# TiltCheck Game Arena - High-Speed Multiplayer Container
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
# Install only the game-arena dependency subgraph
RUN pnpm install --frozen-lockfile --filter @tiltcheck/game-arena...
RUN pnpm --filter @tiltcheck/game-arena... build
RUN test -f apps/game-arena/dist/server.js || (echo 'BUILD ERROR: apps/game-arena/dist/server.js not produced' && exit 1)
# [PHASE 3] Production Runtime
FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

COPY --from=build /app/apps/game-arena/dist ./apps/game-arena/dist
COPY --from=build /app/apps/game-arena/package.json ./apps/game-arena/package.json
# node_modules has pnpm symlinks into packages/ and modules/; copy both so they resolve
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/modules ./modules
COPY --from=build /app/apps/game-arena/public ./apps/game-arena/public
COPY --from=build /app/package.json ./package.json

EXPOSE 8080
CMD ["node", "apps/game-arena/dist/server.js"]