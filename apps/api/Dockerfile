# TiltCheck API - High-Speed Multi-Stage Container
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate && apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# [PHASE 1] Dependency Caching
# Only copy lockfile and workspace config to cache deps separately from source
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.json ./
# Use pnpm fetch to create a virtual store from the lockfile
RUN pnpm fetch

# [PHASE 2] Building
FROM base AS build
COPY . .
# Perform full workspace install for monorepo dependency resolution
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @tiltcheck/api... build
# Prune to strictly production dependencies
RUN pnpm prune --prod --no-optional

# [PHASE 3] Production Runtime
FROM node:20-slim
WORKDIR /app
# Copy only the compiled artifacts and minimal node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/package.json ./package.json

EXPOSE 3001
# Skip CLI overhead, run the compiled entry point directly
CMD ["node", "apps/api/dist/index.js"]
