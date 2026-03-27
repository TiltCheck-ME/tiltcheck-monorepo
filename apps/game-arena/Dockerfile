# TiltCheck Game Arena - High-Speed Multiplayer Container
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# [PHASE 1] Dependency Caching
# Only copy lockfile and workspace config to cache deps separately from source
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.json ./
# Build the virtual store
RUN pnpm fetch

# [PHASE 2] Building
FROM base AS build
COPY . .
# Install only the game-arena dependency subgraph
RUN pnpm install --offline --filter @tiltcheck/game-arena...
RUN pnpm --filter @tiltcheck/game-arena... build
# Prune for production
RUN pnpm prune --prod --no-optional

# [PHASE 3] Production Runtime
FROM node:20-slim
WORKDIR /app
# Game Arena needs dumb-init for healthy WebSocket disconnect handling
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Copy only the compiled artifacts and minimal node_modules
COPY --from=build /app/apps/game-arena/dist ./apps/game-arena/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/game-arena/package.json ./apps/game-arena/package.json
COPY --from=build /app/package.json ./package.json

EXPOSE 8080
# Use the correct server entry point from package.json
CMD ["node", "apps/game-arena/dist/server.js"]
