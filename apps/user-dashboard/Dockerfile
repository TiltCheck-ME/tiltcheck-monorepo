# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
# TiltCheck User Dashboard - High-Speed Express Implementation
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable
WORKDIR /app

# Only copy lockfile and workspace config to cache deps separately from source
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.json ./
# Use pnpm fetch to create a virtual store from the lockfile
RUN pnpm fetch

# [PHASE 2] Building
FROM base AS build
COPY . .
# Offline install using the virtual store created in Phase 1
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @tiltcheck/user-dashboard... --filter @tiltcheck/auth
RUN pnpm --filter @tiltcheck/auth build
RUN pnpm --filter @tiltcheck/user-dashboard... build
# Prune to strictly production dependencies
RUN pnpm prune --prod --no-optional

# [PHASE 3] Production Runtime
FROM node:20-slim
WORKDIR /app
# Copy only the compiled artifacts and minimal node_modules
COPY --from=build /app/apps/user-dashboard/dist ./apps/user-dashboard/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/user-dashboard/package.json ./apps/user-dashboard/package.json
COPY --from=build /app/package.json ./package.json

EXPOSE 6001
# Skip CLI overhead, run the compiled entry point directly
CMD ["node", "apps/user-dashboard/dist/index.js"]
