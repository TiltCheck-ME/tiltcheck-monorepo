# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
# TiltCheck Control Room - Production Container
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate
WORKDIR /app

# [PHASE 1] Dependency Caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.json ./
RUN pnpm fetch

# [PHASE 2] Install
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @tiltcheck/control-room...

# [PHASE 3] Production Runtime
FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/control-room/src ./apps/control-room/src
COPY --from=build /app/apps/control-room/public ./apps/control-room/public
COPY --from=build /app/apps/control-room/package.json ./apps/control-room/package.json
COPY --from=build /app/package.json ./package.json

EXPOSE 3001
CMD ["node", "apps/control-room/src/server-trust-auth.js"]
